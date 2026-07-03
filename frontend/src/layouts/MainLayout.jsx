import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  FiGrid,
  FiFileText,
  FiCheckSquare,
  FiSettings,
  FiLogOut,
  FiUser,
  FiBell,
  FiCheck,
  FiInfo,
  FiAlertCircle,
} from 'react-icons/fi';
import '../styles/layout.css';
import '../styles/components.css';

const MainLayout = () => {
  const { user, token, loading, logout, api } = useAuth();
  const { notifications, setNotifications } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F9FC' }}>
        <div style={{ color: '#0B5ED7', fontWeight: 600, fontSize: '1.25rem' }}>Loading BIT Portal...</div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const markRead = async (id) => {
    try {
      await api.put(`/audits/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  // Sidebar Links based on role — only Admin and Auditor
  const getSidebarLinks = () => {
    const role = user.role;
    const links = [];

    if (role === 'Admin') {
      links.push(
        { path: '/admin-dashboard', label: 'Dashboard', icon: <FiGrid /> },
        { path: '/assignments', label: 'Audit Assignments', icon: <FiCheckSquare /> },
        { path: '/reports-analytics', label: 'Reports & Review', icon: <FiFileText /> },
      );
    } else if (role === 'Auditor') {
      links.push(
        { path: '/auditor-dashboard', label: 'Auditor Desk', icon: <FiGrid /> },
        { path: '/reports-analytics', label: 'My Reports', icon: <FiFileText /> },
      );
    }

    // Common for all roles
    links.push({ path: '/settings', label: 'Account Settings', icon: <FiSettings /> });

    return links;
  };

  const activeNotifications = notifications.filter((n) => !n.isRead);

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="top-navbar">
        <div className="brand-section">
          <div className="brand-logo">BIT</div>
          <div className="brand-title">
            <h1>BANNARI AMMAN INSTITUTE OF TECHNOLOGY</h1>
            <span>Smart Infrastructure Audit & Inspection System</span>
          </div>
        </div>

        <div className="nav-actions">
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative' }}
            >
              <FiBell />
              {activeNotifications.length > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#dc3545', color: '#ffffff', borderRadius: '50%', padding: '2px 5px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                  {activeNotifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div style={{ position: 'absolute', right: 0, top: '35px', width: '340px', backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '5px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, color: '#333333' }}>
                <div style={{ padding: '10px 15px', borderBottom: '1px solid #dee2e6', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f7f9fc' }}>
                  <span>Notifications</span>
                  <span style={{ fontSize: '0.85rem', color: '#0b5ed7' }}>{activeNotifications.length} Unread</span>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {activeNotifications.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>No new notifications</div>
                  ) : (
                    activeNotifications.map((n) => (
                      <div key={n._id} style={{ padding: '10px 15px', borderBottom: '1px solid #f1f1f1', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ color: n.type === 'Deviation' ? '#dc3545' : '#0b5ed7', marginTop: '2px' }}>
                          {n.type === 'Deviation' ? <FiAlertCircle /> : <FiInfo />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>{n.title}</p>
                          <p style={{ fontSize: '0.75rem', color: '#6c757d', margin: '2px 0 0 0' }}>{n.message}</p>
                        </div>
                        <button
                          onClick={() => markRead(n._id)}
                          style={{ border: 'none', background: 'none', color: '#198754', cursor: 'pointer' }}
                          title="Mark Read"
                        >
                          <FiCheck />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="user-badge-nav">
            <FiUser />
            <span>{user.profile?.fullName || user.username} | {user.role}</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="dashboard-body">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-role-badge">
            <span>{user.role === 'Admin' ? '🛡 Administrator' : '🔍 Auditor'}</span>
          </div>
          <nav className="sidebar-menu">
            {getSidebarLinks().map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`sidebar-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-college-info">
              Bannari Amman Institute of Technology<br />
              Sathyamangalam — 638401<br />
              Established 1996 · NAAC A++
            </div>
            <button onClick={handleLogout} className="logout-btn-sidebar">
              <FiLogOut />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Dynamic Route Screen */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
