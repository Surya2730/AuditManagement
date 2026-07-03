import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AuditorDashboard from './pages/AuditorDashboard';
import AuditCategories from './pages/AuditCategories';
import BuildingsRooms from './pages/BuildingsRooms';
import AuditAssignments from './pages/AuditAssignments';
import ActiveAudit from './pages/ActiveAudit';
import LiveTracking from './pages/LiveTracking';
import ReportsAnalytics from './pages/ReportsAnalytics';
import Settings from './pages/Settings';

// Route Guards
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F9FC' }}>
        <div style={{ color: '#0B5ED7', fontWeight: 600 }}>Loading BIT Portal...</div>
      </div>
    );
  }
  if (!user || user.role !== 'Admin') {
    return <Navigate to="/auditor-dashboard" replace />;
  }
  return children;
};

const AuditorRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F9FC' }}>
        <div style={{ color: '#0B5ED7', fontWeight: 600 }}>Loading BIT Portal...</div>
      </div>
    );
  }
  if (!user || user.role !== 'Auditor') {
    return <Navigate to="/admin-dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/landing" element={<LandingPage />} />

            {/* Auth Centered Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* Portal Protected Workspace Routes */}
            <Route element={<MainLayout />}>
              <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/auditor-dashboard" element={<AuditorRoute><AuditorDashboard /></AuditorRoute>} />
              <Route path="/categories" element={<AdminRoute><AuditCategories /></AdminRoute>} />
              <Route path="/buildings-rooms" element={<AdminRoute><BuildingsRooms /></AdminRoute>} />
              <Route path="/assignments" element={<AdminRoute><AuditAssignments /></AdminRoute>} />
              <Route path="/audit/:id" element={<AuditorRoute><ActiveAudit /></AuditorRoute>} />
              <Route path="/reports-analytics" element={<ReportsAnalytics />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Wildcard Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
