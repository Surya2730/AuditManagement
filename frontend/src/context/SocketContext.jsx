import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [liveLocations, setLiveLocations] = useState(new Map()); // userId -> Location details for Admin Map

  useEffect(() => {
    // If user is logged out, disconnect any existing socket
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // If socket is already connected for the same user, do nothing
    if (socketRef.current && socketRef.current.userId === user._id) {
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const socketConnection = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: {
        token: localStorage.getItem('accessToken') || null,
      },
    });

    socketConnection.userId = user._id;

    socketConnection.on('connect', () => {
      console.log('Socket Connected to Server', socketConnection.id);
      socketConnection.emit('register', {
        userId: user._id,
        role: user.role,
      });
    });

    socketConnection.on('connect_error', (err) => {
      console.warn('Socket connect_error', err.message || err);
    });

    socketConnection.on('disconnect', (reason) => {
      console.log('Socket Disconnected from Server', reason);
    });

    socketConnection.on('reconnect_attempt', (attempt) => {
      console.log('Socket reconnect attempt', attempt);
    });

    socketConnection.on('reconnect_failed', () => {
      console.error('Socket reconnection failed permanently');
    });

    socketConnection.on('notification', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    if (user.role === 'Admin' || user.role === 'Super Admin') {
      socketConnection.on('liveLocationUpdate', (data) => {
        setLiveLocations((prev) => {
          const next = new Map(prev);
          next.set(data.userId, data);
          return next;
        });
      });

      socketConnection.on('auditorStatusChanged', (data) => {
        setLiveLocations((prev) => {
          const next = new Map(prev);
          if (data.status === 'Offline') {
            next.delete(data.userId);
          } else {
            const existing = next.get(data.userId) || {};
            next.set(data.userId, { ...existing, status: data.status });
          }
          return next;
        });
      });
    }

    socketRef.current = socketConnection;
    setSocket(socketConnection);

    return () => {
      socketConnection.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // Auditor sends live coordinates to server
  const sendLocationUpdate = (latitude, longitude, accuracy, status, assignmentId) => {
    if (socket && user && user.role === 'Auditor') {
      socket.emit('updateLocation', {
        userId: user._id,
        latitude,
        longitude,
        accuracy,
        status, // Online, Inspecting, Completed
        assignmentId,
      });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, setNotifications, liveLocations, sendLocationUpdate }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
