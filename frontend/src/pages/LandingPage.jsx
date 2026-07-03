import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/layout.css';
import '../styles/components.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-logo-container">
          <div className="landing-logo">BIT</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>BANNARI AMMAN INSTITUTE OF TECHNOLOGY</span>
            <span style={{ fontSize: '0.75rem', color: '#a5bccc' }}>Sathyamangalam — Infrastructure Audit & Quality Cell</span>
          </div>
        </div>
        <Link to="/login" className="btn btn-secondary">
          ERP Portal Login
        </Link>
      </header>

      {/* Hero Body */}
      <main className="landing-hero">
        <div className="hero-text">
          <h2 style={{ fontSize: '1.2rem', color: '#0B5ED7', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
            Estate & Quality Assurance Cell — BIT
          </h2>
          <h1>AI-Enabled Smart Infrastructure Audit &amp; Live Location Verification System</h1>
          <p>
            An enterprise-level institutional portal for continuous monitoring, verification,
            and assessment of campus physical infrastructure at Bannari Amman Institute of Technology.
            Integrates GPS geofencing to ensure on-site auditor validation and automated compliance reporting.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
              Access ERP Audit Console
            </Link>
          </div>
        </div>

        {/* Technical Features Sidebar Card */}
        <div className="card" style={{ flex: '0 0 380px', margin: 0, padding: '1.5rem', backgroundColor: '#ffffff' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '2px solid #0B5ED7', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            Campus Locations Under Audit
          </h3>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: 0, listStyle: 'none' }}>
            {[
              { code: 'BIT-MC', name: 'Medical Center', desc: 'Campus health facility audit' },
              { code: 'BIT-GH', name: 'A1 Guest House', desc: 'Guest house readiness inspection' },
              { code: 'BIT-CRS', name: 'Community Radio Station', desc: 'Equipment & broadcast compliance' },
              { code: 'BIT-RD', name: 'Research & Development', desc: 'Lab safety & infrastructure audit' },
              { code: 'BIT-COE', name: 'Controller of Examinations', desc: 'Exam confidentiality & readiness' },
            ].map((loc) => (
              <li key={loc.code} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{
                  backgroundColor: '#EAF3FF',
                  color: '#0B5ED7',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  marginTop: '2px',
                }}>{loc.code}</span>
                <div>
                  <strong style={{ fontSize: '0.9rem' }}>{loc.name}</strong>
                  <p style={{ fontSize: '0.78rem', color: '#6c757d', margin: '2px 0 0 0' }}>{loc.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2025 Bannari Amman Institute of Technology, Sathyamangalam. All Rights Reserved. | Estate & Quality Management Portal</p>
      </footer>
    </div>
  );
};

export default LandingPage;
