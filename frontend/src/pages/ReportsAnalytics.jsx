import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  FiSearch, FiEye, FiMapPin, FiSmartphone, FiFile,
  FiCheckCircle, FiXCircle, FiRefreshCw, FiDownload, FiUser
} from 'react-icons/fi';
import '../styles/components.css';

// ── Map Icons ──────────────────────────────────────────────────────
const targetIcon = new L.DivIcon({
  html: `<div style="background:#003580;width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,53,128,0.5);"></div>`,
  className: '', iconSize: [14, 14]
});

const submissionIcon = new L.DivIcon({
  html: `<div style="background:#16a34a;width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(22,163,74,0.5);"></div>`,
  className: '', iconSize: [14, 14]
});

const liveIcon = new L.DivIcon({
  html: `<div style="background:#d97706;width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(217,119,6,0.5);animation:pulse 1.5s infinite;"></div>`,
  className: '', iconSize: [14, 14]
});

// Helper to recenter map when activeResponse changes
function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => { if (lat && lng) map.setView([lat, lng], 16); }, [lat, lng]);
  return null;
}

// ──────────────────────────────────────────────────────────────────
const ReportsAnalytics = () => {
  const { api, user } = useAuth();
  const { liveLocations } = useSocket();

  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Modal
  const [activeResponse, setActiveResponse] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const fetchResponses = async () => {
    try {
      const res = await api.get('/audits/responses');
      setResponses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResponses(); }, []);

  // ── Review Handler ──────────────────────────────────────────────
  const handleReview = async (status) => {
    if (!activeResponse) return;
    setReviewSubmitting(true);
    try {
      await api.post(
        `/audits/${activeResponse._id}/review`,
        { status, remarks: reviewRemarks }
      );
      setResponses(prev =>
        prev.map(r => r._id === activeResponse._id
          ? { ...r, status, reviewRemarks, reviewedBy: { username: user.username } }
          : r)
      );
      setActiveResponse(null);
      setReviewRemarks('');
    } catch (err) {
      console.error(err);
      alert('Review submission failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Filtering ───────────────────────────────────────────────────
  const filteredResponses = responses.filter(r => {
    const loc = r.assignment?.location || r.location || {};
    const auditor = r.auditor?.profile?.fullName || r.auditor?.username || '';
    const str = `${loc.name || ''} ${loc.code || ''} ${auditor}`.toLowerCase();
    return (
      str.includes(search.toLowerCase()) &&
      (statusFilter ? r.status === statusFilter : true) &&
      (locationFilter ? (loc._id === locationFilter) : true)
    );
  });

  const uniqueLocations = Array.from(
    new Map(responses.map(r => {
      const loc = r.assignment?.location || r.location;
      return loc ? [loc._id, loc] : [null, null];
    })).values()
  ).filter(Boolean);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return 'badge-success';
      case 'Pending Review': return 'badge-warning';
      case 'Rejected':
      case 'Needs Reinspection': return 'badge-danger';
      default: return 'badge-outline';
    }
  };

  const isAdmin = user?.role === 'Admin';

  // ── Live auditor position for active response ───────────────────
  const modalAuditorId = activeResponse?.auditor?._id;
  const liveAuditorPos = modalAuditorId
    ? Array.from(liveLocations.values()).find(l => l.userId === modalAuditorId)
    : null;

  // ── Location object from active response ─────────────────────────
  const activeLocation = activeResponse
    ? (activeResponse.assignment?.location || activeResponse.location)
    : null;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h2>Reports & Audit Review</h2>
          <span>Inspection submissions, compliance details and admin verification</span>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="card" style={{ padding: '0.85rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 200 }}>
          <FiSearch style={{ color: '#5a6a80', flexShrink: 0 }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search location, auditor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '5px 10px' }}
          />
        </div>
        <select
          className="form-control"
          style={{ width: 160, padding: '5px 10px' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="Pending Review">Pending Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Needs Reinspection">Needs Reinspection</option>
        </select>
        <select
          className="form-control"
          style={{ width: 200, padding: '5px 10px' }}
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
        >
          <option value="">All Locations</option>
          {uniqueLocations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
      </div>

      {/* RESPONSES TABLE */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#5a6a80' }}>Loading inspection records...</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Inspection ID</th>
                  <th>Audit Place</th>
                  <th>Auditor</th>
                  <th>Submitted</th>
                  <th>Score</th>
                  <th>Geofence</th>
                  <th>Status</th>
                  <th style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResponses.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#5a6a80', padding: '2.5rem' }}>No audit records found.</td></tr>
                )}
                {filteredResponses.map(resp => {
                  const loc = resp.assignment?.location || resp.location || {};
                  return (
                    <tr key={resp._id}>
                      <td><code style={{ fontSize: '0.75rem', color: '#5a6a80' }}>#{resp._id.slice(-8)}</code></td>
                      <td>
                        <strong style={{ color: '#003580' }}>{loc.name}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#5a6a80' }}>{loc.code}</div>
                      </td>
                      <td>{resp.auditor?.profile?.fullName || resp.auditor?.username}</td>
                      <td>{new Date(resp.submitTime).toLocaleDateString('en-IN')}</td>
                      <td>
                        <strong style={{
                          color: resp.complianceScore >= 80 ? '#16a34a' :
                                 resp.complianceScore >= 50 ? '#d97706' : '#dc2626',
                          fontSize: '1rem'
                        }}>
                          {resp.complianceScore}%
                        </strong>
                      </td>
                      <td>
                        {resp.gpsMetadata?.isInsideGeofence
                          ? <span className="badge badge-success">✓ Verified</span>
                          : <span className="badge badge-danger">Outside</span>
                        }
                      </td>
                      <td><span className={`badge ${getStatusBadge(resp.status)}`}>{resp.status}</span></td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setActiveResponse(resp); setReviewRemarks(resp.reviewRemarks || ''); }}
                        >
                          <FiEye /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ REVIEW MODAL ══ */}
      {activeResponse && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-xl" style={{ width: '96%' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                  Inspection Review — {activeLocation?.name}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  Auditor: {activeResponse.auditor?.profile?.fullName || activeResponse.auditor?.username}
                  &nbsp;·&nbsp; Score: <strong style={{ color: '#fbbf24' }}>{activeResponse.complianceScore}%</strong>
                  &nbsp;·&nbsp; {new Date(activeResponse.submitTime).toLocaleString('en-IN')}
                </div>
              </div>
              <button className="close-btn" onClick={() => { setActiveResponse(null); setReviewRemarks(''); }}>×</button>
            </div>

            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>

              {/* LEFT: Checklist + GPS Details */}
              <div>
                {/* GPS Metadata Bar */}
                <div style={{ background: '#f0f4f8', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.8rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#003580', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FiMapPin /> GPS Coordinates
                    </div>
                    <div>Lat: <strong>{activeResponse.gpsMetadata.latitude.toFixed(6)}</strong></div>
                    <div>Lng: <strong>{activeResponse.gpsMetadata.longitude.toFixed(6)}</strong></div>
                    <div>Accuracy: {activeResponse.gpsMetadata.accuracy.toFixed(1)}m</div>
                    <div>Distance: <strong>{activeResponse.gpsMetadata.distanceFromLocation}m</strong> from target</div>
                    <div style={{ marginTop: 4 }}>
                      {activeResponse.gpsMetadata.isInsideGeofence
                        ? <span className="badge badge-success">✓ Inside Geofence</span>
                        : <span className="badge badge-danger">Outside Geofence</span>
                      }
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#003580', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FiSmartphone /> Session Info
                    </div>
                    <div>Duration: <strong>{Math.round((new Date(activeResponse.submitTime) - new Date(activeResponse.startTime)) / 60000)} min</strong></div>
                    <div>GPS Pings: {activeResponse.totalGpsPings}</div>
                    <div>Deviations: <span style={{ color: activeResponse.totalDeviations > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{activeResponse.totalDeviations}</span></div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, color: '#5a6a80' }}>
                      IP: {activeResponse.gpsMetadata.ipAddress}
                    </div>
                  </div>
                </div>

                {/* Visit Photo */}
                {activeResponse.visitImage && (
                  <div style={{ marginBottom: 16, background: '#f8fafc', borderRadius: 8, padding: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: '#003580', fontSize: '0.875rem', marginBottom: 8 }}>📸 Geotagged Visit Photo</div>
                    <a href={activeResponse.visitImage} target="_blank" rel="noreferrer">
                      <img
                        src={activeResponse.visitImage}
                        alt="Visit verification"
                        style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-color)' }}
                      />
                    </a>
                  </div>
                )}

                {/* Checklist Results */}
                <div style={{ fontWeight: 700, color: '#003580', fontSize: '0.875rem', marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid var(--border-color)' }}>
                  📋 Checklist Results ({activeResponse.answers.length} items)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
                  {activeResponse.answers.map((ans, i) => {
                    const checklist = activeLocation?.checklist || [];
                    const q = checklist.find(x => x.questionId === ans.questionId);
                    const isPass = ans.value === 'Yes' || (parseInt(ans.value) >= 4);
                    const isFail = ans.value === 'No' || (parseInt(ans.value) <= 2);
                    return (
                      <div key={i} style={{ borderBottom: '1px solid #f0f4f8', paddingBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1a2332' }}>
                            {q ? q.question : ans.questionId}
                          </div>
                          {ans.remarks && <div style={{ fontSize: '0.75rem', color: '#5a6a80', marginTop: 2 }}>Remark: {ans.remarks}</div>}
                          {ans.images?.length > 0 && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                              {ans.images.map(img => (
                                <a key={img} href={img} target="_blank" rel="noreferrer">
                                  <img src={img} alt="attached" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-color)' }} />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <span className={`badge ${isPass ? 'badge-success' : isFail ? 'badge-danger' : 'badge-info'}`}>
                            {ans.value || '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Workflow History */}
                <div style={{ fontWeight: 700, color: '#003580', fontSize: '0.875rem', margin: '16px 0 8px', paddingBottom: 6, borderBottom: '2px solid var(--border-color)' }}>
                  🕐 Workflow Timeline
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeResponse.history?.map((h, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.8rem' }}>
                      <span style={{ color: '#003580', fontSize: '1rem', lineHeight: '1rem', marginTop: 1 }}>•</span>
                      <div>
                        <strong>{h.status}</strong>
                        <span style={{ color: '#5a6a80', marginLeft: 6 }}>{new Date(h.updatedAt || Date.now()).toLocaleString('en-IN')}</span>
                        {h.remarks && <div style={{ color: '#5a6a80', fontSize: '0.75rem' }}>↳ {h.remarks}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* RIGHT: Map + Admin Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Geolocation Map */}
                {activeResponse.gpsMetadata?.latitude && activeLocation?.latitude && (
                  <div style={{ borderRadius: 8, overflow: 'hidden', border: '1.5px solid var(--border-color)', height: 300, flexShrink: 0 }}>
                    <MapContainer
                      center={[activeLocation.latitude, activeLocation.longitude]}
                      zoom={16}
                      style={{ width: '100%', height: '100%' }}
                      zoomControl={false}
                    >
                      <MapRecenter lat={activeLocation.latitude} lng={activeLocation.longitude} />
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />

                      {/* Target location */}
                      <Marker position={[activeLocation.latitude, activeLocation.longitude]} icon={targetIcon}>
                        <Popup><strong>{activeLocation.name}</strong> (Target)</Popup>
                      </Marker>
                      <Circle
                        center={[activeLocation.latitude, activeLocation.longitude]}
                        radius={activeLocation.radius || 100}
                        pathOptions={{ color: '#003580', fillColor: '#003580', fillOpacity: 0.08, weight: 1.5 }}
                      />

                      {/* Submitted GPS point */}
                      <Marker position={[activeResponse.gpsMetadata.latitude, activeResponse.gpsMetadata.longitude]} icon={submissionIcon}>
                        <Popup>Submitted GPS Point</Popup>
                      </Marker>

                      {/* Live auditor pin (if auditor is still streaming) */}
                      {liveAuditorPos && (
                        <Marker position={[liveAuditorPos.latitude, liveAuditorPos.longitude]} icon={liveIcon}>
                          <Popup>
                            <strong>Live: {liveAuditorPos.username}</strong><br />
                            Status: {liveAuditorPos.status}
                          </Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  </div>
                )}

                {/* Map Legend */}
                <div style={{ display: 'flex', gap: 14, fontSize: '0.72rem', color: '#5a6a80', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#003580', display: 'inline-block' }} /> Target
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> Submitted Location
                  </span>
                  {liveAuditorPos && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706', display: 'inline-block', animation: 'pulse 1.5s infinite' }} /> Live Position
                    </span>
                  )}
                </div>

                {/* Admin Review Panel */}
                {isAdmin && activeResponse.status === 'Pending Review' && (
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '1rem', border: '1.5px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: '#003580', fontSize: '0.875rem', marginBottom: 10 }}>
                      ✅ Admin Verification
                    </div>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Review Remarks</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Add comments for the auditor..."
                        value={reviewRemarks}
                        onChange={e => setReviewRemarks(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button className="btn btn-success" onClick={() => handleReview('Approved')} disabled={reviewSubmitting} style={{ width: '100%' }}>
                        <FiCheckCircle /> Approve Report
                      </button>
                      <button className="btn btn-warning" onClick={() => handleReview('Needs Reinspection')} disabled={reviewSubmitting} style={{ width: '100%' }}>
                        <FiRefreshCw /> Needs Reinspection
                      </button>
                      <button className="btn btn-danger" onClick={() => handleReview('Rejected')} disabled={reviewSubmitting} style={{ width: '100%' }}>
                        <FiXCircle /> Reject Report
                      </button>
                    </div>
                  </div>
                )}

                {/* Already reviewed badge */}
                {activeResponse.status !== 'Pending Review' && (
                  <div style={{ background: '#f0f4f8', borderRadius: 8, padding: '12px', textAlign: 'center', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 700, color: '#003580' }}>Review Complete</div>
                    <span className={`badge ${getStatusBadge(activeResponse.status)}`} style={{ marginTop: 6 }}>
                      {activeResponse.status}
                    </span>
                    {activeResponse.reviewRemarks && (
                      <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#5a6a80', fontStyle: 'italic' }}>
                        "{activeResponse.reviewRemarks}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setActiveResponse(null); setReviewRemarks(''); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(217,119,6,0.7); }
          70%  { box-shadow: 0 0 0 8px rgba(217,119,6,0); }
          100% { box-shadow: 0 0 0 0 rgba(217,119,6,0); }
        }
      `}</style>
    </div>
  );
};

export default ReportsAnalytics;
