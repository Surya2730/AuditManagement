import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import {
  FiCheckCircle, FiClock, FiXCircle, FiShield, FiActivity,
  FiUsers, FiMapPin, FiUpload, FiEdit, FiSave, FiList,
  FiAlertCircle, FiFile, FiPlus, FiTrash2, FiChevronDown,
  FiChevronUp, FiCheckSquare
} from 'react-icons/fi';
import '../styles/components.css';
import '../styles/layout.css';

// Map pin icons
const submittedIcon = new L.DivIcon({
  html: `<div style="background: linear-gradient(135deg,#003580,#0047b3);width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,53,128,0.5);"></div>`,
  className: '', iconSize: [16, 16]
});
const approvedIcon = new L.DivIcon({
  html: `<div style="background:#16a34a;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(22,163,74,0.5);"></div>`,
  className: '', iconSize: [16, 16]
});
const pendingIcon = new L.DivIcon({
  html: `<div style="background:#d97706;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(217,119,6,0.5);"></div>`,
  className: '', iconSize: [16, 16]
});

const BIT_LAT = 11.5031;
const BIT_LON = 77.3301;

const QUESTION_TYPES = ['Yes/No', 'Rating', 'Dropdown', 'Text'];

const AdminDashboard = () => {
  const { api } = useAuth();

  // Analytics
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Assignments & Responses
  const [assignments, setAssignments] = useState([]);
  const [responses, setResponses] = useState([]);

  // Locations
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Active section tab
  const [activeTab, setActiveTab] = useState('overview');

  // Location Management State
  const [certFile, setCertFile] = useState(null);
  const [editingChecklist, setEditingChecklist] = useState(false);
  const [localChecklist, setLocalChecklist] = useState([]);
  const [savingLocation, setSavingLocation] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fileRef = useRef();

  // ──── Fetch All Data ────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [analyticsRes, assignRes, respRes, locRes] = await Promise.all([
          api.get('/audits/analytics'),
          api.get('/assignments'),
          api.get('/audits/responses'),
          api.get('/locations'),
        ]);
        setAnalytics(analyticsRes.data);
        setAssignments(assignRes.data);
        setResponses(respRes.data);

        // Fetch full location details with checklists
        const fullLocations = await Promise.all(
          locRes.data.map(l => api.get(`/locations/${l._id}`))
        );
        setLocations(fullLocations.map(r => r.data));
      } catch (err) {
        console.error(err);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    load();
  }, []);

  // ──── Location Selection ────────────────────────────
  const selectLocation = (loc) => {
    setSelectedLocation(loc);
    setLocalChecklist(loc.checklist.map(q => ({ ...q })));
    setEditingChecklist(false);
    setCertFile(null);
    setSaveMsg('');
  };

  // ──── Checklist editing helpers ─────────────────────
  const addQuestion = () => {
    const newQ = {
      questionId: `q-${Date.now()}`,
      question: '',
      type: 'Yes/No',
      weightage: 1,
      isRequired: true,
      category: 'General',
      options: [],
    };
    setLocalChecklist(prev => [...prev, newQ]);
  };

  const updateQuestion = (idx, field, val) => {
    setLocalChecklist(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const removeQuestion = (idx) => {
    setLocalChecklist(prev => prev.filter((_, i) => i !== idx));
  };

  // ──── Save Location Updates ─────────────────────────
  const handleSaveLocation = async () => {
    if (!selectedLocation) return;
    setSavingLocation(true);
    setSaveMsg('');
    try {
      const formData = new FormData();
      formData.append('checklist', JSON.stringify(localChecklist));
      if (certFile) formData.append('fitnessCertificate', certFile);

      const res = await api.put(`/locations/${selectedLocation._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const updated = res.data;
      setLocations(prev => prev.map(l => l._id === updated._id ? updated : l));
      setSelectedLocation(updated);
      setLocalChecklist(updated.checklist.map(q => ({ ...q })));
      setCertFile(null);
      setEditingChecklist(false);
      setSaveMsg('✓ Location settings saved successfully.');
    } catch (err) {
      setSaveMsg('Error saving changes: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingLocation(false);
    }
  };

  // ──── Derived Data ──────────────────────────────────
  const submittedResponses = responses.filter(r =>
    ['Pending Review', 'Approved', 'Rejected', 'Needs Reinspection'].includes(r.status)
  );

  // Map pins: only show locations where a report was submitted
  const mapPins = submittedResponses.map(r => {
    const loc = r.assignment?.location || r.location;
    if (!loc || !loc.latitude) return null;
    return {
      id: r._id,
      lat: loc.latitude,
      lng: loc.longitude,
      name: loc.name,
      code: loc.code,
      status: r.status,
      score: r.complianceScore,
      auditor: r.auditor?.profile?.fullName || r.auditor?.username,
    };
  }).filter(Boolean);

  // Assignment category lists
  const pendingAssignments   = assignments.filter(a => a.status === 'Pending');
  const inProgressAssignments= assignments.filter(a => a.status === 'In Progress');
  const submittedAssignments = assignments.filter(a => a.status === 'Submitted');
  const completedAssignments = assignments.filter(a => ['Approved', 'Rejected'].includes(a.status));

  const summary = analytics?.summary || {};
  const monthlyStats = analytics?.monthlyStats || [];
  const locationStats = analytics?.locationStats || [];

  const getMapIcon = (status) => {
    if (status === 'Approved') return approvedIcon;
    if (status === 'Pending Review') return pendingIcon;
    return submittedIcon;
  };

  if (analyticsLoading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e8eef8', borderTop: '3px solid #003580', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#5a6a80', fontWeight: 500 }}>Loading BIT Portal Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-title">
          <h2>Admin Control Centre</h2>
          <span>Bannari Amman Institute of Technology — Infrastructure Audit Portal</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', color: '#5a6a80', fontWeight: 600, alignSelf: 'center' }}>
            🕐 {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#e8eef8', color: '#003580' }}><FiShield /></div>
          <div className="stat-details">
            <span className="stat-title">Avg Compliance</span>
            <span className="stat-value">{summary.averageCompliance || 0}%</span>
            <span className="stat-sub">Campus-wide score</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}><FiCheckCircle /></div>
          <div className="stat-details">
            <span className="stat-title">Approved Audits</span>
            <span className="stat-value">{summary.completedAudits || 0}</span>
            <span className="stat-sub">Verified & closed</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}><FiClock /></div>
          <div className="stat-details">
            <span className="stat-title">Pending Review</span>
            <span className="stat-value">{summary.submittedAudits || 0}</span>
            <span className="stat-sub">Awaiting verification</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}><FiActivity /></div>
          <div className="stat-details">
            <span className="stat-title">In Progress</span>
            <span className="stat-value">{summary.inProgress || 0}</span>
            <span className="stat-sub">Active inspections</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}><FiXCircle /></div>
          <div className="stat-details">
            <span className="stat-title">Needs Reinspection</span>
            <span className="stat-value">{summary.failedAudits || 0}</span>
            <span className="stat-sub">Rejected reports</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}><FiUsers /></div>
          <div className="stat-details">
            <span className="stat-title">Auditors</span>
            <span className="stat-value">{summary.onlineAuditors || 0}<span style={{ fontSize: '1rem', color: '#5a6a80' }}>/{summary.totalAuditors || 0}</span></span>
            <span className="stat-sub">Online / Total</span>
          </div>
        </div>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div className="tab-group">
        {[
          { key: 'overview',   label: 'Overview & Map',     icon: <FiMapPin /> },
          { key: 'assignments',label: 'Audit Assignments',  icon: <FiCheckSquare /> },
          { key: 'locations',  label: 'Campus Locations',   icon: <FiList /> },
          { key: 'analytics',  label: 'Analytics',          icon: <FiActivity /> },
        ].map(t => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
           TAB: OVERVIEW & MAP
      ═══════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>

            {/* Campus Map — Only submitted locations visible */}
            <div className="card card-accent" style={{ margin: 0 }}>
              <div className="card-header">
                <h3 className="card-title"><FiMapPin style={{ marginRight: 6 }} />Campus Audit Map</h3>
                <span style={{ fontSize: '0.75rem', color: '#5a6a80' }}>
                  Showing {mapPins.length} submitted location{mapPins.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ height: '400px', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <MapContainer center={[BIT_LAT, BIT_LON]} zoom={15} style={{ width: '100%', height: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                  {mapPins.map((pin) => (
                    <React.Fragment key={pin.id}>
                      <Marker position={[pin.lat, pin.lng]} icon={getMapIcon(pin.status)}>
                        <Popup>
                          <div style={{ minWidth: 180 }}>
                            <strong style={{ color: '#003580', display: 'block', marginBottom: 4 }}>{pin.name}</strong>
                            <div style={{ fontSize: 12, color: '#5a6a80' }}>Code: {pin.code}</div>
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                              Auditor: <strong>{pin.auditor}</strong>
                            </div>
                            <div style={{ fontSize: 12 }}>Score: <strong>{pin.score}%</strong></div>
                            <div style={{ marginTop: 6 }}>
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: '2px 8px',
                                borderRadius: 50, background: pin.status === 'Approved' ? '#dcfce7' : pin.status === 'Pending Review' ? '#fef3c7' : '#fee2e2',
                                color: pin.status === 'Approved' ? '#15803d' : pin.status === 'Pending Review' ? '#92400e' : '#991b1b',
                              }}>{pin.status}</span>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                      <Circle
                        center={[pin.lat, pin.lng]} radius={80}
                        pathOptions={{ color: '#003580', fillColor: '#003580', fillOpacity: 0.06, weight: 1 }}
                      />
                    </React.Fragment>
                  ))}
                </MapContainer>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12, color: '#5a6a80', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> Approved
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} /> Pending Review
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#003580', display: 'inline-block' }} /> Submitted
                </span>
              </div>
            </div>

            {/* Right Column — Audit Lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Submitted / Pending Review */}
              <div className="card card-primary" style={{ margin: 0, padding: 0 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiClock style={{ color: '#d97706' }} />
                  <strong style={{ fontSize: '0.875rem', color: '#003580' }}>Pending Review ({submittedAssignments.length})</strong>
                </div>
                {submittedAssignments.length === 0 ? (
                  <div className="empty-state"><p>No submissions pending review</p></div>
                ) : submittedAssignments.slice(0, 5).map(a => (
                  <div key={a._id} className="audit-list-item">
                    <div className="audit-list-item-info">
                      <span className="audit-list-item-name">{a.location?.name}</span>
                      <span className="audit-list-item-sub">{a.auditor?.profile?.fullName || a.auditor?.username}</span>
                    </div>
                    <span className="badge badge-warning">Review</span>
                  </div>
                ))}
              </div>

              {/* In Progress */}
              <div className="card" style={{ margin: 0, padding: 0 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiActivity style={{ color: '#0369a1' }} />
                  <strong style={{ fontSize: '0.875rem', color: '#003580' }}>In Progress ({inProgressAssignments.length})</strong>
                </div>
                {inProgressAssignments.length === 0 ? (
                  <div className="empty-state"><p>No active inspections</p></div>
                ) : inProgressAssignments.slice(0, 4).map(a => (
                  <div key={a._id} className="audit-list-item">
                    <div className="audit-list-item-info">
                      <span className="audit-list-item-name">{a.location?.name}</span>
                      <span className="audit-list-item-sub">{a.auditor?.profile?.fullName || a.auditor?.username}</span>
                    </div>
                    <span className="badge badge-info">Active</span>
                  </div>
                ))}
              </div>

              {/* Completed */}
              <div className="card" style={{ margin: 0, padding: 0 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiCheckCircle style={{ color: '#16a34a' }} />
                  <strong style={{ fontSize: '0.875rem', color: '#003580' }}>Completed ({completedAssignments.length})</strong>
                </div>
                {completedAssignments.length === 0 ? (
                  <div className="empty-state"><p>No completed audits yet</p></div>
                ) : completedAssignments.slice(0, 4).map(a => (
                  <div key={a._id} className="audit-list-item">
                    <div className="audit-list-item-info">
                      <span className="audit-list-item-name">{a.location?.name}</span>
                      <span className="audit-list-item-sub">{a.auditor?.profile?.fullName || a.auditor?.username}</span>
                    </div>
                    <span className={`badge ${a.status === 'Approved' ? 'badge-success' : 'badge-danger'}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
           TAB: ASSIGNMENTS
      ═══════════════════════════════════════════ */}
      {activeTab === 'assignments' && (
        <div className="card card-accent" style={{ margin: 0 }}>
          <div className="card-header">
            <h3 className="card-title"><FiCheckSquare style={{ marginRight: 6 }} />All Audit Assignments</h3>
            <button className="btn btn-primary btn-sm" onClick={() => window.location.href = '/assignments'}>
              <FiPlus /> Assign New Audit
            </button>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Facility / Location</th>
                  <th>Auditor</th>
                  <th>Scheduled Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#5a6a80' }}>No assignments found</td></tr>
                )}
                {assignments.map(a => (
                  <tr key={a._id}>
                    <td>
                      <strong style={{ color: '#003580' }}>{a.location?.name || 'Deleted'}</strong>
                      <div style={{ fontSize: '0.72rem', color: '#5a6a80' }}>{a.location?.code}</div>
                    </td>
                    <td>{a.auditor?.profile?.fullName || a.auditor?.username}</td>
                    <td>{new Date(a.scheduledDate).toLocaleDateString('en-IN')}</td>
                    <td style={{ color: new Date(a.dueDate) < new Date() && !['Approved'].includes(a.status) ? '#dc2626' : 'inherit', fontWeight: new Date(a.dueDate) < new Date() && !['Approved'].includes(a.status) ? 700 : 400 }}>
                      {new Date(a.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${
                        a.status === 'Approved' ? 'badge-success' :
                        a.status === 'Submitted' ? 'badge-primary' :
                        a.status === 'In Progress' ? 'badge-info' :
                        a.status === 'Pending' ? 'badge-warning' :
                        'badge-danger'
                      }`}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
           TAB: CAMPUS LOCATIONS & CHECKLISTS
      ═══════════════════════════════════════════ */}
      {activeTab === 'locations' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* Location Selector */}
          <div>
            <div className="card card-accent" style={{ margin: 0, padding: '1rem' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', fontWeight: 700, color: '#003580', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                <FiMapPin style={{ marginRight: 6 }} /> Campus Facilities
              </h4>
              <div className="location-grid" style={{ gridTemplateColumns: '1fr' }}>
                {locations.map(loc => (
                  <div
                    key={loc._id}
                    className={`location-card ${selectedLocation?._id === loc._id ? 'selected' : ''}`}
                    onClick={() => selectLocation(loc)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#003580' }}>{loc.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#5a6a80', marginTop: 2 }}>{loc.building} · {loc.floor}</div>
                      </div>
                      <code style={{ fontSize: '0.7rem', background: '#f0f4f8', color: '#003580', padding: '2px 6px', borderRadius: 4 }}>
                        {loc.code}
                      </code>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: '0.72rem', color: '#5a6a80' }}>
                      <span>{loc.checklist.length} questions</span>
                      {loc.fitnessCertificateUrl && <span style={{ color: '#16a34a', fontWeight: 600 }}>📎 Certificate</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Location Details & Checklist Editor */}
          <div>
            {!selectedLocation ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <FiMapPin style={{ fontSize: '3rem', color: '#c8d8e8', display: 'block', margin: '0 auto 12px' }} />
                <h4 style={{ color: '#5a6a80', margin: '0 0 8px' }}>Select a Campus Facility</h4>
                <p style={{ color: '#9aadbe', fontSize: '0.875rem', margin: 0 }}>
                  Choose a location from the left panel to view and edit its checklist and fitness certificate.
                </p>
              </div>
            ) : (
              <div>
                {/* Location Info & Certificate Card */}
                <div className="card card-accent" style={{ margin: '0 0 1.5rem 0' }}>
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">{selectedLocation.name}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#5a6a80' }}>{selectedLocation.building} — {selectedLocation.floor}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!editingChecklist ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingChecklist(true)}>
                          <FiEdit /> Edit Checklist
                        </button>
                      ) : (
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditingChecklist(false); setLocalChecklist(selectedLocation.checklist.map(q => ({ ...q }))); }}>
                          Cancel
                        </button>
                      )}
                      <button className="btn btn-primary btn-sm" onClick={handleSaveLocation} disabled={savingLocation}>
                        <FiSave /> {savingLocation ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>

                  {saveMsg && (
                    <div style={{
                      marginBottom: 16, padding: '10px 14px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 500,
                      background: saveMsg.startsWith('✓') ? '#dcfce7' : '#fee2e2',
                      color: saveMsg.startsWith('✓') ? '#15803d' : '#991b1b',
                      border: `1px solid ${saveMsg.startsWith('✓') ? '#bbf7d0' : '#fecaca'}`
                    }}>{saveMsg}</div>
                  )}

                  {/* Fitness Certificate */}
                  <div style={{ background: '#f8fafc', border: '1.5px dashed var(--border-color)', borderRadius: 8, padding: '1rem', marginBottom: 16 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: 700, color: '#003580', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiFile /> Fitness Certificate
                    </h4>

                    {selectedLocation.fitnessCertificateUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <a
                          href={selectedLocation.fitnessCertificateUrl}
                          target="_blank" rel="noreferrer"
                          style={{ color: '#003580', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          <FiFile /> View Existing Certificate
                        </a>
                        <span style={{ color: '#5a6a80', fontSize: '0.78rem' }}>· Upload new to replace</span>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: '#5a6a80', margin: '0 0 10px 0' }}>
                        No certificate uploaded yet. Upload a PDF or image to make it visible to auditors.
                      </p>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        ref={fileRef}
                        style={{ display: 'none' }}
                        onChange={e => setCertFile(e.target.files[0])}
                      />
                      <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>
                        <FiUpload /> {certFile ? `Selected: ${certFile.name}` : 'Upload Certificate (PDF/Image)'}
                      </button>
                    </div>
                  </div>

                  {/* Location Meta */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: '0.8rem' }}>
                    {[
                      { label: 'GPS Latitude', val: selectedLocation.latitude?.toFixed(5) },
                      { label: 'GPS Longitude', val: selectedLocation.longitude?.toFixed(5) },
                      { label: 'Geofence Radius', val: `${selectedLocation.radius} m` },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#f0f4f8', padding: '8px 12px', borderRadius: 6 }}>
                        <div style={{ color: '#5a6a80', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                        <div style={{ fontWeight: 700, color: '#003580', marginTop: 2 }}>{item.val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checklist Editor */}
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-header">
                    <h3 className="card-title"><FiList style={{ marginRight: 6 }} />Audit Checklist ({localChecklist.length} items)</h3>
                    {editingChecklist && (
                      <button className="btn btn-secondary btn-sm" onClick={addQuestion}>
                        <FiPlus /> Add Question
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {localChecklist.map((q, idx) => (
                      <div key={q.questionId || idx} style={{
                        border: '1.5px solid var(--border-color)', borderRadius: 8, padding: '12px 16px',
                        background: editingChecklist ? '#fafcff' : '#fff',
                        transition: 'border-color 0.15s'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            {editingChecklist ? (
                              <input
                                className="form-control"
                                value={q.question}
                                onChange={e => updateQuestion(idx, 'question', e.target.value)}
                                placeholder="Enter question text..."
                                style={{ fontWeight: 500, marginBottom: 8 }}
                              />
                            ) : (
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a2332', marginBottom: 6 }}>
                                {q.question || <span style={{ color: '#9aadbe' }}>Untitled question</span>}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                              {editingChecklist ? (
                                <>
                                  <select
                                    className="form-control"
                                    value={q.type}
                                    onChange={e => updateQuestion(idx, 'type', e.target.value)}
                                    style={{ width: 130 }}
                                  >
                                    {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <input
                                    className="form-control"
                                    type="number" min={0} max={10}
                                    value={q.weightage}
                                    onChange={e => updateQuestion(idx, 'weightage', parseInt(e.target.value))}
                                    style={{ width: 80 }}
                                    placeholder="Weight"
                                  />
                                  <input
                                    className="form-control"
                                    value={q.category}
                                    onChange={e => updateQuestion(idx, 'category', e.target.value)}
                                    style={{ width: 140 }}
                                    placeholder="Category"
                                  />
                                  <label className="form-checkbox" style={{ fontSize: '0.8rem', flexShrink: 0 }}>
                                    <input
                                      type="checkbox"
                                      checked={q.isRequired}
                                      onChange={e => updateQuestion(idx, 'isRequired', e.target.checked)}
                                    />
                                    <span>Required</span>
                                  </label>
                                </>
                              ) : (
                                <>
                                  <span className="badge badge-primary">{q.type}</span>
                                  <span className="badge badge-outline">Wt: {q.weightage}</span>
                                  <span className="badge badge-outline">{q.category}</span>
                                  {q.isRequired && <span className="badge badge-danger">Required</span>}
                                </>
                              )}
                            </div>
                          </div>
                          {editingChecklist && (
                            <button
                              onClick={() => removeQuestion(idx)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                              title="Remove question"
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {localChecklist.length === 0 && (
                      <div className="empty-state">
                        <FiList />
                        <p>No checklist items. Click "Add Question" to begin.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
           TAB: ANALYTICS
      ═══════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem' }}>
          <div className="card card-primary" style={{ margin: 0 }}>
            <div className="card-header">
              <h3 className="card-title">Monthly Compliance Trend</h3>
            </div>
            <div style={{ height: 260 }}>
              {monthlyStats.length === 0 ? (
                <div className="empty-state" style={{ height: '100%' }}><p>No monthly data synced yet</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef8" />
                    <XAxis dataKey="month" stroke="#9aadbe" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#9aadbe" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #dce4f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                    <Legend fontSize={11} />
                    <Line type="monotone" dataKey="avgScore" name="Compliance %" stroke="#003580" strokeWidth={2.5} dot={{ r: 4, fill: '#c8951a' }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card card-primary" style={{ margin: 0 }}>
            <div className="card-header">
              <h3 className="card-title">Facility Compliance Scores</h3>
            </div>
            <div style={{ height: 260 }}>
              {locationStats.length === 0 ? (
                <div className="empty-state" style={{ height: '100%' }}><p>No approved audits available</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationStats.map(i => ({ ...i, name: (i.locationName || '').split(' ').slice(0, 2).join(' ') }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef8" />
                    <XAxis dataKey="name" stroke="#9aadbe" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#9aadbe" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #dce4f0' }} />
                    <Legend fontSize={11} />
                    <Bar dataKey="avgScore" name="Avg Score %" fill="#003580" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
