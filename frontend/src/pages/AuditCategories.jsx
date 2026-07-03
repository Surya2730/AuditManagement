import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiTrash2, FiEye, FiCheck } from 'react-icons/fi';
import '../styles/components.css';

const AuditCategories = () => {
  const { api } = useAuth();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // New Category Form fields
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [checklist, setChecklist] = useState([
    { questionId: 'q1', text: '', type: 'Yes/No', options: '', mandatory: true, weightage: 1 }
  ]);

  const [errorMsg, setErrorMsg] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
      if (res.data.length > 0) {
        setSelectedCategory(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddQuestion = () => {
    const nextId = `q${checklist.length + 1}`;
    setChecklist([
      ...checklist,
      { questionId: nextId, text: '', type: 'Yes/No', options: '', mandatory: true, weightage: 1 }
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    if (checklist.length === 1) return;
    setChecklist(checklist.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx, field, value) => {
    const nextChecklist = [...checklist];
    nextChecklist[idx][field] = value;
    setChecklist(nextChecklist);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!catName.trim()) {
      setErrorMsg('Please specify a category name.');
      return;
    }

    // Validate questions
    const invalidQuestion = checklist.find(q => !q.text.trim());
    if (invalidQuestion) {
      setErrorMsg('Please write the text parameter for all questions.');
      return;
    }

    // Format checklist options (convert comma-separated string to array)
    const formattedChecklist = checklist.map(q => ({
      ...q,
      options: q.type === 'Dropdown' && q.options 
        ? q.options.split(',').map(opt => opt.trim()) 
        : []
    }));

    try {
      const res = await api.post('/categories', {
        name: catName,
        description: catDesc,
        checklist: formattedChecklist
      });

      setCategories([...categories, res.data]);
      setSelectedCategory(res.data);
      setModalOpen(false);
      resetForm();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error occurred while saving category.');
    }
  };

  const resetForm = () => {
    setCatName('');
    setCatDesc('');
    setChecklist([{ questionId: 'q1', text: '', type: 'Yes/No', options: '', mandatory: true, weightage: 1 }]);
    setErrorMsg('');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#002B49' }}>Checklist Category Console</h2>
          <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>Design and configure infrastructure dynamic checklists</span>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <FiPlus /> Add Audit Category
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Checklist templates...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
          {/* CATEGORIES LIST */}
          <div className="card" style={{ padding: '1rem', margin: 0, maxHeight: '70vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Categories</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {categories.map((cat) => (
                <li key={cat._id}>
                  <button
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      border: 'none',
                      background: selectedCategory?._id === cat._id ? '#EAF3FF' : 'none',
                      color: selectedCategory?._id === cat._id ? '#0B5ED7' : '#333',
                      fontWeight: selectedCategory?._id === cat._id ? '600' : 'normal',
                      cursor: 'pointer',
                      borderRadius: '3px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{cat.name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>{cat.checklist.length} items</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* CHECKLIST TEMPLATE VIEWER */}
          <div className="card" style={{ margin: 0 }}>
            {selectedCategory ? (
              <div>
                <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, color: '#002B49' }}>{selectedCategory.name} Template</h3>
                  <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '4px' }}>{selectedCategory.description || 'No description provided.'}</p>
                </div>

                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>ID</th>
                        <th>Parameter Question / Checkpoint</th>
                        <th style={{ width: '120px' }}>Input Type</th>
                        <th style={{ width: '90px' }}>Weightage</th>
                        <th style={{ width: '100px' }}>Mandatory</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCategory.checklist.map((q) => (
                        <tr key={q.questionId}>
                          <td><strong>{q.questionId.toUpperCase()}</strong></td>
                          <td>
                            {q.text}
                            {q.type === 'Dropdown' && q.options && (
                              <div style={{ fontSize: '0.75rem', color: '#0B5ED7', marginTop: '4px' }}>
                                Options: {q.options.join(', ')}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{q.type}</span>
                          </td>
                          <td>{q.weightage}</td>
                          <td>
                            {q.mandatory ? (
                              <span style={{ color: '#198754', fontWeight: 'bold' }}><FiCheck /> Yes</span>
                            ) : (
                              <span style={{ color: '#dc3545' }}>No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6c757d', padding: '2rem' }}>
                Select a category to view its checklist layout parameters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Add New Audit Category</h3>
              <button className="close-btn" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className="modal-body" style={{ maxHeight: '60vh' }}>
                {errorMsg && (
                  <div style={{ backgroundColor: '#f8d7da', color: '#842029', padding: '10px', borderRadius: '3px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {errorMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Category Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Server Room, Chemistry Laboratory"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Mandate Summary</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Describe purpose of auditing this infrastructure category..."
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                  />
                </div>

                <div style={{ borderTop: '1px solid #eee', marginTop: '1.5rem', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Checklist Parameter Questions</h4>
                    <button type="button" className="btn btn-secondary" onClick={handleAddQuestion} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                      <FiPlus /> Add Parameter
                    </button>
                  </div>

                  {checklist.map((q, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.6fr 0.8fr 40px', gap: '10px', marginBottom: '10px', alignItems: 'center', borderBottom: '1px dashed #f1f1f1', paddingBottom: '10px' }}>
                      <div>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Checklist parameter question text"
                          value={q.text}
                          onChange={(e) => handleQuestionChange(idx, 'text', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <select
                          className="form-control"
                          value={q.type}
                          onChange={(e) => handleQuestionChange(idx, 'type', e.target.value)}
                        >
                          <option value="Yes/No">Yes/No</option>
                          <option value="Rating">Rating (1-5)</option>
                          <option value="Dropdown">Dropdown Selector</option>
                          <option value="Image">Image Attachment</option>
                          <option value="Text">Free Text Comment</option>
                        </select>
                        {q.type === 'Dropdown' && (
                          <input
                            type="text"
                            className="form-control mt-1"
                            style={{ fontSize: '0.75rem', padding: '2px 5px' }}
                            placeholder="Options (comma separated)"
                            value={q.options}
                            onChange={(e) => handleQuestionChange(idx, 'options', e.target.value)}
                            required
                          />
                        )}
                      </div>
                      <div>
                        <input
                          type="number"
                          className="form-control"
                          min="1"
                          max="5"
                          placeholder="Weight"
                          value={q.weightage}
                          onChange={(e) => handleQuestionChange(idx, 'weightage', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <label className="form-checkbox" style={{ fontSize: '0.8rem' }}>
                          <input
                            type="checkbox"
                            checked={q.mandatory}
                            onChange={(e) => handleQuestionChange(idx, 'mandatory', e.target.checked)}
                          />
                          <span>Mandatory</span>
                        </label>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          style={{ border: 'none', background: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '1.1rem' }}
                          disabled={checklist.length === 1}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Category Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditCategories;
