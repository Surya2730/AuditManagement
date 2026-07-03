import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import useGeolocation from '../hooks/useGeolocation';
import useLocalStorage from '../hooks/useLocalStorage';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { FiCamera, FiCheck, FiAlertTriangle, FiRefreshCw, FiSave, FiWifi, FiWifiOff, FiLock } from 'react-icons/fi';
import '../styles/components.css';

// Fix Leaflet Marker Icon bug in Vite
const buildingIcon = new L.DivIcon({
  html: `<div style="background-color: #0b5ed7; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  className: 'custom-pin-building',
  iconSize: [12, 12]
});

const auditorIcon = new L.DivIcon({
  html: `<div style="background-color: #198754; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  className: 'custom-pin-auditor',
  iconSize: [12, 12]
});

const ActiveAudit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const { sendLocationUpdate } = useSocket();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrVerified, setQrVerified] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [qrError, setQrError] = useState('');

  // Simulation Overrides for Testing
  const [gpsSimulated, setGpsSimulated] = useState(false);
  const [simulatedCoords, setSimulatedCoords] = useState(null);

  // Offline Mode States
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Retrieve browser coordinates using Geolocation Hook
  const { coordinates: realCoords, error: gpsError, distance, isInside } = useGeolocation(
    assignment?.location ? (gpsSimulated ? simulatedCoords : assignment.location) : null,
    assignment?.location?.radius || 100
  );

  const activeCoords = gpsSimulated && simulatedCoords ? simulatedCoords : realCoords;
  const activeDistance = distance;
  const activeIsInside = gpsSimulated ? true : isInside;

  // Form Answer States synced with LocalStorage for Auto-Save
  const [answers, setAnswers] = useLocalStorage(`audit_draft_${id}`, {});
  const [visitImage, setVisitImage] = useLocalStorage(`audit_visit_image_${id}`, '');
  const [uploadingVisitPhoto, setUploadingVisitPhoto] = useState(false);
  const [uploadingImage, setUploadingImage] = useState({});
  const [saveStatus, setSaveStatus] = useState('Saved Draft');
  const [submitError, setSubmitError] = useState('');

  const startTimeRef = useRef(new Date());

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync Draft check-in status on load
  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const res = await api.get(`/assignments/${id}`);
        setAssignment(res.data);
        
        // Setup coordinates simulation default
        setSimulatedCoords({
          latitude: res.data.location.latitude,
          longitude: res.data.location.longitude,
          accuracy: 5
        });

        // Set status to In Progress
        if (res.data.status === 'Pending') {
          await api.put(`/assignments/${id}`, { status: 'In Progress' });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignment();
  }, [id]);

  // Real-time location stream to Admins via Socket every 20 seconds
  useEffect(() => {
    if (!assignment || !activeCoords.latitude) return;

    const interval = setInterval(() => {
      sendLocationUpdate(
        activeCoords.latitude,
        activeCoords.longitude,
        activeCoords.accuracy || 10,
        'Inspecting',
        id
      );
    }, 20000);

    return () => clearInterval(interval);
  }, [assignment, activeCoords, id]);

  // Auto-Save notification triggers
  useEffect(() => {
    const timer = setTimeout(() => {
      setSaveStatus('Saving Draft...');
      setTimeout(() => setSaveStatus('Saved Draft'), 1000);
    }, 3000);

    return () => clearTimeout(timer);
  }, [answers, visitImage]);

  const handleQrSubmit = (e) => {
    e.preventDefault();
    setQrError('');
    
    const expectedQr = `ROOM_VERIFY_${assignment.location.code}`;
    
    if (qrInput.trim() === expectedQr) {
      setQrVerified(true);
    } else {
      setQrError('QR Code Verification Code is invalid.');
    }
  };

  const handleSimulateQr = () => {
    const expectedQr = `ROOM_VERIFY_${assignment.location.code}`;
    setQrInput(expectedQr);
    setQrVerified(true);
  };

  const handleAnswerChange = (questionId, value, remarks = '', images = null) => {
    const current = answers[questionId] || { value: '', remarks: '', images: [] };
    
    setAnswers({
      ...answers,
      [questionId]: {
        value: value !== null ? value : current.value,
        remarks: remarks !== null ? remarks : current.remarks,
        images: images !== null ? images : current.images,
      }
    });
  };

  const handleVisitImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingVisitPhoto(true);
    const formData = new FormData();
    formData.append('images', files[0]);

    try {
      const res = await api.post('/audits/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVisitImage(res.data.urls[0]);
    } catch (err) {
      console.error(err);
      alert('Failed to upload visit photo. Check image formats & size.');
    } finally {
      setUploadingVisitPhoto(false);
    }
  };

  const handleImageUpload = async (questionId, e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage({ ...uploadingImage, [questionId]: true });
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      const res = await api.post('/audits/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const currentImages = answers[questionId]?.images || [];
      handleAnswerChange(questionId, null, null, [...currentImages, ...res.data.urls]);
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please check size limits.');
    } finally {
      setUploadingImage({ ...uploadingImage, [questionId]: false });
    }
  };

  const handleRemoveImage = (questionId, imgUrl) => {
    const currentImages = answers[questionId]?.images || [];
    const nextImages = currentImages.filter((img) => img !== imgUrl);
    handleAnswerChange(questionId, null, null, nextImages);
  };

  const handleSubmitAudit = async () => {
    setSubmitError('');

    // Visit photo validation
    if (!visitImage) {
      setSubmitError('Please capture/upload the mandatory geotagged visit photo to verify your presence at the place.');
      return;
    }

    // Form validation
    const missingMandatory = [];
    assignment.location.checklist.forEach((q) => {
      const ans = answers[q.questionId];
      if (q.isRequired) {
        if (!ans || !ans.value || (q.type === 'Image' && (!ans.images || ans.images.length === 0))) {
          missingMandatory.push(q.question);
        }
      }
    });

    if (missingMandatory.length > 0) {
      setSubmitError(`Please complete all mandatory parameters: \n- ${missingMandatory.join('\n- ')}`);
      return;
    }

    // Prepare answers JSON structure
    const formattedAnswers = Object.keys(answers).map((key) => ({
      questionId: key,
      value: answers[key].value,
      remarks: answers[key].remarks,
      images: answers[key].images || []
    }));

    const auditPayload = {
      assignmentId: id,
      answers: formattedAnswers,
      visitImage,
      gps: {
        latitude: activeCoords.latitude,
        longitude: activeCoords.longitude,
        accuracy: activeCoords.accuracy || 10
      },
      startTime: startTimeRef.current,
      device: navigator.userAgent,
      ip: '127.0.0.1',
      strictMode: false
    };

    if (!isOnline) {
      // Offline Save Queueing
      const offlineQueue = JSON.parse(localStorage.getItem('offline_audit_queue') || '[]');
      offlineQueue.push(auditPayload);
      localStorage.setItem('offline_audit_queue', JSON.stringify(offlineQueue));
      
      // Update status locally
      localStorage.removeItem(`audit_draft_${id}`);
      localStorage.removeItem(`audit_visit_image_${id}`);
      alert('Network offline. Inspection saved locally in Sync Queue. It will automatically submit when network resumes.');
      navigate('/auditor-dashboard');
      return;
    }

    try {
      const res = await api.post('/audits/submit', auditPayload);
      
      // Clean up Draft
      localStorage.removeItem(`audit_draft_${id}`);
      localStorage.removeItem(`audit_visit_image_${id}`);
      
      // Send completed socket status update
      sendLocationUpdate(activeCoords.latitude, activeCoords.longitude, activeCoords.accuracy || 5, 'Completed', id);
      
      alert(`Audit Submitted! Compliance Score: ${res.data.complianceScore}%`);
      navigate('/auditor-dashboard');
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Error occurred during final submission.');
    }
  };

  // Sync Offline Queue automatically if network restored
  useEffect(() => {
    if (isOnline) {
      const syncOfflineQueue = async () => {
        const queue = JSON.parse(localStorage.getItem('offline_audit_queue') || '[]');
        if (queue.length === 0) return;

        console.log('Online detected. Syncing offline submissions...');
        
        for (const item of queue) {
          try {
            await api.post('/audits/submit', item);
          } catch (err) {
            console.error('Failed to sync offline item', err);
          }
        }
        
        localStorage.removeItem('offline_audit_queue');
        alert('All offline inspection results successfully synced to institutional portal.');
      };
      
      syncOfflineQueue();
    }
  }, [isOnline]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading inspection parameters...</div>;
  if (!assignment) return <div className="card" style={{ color: 'red', textAlign: 'center' }}>Inspection details unavailable.</div>;

  const isLocked = ['Submitted', 'Approved'].includes(assignment.status);

  if (isLocked) {
    return (
      <div className="card shadow-sm" style={{ maxWidth: '600px', margin: '3rem auto', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ color: '#ffc107', fontSize: '3rem', marginBottom: '1rem' }}><FiLock /></div>
        <h2 style={{ color: '#002B49', margin: '0 0 1rem 0', fontSize: '1.5rem' }}>Inspection Record Locked</h2>
        <p style={{ color: '#6c757d', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '2rem' }}>
          This infrastructure inspection report has already been submitted to the estate coordinator cell for review.
          You cannot edit or submit additional checklist parameters for this allocation.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/auditor-dashboard')}>
          Back to Auditor Desk
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#002B49' }}>Field Inspection Form</h2>
          <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>
            {assignment.location.name} - ({assignment.location.code})
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isOnline ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#198754', fontWeight: 600, fontSize: '0.85rem' }}>
              <FiWifi /> Portal Connected
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#dc3545', fontWeight: 600, fontSize: '0.85rem' }}>
              <FiWifiOff /> Offline Mode Enabled
            </span>
          )}
          <span style={{ color: '#6c757d', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FiSave /> {saveStatus}
          </span>
        </div>
      </div>

      {/* Fitness Certificate Banner (if uploaded by admin) */}
      {assignment.location?.fitnessCertificateUrl && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
          background: 'linear-gradient(135deg, #e8eef8, #f0f4fa)',
          border: '1.5px solid #b8ccec',
          borderRadius: 8, marginBottom: '1.25rem', fontSize: '0.85rem'
        }}>
          <span style={{ fontSize: '1.4rem' }}>📋</span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#003580', display: 'block' }}>Fitness Certificate Available</strong>
            <span style={{ color: '#5a6a80', fontSize: '0.78rem' }}>
              Admin has uploaded a fitness certificate for this location. Review it before starting the inspection.
            </span>
          </div>
          <a
            href={`http://localhost:5000${assignment.location.fitnessCertificateUrl}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 6, background: '#003580',
              color: '#fff', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none',
              whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,53,128,0.3)'
            }}
          >
            ↓ Download
          </a>
        </div>
      )}

      {/* QR VERIFICATION STEP */}
      {!qrVerified ? (
        <div className="card shadow-sm" style={{ maxWidth: '500px', margin: '2rem auto', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#002B49', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            Verification Required
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '1.5rem' }}>
            Please scan or input the QR code verification tag affixed to the entrance of {assignment.location.name}.
          </p>
          
          <form onSubmit={handleQrSubmit}>
            <div className="form-group">
              <label className="form-label">Input QR Verification Token</label>
              <input
                type="text"
                className="form-control"
                placeholder="ROOM_VERIFY_..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                required
              />
              {qrError && <span className="form-error">{qrError}</span>}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Verify Token
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleSimulateQr}>
                Simulate QR Scan
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ACTIVE AUDIT CONTENT */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* CHECKLIST QUESTIONS FORM */}
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '0.75rem', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
              Checklist Parameters
            </h3>

            {submitError && (
              <div style={{ backgroundColor: '#f8d7da', color: '#842029', padding: '15px', borderRadius: '3px', fontSize: '0.85rem', marginBottom: '1.5rem', whiteSpace: 'pre-line', border: '1px solid #f5c2c7' }}>
                <FiAlertTriangle style={{ marginRight: '6px' }} /> {submitError}
              </div>
            )}

            {/* Geotagged Visit Photo Upload Section */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '2rem', border: '1px solid #e9ecef' }}>
              <label className="form-label" style={{ marginBottom: '4px', fontSize: '0.95rem' }}>
                Geotagged Visit Photo <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <p style={{ fontSize: '0.8rem', color: '#6c757d', margin: '0 0 12px 0' }}>
                Capture or upload a live photo of this facility to verify your physical presence.
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label className="btn btn-secondary" style={{ margin: 0, padding: '6px 12px', fontSize: '0.8rem' }}>
                  <FiCamera /> Capture Visit Photo
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleVisitImageUpload}
                    disabled={uploadingVisitPhoto}
                  />
                </label>
                {uploadingVisitPhoto && <span style={{ fontSize: '0.8rem', color: '#0B5ED7' }}>Uploading...</span>}
              </div>
              {visitImage && (
                <div style={{ marginTop: '12px', position: 'relative', width: '150px', height: '110px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                  <img src={visitImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Geotagged Visit" />
                  <button
                    type="button"
                    onClick={() => setVisitImage('')}
                    style={{ position: 'absolute', top: '0', right: '0', background: 'rgba(220,53,69,0.85)', color: 'white', border: 'none', width: '22px', height: '22px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {assignment.location.checklist.map((q) => {
                const ans = answers[q.questionId] || { value: '', remarks: '', images: [] };
                
                return (
                  <div key={q.questionId} style={{ borderBottom: '1px solid #f1f1f1', paddingBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <label className="form-label" style={{ margin: 0, fontSize: '0.95rem' }}>
                        {q.question} {q.isRequired && <span style={{ color: '#dc3545' }}>*</span>}
                      </label>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Weight: {q.weightage}</span>
                    </div>

                    {/* DYNAMIC INPUTS BASED ON QUESTION TYPE */}
                    {q.type === 'Yes/No' && (
                      <div style={{ display: 'flex', gap: '1.5rem', margin: '0.5rem 0' }}>
                        <label className="form-checkbox">
                          <input
                            type="radio"
                            name={`radio_${q.questionId}`}
                            value="Yes"
                            checked={ans.value === 'Yes'}
                            onChange={() => handleAnswerChange(q.questionId, 'Yes')}
                          />
                          <span>Yes (Pass)</span>
                        </label>
                        <label className="form-checkbox">
                          <input
                            type="radio"
                            name={`radio_${q.questionId}`}
                            value="No"
                            checked={ans.value === 'No'}
                            onChange={() => handleAnswerChange(q.questionId, 'No')}
                          />
                          <span>No (Fail)</span>
                        </label>
                      </div>
                    )}

                    {q.type === 'Rating' && (
                      <div style={{ display: 'flex', gap: '5px', margin: '0.5rem 0' }}>
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleAnswerChange(q.questionId, val.toString())}
                            style={{
                              padding: '5px 12px',
                              border: '1px solid #ddd',
                              background: ans.value === val.toString() ? '#0B5ED7' : '#ffffff',
                              color: ans.value === val.toString() ? '#ffffff' : '#333333',
                              cursor: 'pointer',
                              borderRadius: '3px',
                              fontWeight: '600'
                            }}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'Dropdown' && (
                      <div style={{ margin: '0.5rem 0' }}>
                        <select
                          className="form-control"
                          value={ans.value}
                          onChange={(e) => handleAnswerChange(q.questionId, e.target.value)}
                        >
                          <option value="">-- Choose Option --</option>
                          {q.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {q.type === 'Text' && (
                      <div style={{ margin: '0.5rem 0' }}>
                        <input
                           type="text"
                           className="form-control"
                           placeholder="Type answer details..."
                           value={ans.value}
                           onChange={(e) => handleAnswerChange(q.questionId, e.target.value)}
                        />
                      </div>
                    )}

                    {/* Image Attachment Input (Always available or dynamic) */}
                    {q.type === 'Image' ? (
                      <div style={{ margin: '0.5rem 0' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <label className="btn btn-secondary" style={{ margin: 0, padding: '5px 10px', fontSize: '0.8rem' }}>
                            <FiCamera /> Capture / Upload Photos
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleImageUpload(q.questionId, e)}
                              disabled={uploadingImage[q.questionId]}
                            />
                          </label>
                          {uploadingImage[q.questionId] && <span style={{ fontSize: '0.8rem', color: '#0B5ED7' }}>Uploading...</span>}
                        </div>

                        {/* Image Previews */}
                        {ans.images && ans.images.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                            {ans.images.map((img) => (
                              <div key={img} style={{ position: 'relative', width: '70px', height: '70px', border: '1px solid #ccc', borderRadius: '3px', overflow: 'hidden' }}>
                                <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Inspection attached file" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(q.questionId, img)}
                                  style={{ position: 'absolute', top: '0', right: '0', background: 'rgba(220,53,69,0.85)', color: 'white', border: 'none', width: '18px', height: '18px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Common observation comment input for non-text parameters */
                      <div style={{ marginTop: '0.5rem' }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                          placeholder="Observations / Remarks (Optional)"
                          value={ans.remarks}
                          onChange={(e) => handleAnswerChange(q.questionId, null, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => navigate('/auditor-dashboard')}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmitAudit}>
                Submit Inspection Report
              </button>
            </div>
          </div>

          {/* SIDEBAR: GPS GEOLOCATION & RADIUS MAP */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Geofence Status Card */}
            <div className="card" style={{ margin: 0, padding: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>GPS Geofence Status</h4>
              
              {gpsError ? (
                <div style={{ backgroundColor: '#fff3cd', color: '#664d03', padding: '8px', borderRadius: '3px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FiAlertTriangle /> {gpsError}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem' }}>Verification:</span>
                    {activeIsInside ? (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}><FiCheck /> Location Verified</span>
                    ) : (
                      <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}><FiAlertTriangle /> Outside Boundary</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>Distance to Target:</span>
                    <strong>{activeDistance !== null ? `${Math.round(activeDistance)} meters` : 'Calculating...'}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>Allowed Radius:</span>
                    <strong>{assignment.location.radius} meters</strong>
                  </div>

                  <div style={{ borderTop: '1px solid #eee', paddingTop: '8px', marginTop: '4px' }}>
                    <label className="form-checkbox" style={{ fontSize: '0.75rem' }}>
                      <input
                        type="checkbox"
                        checked={gpsSimulated}
                        onChange={(e) => setGpsSimulated(e.target.checked)}
                      />
                      <span>Override coordinates (Simulation)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* LEAFLET MAP VIEW */}
            {activeCoords.latitude && (
              <div className="card" style={{ margin: 0, padding: 0, height: '220px', overflow: 'hidden', borderRadius: '5px', border: '1px solid #ccc' }}>
                <MapContainer
                  center={[assignment.location.latitude, assignment.location.longitude]}
                  zoom={16}
                  style={{ width: '100%', height: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  {/* Building Center marker */}
                  <Marker position={[assignment.location.latitude, assignment.location.longitude]} icon={buildingIcon}>
                    <Popup>{assignment.location.name} (Target)</Popup>
                  </Marker>

                  {/* Auditor marker */}
                  <Marker position={[activeCoords.latitude, activeCoords.longitude]} icon={auditorIcon}>
                    <Popup>Your Coordinates</Popup>
                  </Marker>

                  {/* Circle allowed fence */}
                  <Circle
                    center={[assignment.location.latitude, assignment.location.longitude]}
                    radius={assignment.location.radius}
                    pathOptions={{ color: '#0B5ED7', fillColor: '#0B5ED7', fillOpacity: 0.15 }}
                  />
                </MapContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveAudit;
