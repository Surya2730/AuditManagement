import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { FiUsers, FiMapPin, FiClock } from 'react-icons/fi';
import '../styles/components.css';

// Fix Leaflet Marker Icon bug in Vite
const buildingIcon = new L.DivIcon({
  html: `<div style="background-color: #0b5ed7; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
  className: 'custom-pin-building',
  iconSize: [14, 14]
});

const auditorActiveIcon = new L.DivIcon({
  html: `<div style="background-color: #198754; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5); animation: pulse 1.5s infinite;"></div>`,
  className: 'custom-pin-auditor-active',
  iconSize: [16, 16]
});

const LiveTracking = () => {
  const { api } = useAuth();
  const { liveLocations } = useSocket();
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const res = await api.get('/buildings');
        setBuildings(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBuildings();
  }, []);

  const auditorList = Array.from(liveLocations.values());

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#002B49' }}>Live Location Tracking Console</h2>
        <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>Real-time spatial visualization of field inspectors and estate zones</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* ACTIVE INSPECTORS DIRECTORY */}
        <div className="card" style={{ margin: 0, padding: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FiUsers /> Active Inspectors ({auditorList.length})
          </h3>

          <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {auditorList.map((aud) => (
              <li key={aud.userId} style={{ borderBottom: '1px solid #f1f1f1', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{aud.username}</strong>
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{aud.status}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FiMapPin /> Lat: {aud.latitude.toFixed(5)}, Lng: {aud.longitude.toFixed(5)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <FiClock /> Active: {new Date(aud.timestamp).toLocaleTimeString()}
                </div>
              </li>
            ))}
            {auditorList.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6c757d', padding: '1.5rem', fontSize: '0.85rem' }}>
                No active inspectors currently reporting locations.
              </div>
            )}
          </ul>
        </div>

        {/* MAP VISUALIZATION SCREEN */}
        {loading ? (
          <div className="card" style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Loading spatial coordinates...
          </div>
        ) : (
          <div className="card" style={{ margin: 0, padding: 0, height: '75vh', overflow: 'hidden', border: '1px solid #dee2e6' }}>
            <MapContainer
              center={[12.971598, 77.594562]} // Default center coords (aligned to seed data)
              zoom={16}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              
              {/* Render fixed Buildings with allowed fence circles */}
              {buildings.map((b) => (
                <React.Fragment key={b._id}>
                  <Marker position={[b.latitude, b.longitude]} icon={buildingIcon}>
                    <Popup>
                      <strong>{b.name}</strong>
                      <br />Campus: {b.campus}
                      <br />Radius: {b.radius}m
                    </Popup>
                  </Marker>
                  <Circle
                    center={[b.latitude, b.longitude]}
                    radius={b.radius}
                    pathOptions={{ color: '#0B5ED7', fillColor: '#0B5ED7', fillOpacity: 0.08 }}
                  />
                </React.Fragment>
              ))}

              {/* Render moving Auditor locations */}
              {auditorList.map((aud) => (
                <Marker key={aud.userId} position={[aud.latitude, aud.longitude]} icon={auditorActiveIcon}>
                  <Popup>
                    <strong>Auditor: {aud.username}</strong>
                    <br />Status: {aud.status}
                    <br />Accuracy: {aud.accuracy.toFixed(1)}m
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTracking;
