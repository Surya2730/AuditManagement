import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiTrash2, FiClock } from 'react-icons/fi';
import '../styles/components.css';

const AuditAssignments = () => {
  const { api, user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  // Form Fields
  const [selLocation, setSelLocation] = useState('');
  const [selAuditor, setSelAuditor] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [remarks, setRemarks] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = async () => {
    try {
      const [assignRes, locRes, userRes] = await Promise.all([
        api.get(`/assignments?status=${filterStatus}&location=${filterLocation}`),
        api.get('/locations'),
        api.get('/auth/users')
      ]);

      setAssignments(assignRes.data);
      setLocations(locRes.data);
      setAuditors(userRes.data.filter((u) => u.role === 'Auditor'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterLocation]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selLocation || !selAuditor || !dueDate) {
      setErrorMsg('Please populate all mandatory fields.');
      return;
    }

    try {
      await api.post('/assignments', {
        location: selLocation,
        auditor: selAuditor,
        scheduledDate: schedDate || undefined,
        dueDate: dueDate,
        remarks: remarks
      });

      // Reload assignments list
      fetchData();
      setModalOpen(false);
      resetForm();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error occurred while scheduling assignment.');
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Cancel this assigned inspection?')) return;
    try {
      await api.delete(`/assignments/${id}`);
      setAssignments(assignments.filter((a) => a._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setSelLocation('');
    setSelAuditor('');
    setSchedDate('');
    setDueDate('');
    setRemarks('');
    setErrorMsg('');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return 'badge-success';
      case 'Pending': return 'badge-warning';
      case 'In Progress': return 'badge-info';
      case 'Submitted': return 'badge-primary';
      case 'Rejected':
      case 'Needs Reinspection': return 'badge-danger';
      default: return 'badge-outline';
    }
  };

  const isAdmin = user.role === 'Admin';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#002B49' }}>Audit Allocations Console</h2>
          <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>Schedule inspections and allocate auditors to college facilities</span>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <FiPlus /> Assign New Audit
          </button>
        )}
      </div>

      {/* FILTER PANEL */}
      <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter Status:</span>
          <select className="form-control" style={{ width: '150px', padding: '4px 8px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Needs Reinspection">Needs Reinspection</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Audit Place:</span>
          <select className="form-control" style={{ width: '220px', padding: '4px 8px' }} value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
            <option value="">All Locations</option>
            {locations.map((l) => (
              <option key={l._id} value={l._id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading scheduled assignments...</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Audit Place / Facility</th>
                  <th>Location Code</th>
                  <th>Assigned Auditor</th>
                  <th>Scheduled Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  {isAdmin && <th style={{ width: '80px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {assignments.map((as) => (
                  <tr key={as._id}>
                    <td>
                      <strong>{as.location?.name || 'Location Deleted'}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>{as.location?.building} | {as.location?.floor}</div>
                    </td>
                    <td><code style={{ fontSize: '0.85rem' }}>{as.location?.code}</code></td>
                    <td>{as.auditor?.profile?.fullName || as.auditor?.username}</td>
                    <td>{new Date(as.scheduledDate).toLocaleDateString()}</td>
                    <td>
                      <span style={{ color: new Date(as.dueDate) < new Date() && as.status !== 'Approved' ? '#dc3545' : 'inherit', fontWeight: new Date(as.dueDate) < new Date() && as.status !== 'Approved' ? 'bold' : 'normal' }}>
                        {new Date(as.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(as.status)}`}>
                        {as.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <button
                          onClick={() => handleDeleteAssignment(as._id)}
                          style={{ border: 'none', background: 'none', color: '#dc3545', cursor: 'pointer' }}
                          title="Cancel Assignment"
                          disabled={as.status === 'Approved' || as.status === 'Submitted'}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', color: '#6c757d', padding: '2rem' }}>No audit allocations synced matching filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ASSIGN AUDIT MODAL */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Assign Infrastructure Audit</h3>
              <button className="close-btn" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateAssignment}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{ backgroundColor: '#f8d7da', color: '#842029', padding: '10px', borderRadius: '3px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {errorMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Select Audit Place / Facility</label>
                  <select
                    className="form-control"
                    value={selLocation}
                    onChange={(e) => setSelLocation(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Location --</option>
                    {locations.map((l) => (
                      <option key={l._id} value={l._id}>{l.name} ({l.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Auditor In-Charge</label>
                  <select
                    className="form-control"
                    value={selAuditor}
                    onChange={(e) => setSelAuditor(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Auditor --</option>
                    {auditors.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.profile?.fullName || a.username} ({a.profile?.department || 'Estate'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Schedule Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date Deadline</label>
                    <input
                      type="date"
                      className="form-control"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Instructions / Remarks for Auditor</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Provide specific notes regarding panels, fixtures, etc..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditAssignments;
