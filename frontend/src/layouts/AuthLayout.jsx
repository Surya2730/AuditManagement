import React from 'react';
import { Outlet } from 'react-router-dom';
import '../styles/global.css';

const AuthLayout = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#F7F9FC',
        padding: '1.5rem',
      }}
    >
      <Outlet />
    </div>
  );
};

export default AuthLayout;
