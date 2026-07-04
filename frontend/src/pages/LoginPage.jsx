import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/components.css';

const LoginPage = () => {
  const { login, api } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Auditor');
  const [rememberMe, setRememberMe] = useState(false);

  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    const res = await login(username, password, role);
    setSubmitting(false);

    if (res.success) {
      if (role === 'Auditor') {
        navigate('/auditor-dashboard');
      } else {
        navigate('/admin-dashboard');
      }
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setForgotSuccess('');
    setSubmitting(true);

    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess(res.data.message);
      setForgotEmail('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card shadow-md" style={{ width: '100%', maxWidth: '420px', padding: '2rem', margin: 0 }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            width: '60px',
            height: '60px',
            backgroundColor: '#0B5ED7',
            color: '#FFFFFF',
            borderRadius: '5px',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '0.75rem',
            letterSpacing: '1px',
          }}
        >
          BIT
        </div>
        <h2 style={{ fontSize: '1.1rem', color: '#002B49', margin: '0 0 4px 0', fontWeight: '700' }}>
          BANNARI AMMAN INSTITUTE OF TECHNOLOGY
        </h2>
        <p style={{ fontSize: '0.78rem', color: '#6c757d', margin: 0 }}>
          Infrastructure Audit & Quality Cell — ERP Portal
        </p>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#f8d7da', color: '#842029', padding: '10px', borderRadius: '3px', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid #f5c2c7' }}>
          {errorMsg}
        </div>
      )}

      {forgotSuccess && (
        <div style={{ backgroundColor: '#d1e7dd', color: '#0f5132', padding: '10px', borderRadius: '3px', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid #badbcc' }}>
          {forgotSuccess}
        </div>
      )}

      {!isForgot ? (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username / Employee ID</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter your BIT system username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="Admin">Admin</option>
              <option value="Auditor">Auditor</option>
            </select>
          </div>

          <div className="form-group justify-between align-center flex" style={{ fontSize: '0.85rem' }}>
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => { setIsForgot(true); setErrorMsg(''); }}
              style={{ background: 'none', border: 'none', color: '#0B5ED7', cursor: 'pointer', padding: 0 }}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-2"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In to BIT ERP Portal'}
          </button>

          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f7f9fc', borderRadius: '4px', fontSize: '0.78rem', color: '#6c757d', border: '1px solid #dee2e6' }}>
            <strong style={{ color: '#0B5ED7' }}>Demo Credentials</strong><br />
            Admin: <code>bit_admin</code> / <code>Admin@BIT2025</code><br />
            Auditor: <code>auditor_priya</code> / <code>Auditor@BIT2</code>
          </div>
        </form>
      ) : (
        <form onSubmit={handleForgotSubmit}>
          <p style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '1.25rem' }}>
            Enter your registered BIT email to receive a password reset link.
          </p>

          <div className="form-group">
            <label className="form-label">BIT Official Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. name@bitsathy.ac.in"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-2"
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Request Password Reset'}
          </button>

          <button
            type="button"
            onClick={() => { setIsForgot(false); setErrorMsg(''); }}
            className="btn btn-outline w-full mt-2"
          >
            Return to Sign-In
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginPage;
