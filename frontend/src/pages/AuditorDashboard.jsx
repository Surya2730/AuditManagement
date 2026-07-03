import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiCheckSquare, FiClock, FiActivity, FiArrowRight } from 'react-icons/fi';
import '../styles/components.css';

const AuditorDashboard = () => {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/assignments');
      setTasks(res.data);
    } catch (err) {
      console.error('Error fetching auditor tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Auditor Work Desk...</div>;
  }

  // Count summaries
  const pendingCount = tasks.filter((t) => ['Pending', 'In Progress', 'Needs Reinspection'].includes(t.status)).length;
  const completedCount = tasks.filter((t) => t.status === 'Approved').length;
  const submittedCount = tasks.filter((t) => t.status === 'Submitted').length;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#002B49' }}>Auditor Work Desk</h2>
        <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>Welcome back, {user.profile?.fullName || user.username}. Manage your field audits.</span>
      </div>

      {/* SUMMARY PANEL */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fff3cd', color: '#ffc107' }}>
            <FiClock />
          </div>
          <div className="stat-details">
            <span className="stat-title">Inspections Pending</span>
            <span className="stat-value">{pendingCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#cfe2ff', color: '#084298' }}>
            <FiActivity />
          </div>
          <div className="stat-details">
            <span className="stat-title">Submitted Review</span>
            <span className="stat-value">{submittedCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#d1e7dd', color: '#198754' }}>
            <FiCheckSquare />
          </div>
          <div className="stat-details">
            <span className="stat-title">Approved Audits</span>
            <span className="stat-value">{completedCount}</span>
          </div>
        </div>
      </div>

      {/* FIELD TASKS SCHEDULE */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
          <h3 className="card-title">Assigned Field Inspections</h3>
        </div>
        
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Target Facility / Place</th>
                <th>Location Code</th>
                <th>Allocated Date</th>
                <th>Deadline Due</th>
                <th>Current Status</th>
                <th style={{ width: '150px' }}>Inspection Link</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task._id}>
                  <td>
                    <strong>{task.location?.name || 'Location Deleted'}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>{task.location?.building} | {task.location?.floor}</div>
                  </td>
                  <td><code style={{ fontSize: '0.85rem' }}>{task.location?.code}</code></td>
                  <td>{new Date(task.scheduledDate).toLocaleDateString()}</td>
                  <td>
                    <span style={{ color: new Date(task.dueDate) < new Date() && task.status !== 'Approved' ? '#dc3545' : 'inherit', fontWeight: new Date(task.dueDate) < new Date() && task.status !== 'Approved' ? 'bold' : 'normal' }}>
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      task.status === 'Approved' ? 'badge-success' :
                      task.status === 'Submitted' ? 'badge-primary' :
                      task.status === 'Pending' ? 'badge-warning' :
                      task.status === 'In Progress' ? 'badge-info' : 'badge-danger'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td>
                    {['Pending', 'In Progress', 'Needs Reinspection', 'Rejected'].includes(task.status) ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/audit/${task._id}`)}
                        style={{ padding: '4px 10px', fontSize: '0.8rem', width: '100%' }}
                      >
                        Start Audit <FiArrowRight style={{ marginLeft: '4px' }} />
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#6c757d', textAlign: 'center', display: 'block' }}>
                        Locked (Submitted)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: '#6c757d', padding: '2rem' }}>No pending field inspection tasks assigned to you.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditorDashboard;
