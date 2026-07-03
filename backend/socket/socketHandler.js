import User from '../models/User.js';

const activeAuditors = new Map(); // Store userId -> socketId and location details

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    // Join specialized rooms based on role / user id
    socket.on('register', async (data) => {
      const { userId, role } = data;
      if (!userId) return;

      socket.userId = userId;
      socket.role = role;

      console.log(`User registered: ${userId} with role ${role}`);

      // If user is auditor, mark them online and notify admins
      if (role === 'Auditor') {
        activeAuditors.set(userId, {
          socketId: socket.id,
          location: null,
          status: 'Online',
          lastUpdate: new Date(),
        });

        await User.findByIdAndUpdate(userId, { isOnline: true, lastActive: new Date() });
        
        // Broadcast auditor online event to admins
        io.to('admins').emit('auditorStatusChanged', {
          userId,
          status: 'Online',
        });
      }

      // Add to rooms
      if (role === 'Admin' || role === 'Super Admin') {
        socket.join('admins');
      }
      socket.join(`user_${userId}`);
    });

    // Handle incoming live location logs from active audit screens
    socket.on('updateLocation', async (data) => {
      const { userId, latitude, longitude, accuracy, status, assignmentId } = data;
      if (!userId) return;

      console.log(`Location update from Auditor ${userId}:`, { latitude, longitude, status });

      if (activeAuditors.has(userId)) {
        const auditor = activeAuditors.get(userId);
        auditor.location = { latitude, longitude, accuracy };
        auditor.status = status || 'Inspecting'; // Online, Inspecting, Completed
        auditor.lastUpdate = new Date();
        activeAuditors.set(userId, auditor);
      }

      // Fetch Auditor Details
      const user = await User.findById(userId).select('username profile');
      const username = user ? user.username : 'Unknown Auditor';

      // Forward live coordinates to Admins
      io.to('admins').emit('liveLocationUpdate', {
        userId,
        username,
        latitude,
        longitude,
        accuracy,
        status: status || 'Inspecting',
        assignmentId,
        timestamp: new Date(),
      });
    });

    // Handle manual disconnect or connection losses
    socket.on('disconnect', async () => {
      console.log(`Socket Disconnected: ${socket.id}`);
      
      if (socket.userId && socket.role === 'Auditor') {
        activeAuditors.delete(socket.userId);
        
        await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastActive: new Date() });

        // Notify admins that the auditor went offline
        io.to('admins').emit('auditorStatusChanged', {
          userId: socket.userId,
          status: 'Offline',
        });
      }
    });
  });
};

export default socketHandler;
export { activeAuditors };
