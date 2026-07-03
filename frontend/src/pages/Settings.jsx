import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiLock, FiCheck } from 'react-icons/fi';
import '../styles/components.css';

const Settings = () => {
  const { user, updateProfile } = useAuth();

  // Profile Form States
  const [fullName, setFullName] = useState(user.profile?.fullName || '');
  const [designation, setDesignation] = useState(user.profile?.designation || '');
  const [department, setDepartment] = useState(user.profile?.department || '');
  const [phone, setPhone] = useState(user.profile?.phone || '');
  const [email, setEmail] = useState(user.email || '');

  // Password States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    const payload = {
      email,
      profile: { fullName, designation, department, phone }
    };

    const res = await updateProfile(payload);
    setSubmitting(false);

    if (res.success) {
      setSuccessMsg('Profile settings successfully updated.');
    } else {
      setErrorMsg(res.message);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const res = await updateProfile({ password: newPassword });
    setSubmitting(false);

    if (res.success) {
      setSuccessMsg('Security password successfully updated.');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#002B49' }}>Account settings</h2>
        <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>Manage profile details, credentials, and configurations</span>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#f8d7da', color: '#842029', padding: '10px', borderRadius: '3px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ backgroundColor: '#d1e7dd', color: '#0f5132', padding: '10px', borderRadius: '3px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          <FiCheck style={{ marginRight: '5px' }} /> {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Profile Card */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiUser /> Profile Details
          </h3>
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <input
                  type="text"
                  className="form-control"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="form-control"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input
                type="text"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary mt-2" disabled={submitting}>
              {submitting ? 'Updating...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Password Security Card */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiLock /> Portal Security
          </h3>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary mt-2" disabled={submitting}>
              {submitting ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
