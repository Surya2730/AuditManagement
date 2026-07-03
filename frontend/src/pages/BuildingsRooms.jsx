import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiTrash2, FiMapPin } from 'react-icons/fi';
import '../styles/components.css';

const BuildingsRooms = () => {
  const { api } = useAuth();
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Building Form
  const [bldOpen, setBldOpen] = useState(false);
  const [bName, setBName] = useState('');
  const [bCampus, setBCampus] = useState('Main Campus');
  const [bLat, setBLat] = useState('');
  const [bLng, setBLng] = useState('');
  const [bRadius, setBRadius] = useState(50);
  
  // Room Form
  const [roomOpen, setRoomOpen] = useState(false);
  const [rNumber, setRNumber] = useState('');
  const [rBlock, setRBlock] = useState('');
  const [rFloor, setRFloor] = useState('');
  const [rType, setRType] = useState('Classroom');

  const [errorMsg, setErrorMsg] = useState('');

  const fetchBuildings = async () => {
    try {
      const res = await api.get('/buildings');
      setBuildings(res.data);
      if (res.data.length > 0) {
        setSelectedBuilding(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!bName.trim() || !bLat || !bLng) {
      setErrorMsg('Please populate Building Name, Latitude, and Longitude.');
      return;
    }

    try {
      const res = await api.post('/buildings', {
        name: bName,
        campus: bCampus,
        latitude: parseFloat(bLat),
        longitude: parseFloat(bLng),
        radius: parseInt(bRadius) || 50,
        rooms: []
      });

      setBuildings([...buildings, res.data]);
      setSelectedBuilding(res.data);
      setBldOpen(false);
      resetBldForm();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error creating building.');
    }
  };

  const handleDeleteBuilding = async (id) => {
    if (!window.confirm('Are you sure you want to delete this building and all its rooms?')) return;
    try {
      await api.delete(`/buildings/${id}`);
      const nextBuildings = buildings.filter((b) => b._id !== id);
      setBuildings(nextBuildings);
      setSelectedBuilding(nextBuildings.length > 0 ? nextBuildings[0] : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!rNumber.trim()) {
      setErrorMsg('Please specify Room Number.');
      return;
    }

    try {
      const res = await api.post(`/buildings/${selectedBuilding._id}/rooms`, {
        roomNumber: rNumber,
        block: rBlock,
        floor: rFloor,
        roomType: rType
      });

      // Update building state
      const nextBuildings = buildings.map((b) => (b._id === selectedBuilding._id ? res.data : b));
      setBuildings(nextBuildings);
      setSelectedBuilding(res.data);
      setRoomOpen(false);
      resetRoomForm();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Room duplicate or creation error.');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Delete this room checkpoint?')) return;
    try {
      const res = await api.delete(`/buildings/${selectedBuilding._id}/rooms/${roomId}`);
      const nextBuildings = buildings.map((b) => (b._id === selectedBuilding._id ? res.data.building : b));
      setBuildings(nextBuildings);
      setSelectedBuilding(res.data.building);
    } catch (err) {
      console.error(err);
    }
  };

  const resetBldForm = () => {
    setBName('');
    setBCampus('Main Campus');
    setBLat('');
    setBLng('');
    setBRadius(50);
    setErrorMsg('');
  };

  const resetRoomForm = () => {
    setRNumber('');
    setRBlock('');
    setRFloor('');
    setRType('Classroom');
    setErrorMsg('');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#002B49' }}>Estate Infrastructure Console</h2>
          <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>Manage university buildings, blocks, and GPS fences</span>
        </div>
        <button className="btn btn-primary" onClick={() => setBldOpen(true)}>
          <FiPlus /> Add Building
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading building maps...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
          {/* BUILDINGS LIST */}
          <div className="card" style={{ padding: '1rem', margin: 0, maxHeight: '70vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Buildings</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {buildings.map((b) => (
                <li key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedBuilding(b)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      textAlign: 'left',
                      border: 'none',
                      background: selectedBuilding?._id === b._id ? '#EAF3FF' : 'none',
                      color: selectedBuilding?._id === b._id ? '#0B5ED7' : '#333',
                      fontWeight: selectedBuilding?._id === b._id ? '600' : 'normal',
                      cursor: 'pointer',
                      borderRadius: '3px'
                    }}
                  >
                    {b.name}
                  </button>
                  <button
                    onClick={() => handleDeleteBuilding(b._id)}
                    style={{ border: 'none', background: 'none', color: '#dc3545', padding: '10px', cursor: 'pointer' }}
                    title="Delete Building"
                  >
                    <FiTrash2 />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* BUILDING ROOM DETAILS */}
          <div className="card" style={{ margin: 0 }}>
            {selectedBuilding ? (
              <div>
                <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#002B49' }}>{selectedBuilding.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '4px' }}>
                      Campus: {selectedBuilding.campus} | Geofence allowed radius: {selectedBuilding.radius}m
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#0b5ed7', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <FiMapPin /> Coordinates: {selectedBuilding.latitude.toFixed(6)}, {selectedBuilding.longitude.toFixed(6)}
                    </p>
                  </div>
                  <button className="btn btn-secondary" onClick={() => setRoomOpen(true)}>
                    <FiPlus /> Add Room Checkpoint
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Room Number</th>
                        <th>Block</th>
                        <th>Floor</th>
                        <th>Room Type</th>
                        <th>Verification QR Token</th>
                        <th style={{ width: '80px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBuilding.rooms.map((r) => (
                        <tr key={r._id}>
                          <td><strong>{r.roomNumber}</strong></td>
                          <td>{r.block || '-'}</td>
                          <td>{r.floor || '-'}</td>
                          <td>{r.roomType}</td>
                          <td>
                            <code style={{ fontSize: '0.75rem', backgroundColor: '#f1f1f1', padding: '2px 6px', borderRadius: '3px' }}>
                              {r.qrCode || `ROOM_VERIFY_${selectedBuilding.name.replace(/\s+/g,'_')}_${r.roomNumber.replace(/\s+/g,'_')}`}
                            </code>
                          </td>
                          <td>
                            <button
                              onClick={() => handleDeleteRoom(r._id)}
                              style={{ border: 'none', background: 'none', color: '#dc3545', cursor: 'pointer' }}
                              title="Delete Room"
                            >
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {selectedBuilding.rooms.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: '#6c757d' }}>No room checkpoints registered. Click 'Add Room Checkpoint' to create.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6c757d', padding: '2rem' }}>
                Select a building to configure room parameters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE BUILDING MODAL */}
      {bldOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Register New Building</h3>
              <button className="close-btn" onClick={() => setBldOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateBuilding}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{ backgroundColor: '#f8d7da', color: '#842029', padding: '10px', borderRadius: '3px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {errorMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Building / Structure Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Ramanujan Block, CV Raman Lab"
                    value={bName}
                    onChange={(e) => setBName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Campus Name</label>
                  <select
                    className="form-control"
                    value={bCampus}
                    onChange={(e) => setBCampus(e.target.value)}
                  >
                    <option value="Main Campus">Main Campus</option>
                    <option value="South Campus">South Campus</option>
                    <option value="Medical Campus">Medical Campus</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">GPS Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="e.g. 12.971598"
                      value={bLat}
                      onChange={(e) => setBLat(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GPS Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="e.g. 77.594562"
                      value={bLng}
                      onChange={(e) => setBLng(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Geofence Allowed Radius (Meters)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="50"
                    value={bRadius}
                    onChange={(e) => setBRadius(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>Auditors must be within this distance from coordinates to submit audits.</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setBldOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Building Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ROOM MODAL */}
      {roomOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Add Room Checkpoint to {selectedBuilding.name}</h3>
              <button className="close-btn" onClick={() => setRoomOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateRoom}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{ backgroundColor: '#f8d7da', color: '#842029', padding: '10px', borderRadius: '3px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {errorMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Room Number / Room Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. LH-205, CHEM-LAB-1"
                    value={rNumber}
                    onChange={(e) => setRNumber(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Block / Wing</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. A Wing"
                      value={rBlock}
                      onChange={(e) => setRBlock(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Floor</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 2nd Floor"
                      value={rFloor}
                      onChange={(e) => setRFloor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Room Type Category</label>
                  <select
                    className="form-control"
                    value={rType}
                    onChange={(e) => setRType(e.target.value)}
                  >
                    <option value="Classroom">Classroom</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Library">Library</option>
                    <option value="Seminar Hall">Seminar Hall</option>
                    <option value="Washroom">Washroom</option>
                    <option value="Electrical Room">Electrical Room</option>
                    <option value="Server Room">Server Room</option>
                    <option value="Office">Administrative Office</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setRoomOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Room</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildingsRooms;
