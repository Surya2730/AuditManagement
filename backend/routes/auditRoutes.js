import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  logGPSPing,
  submitAuditResponse,
  reviewAuditResponse,
  getAuditResponses,
  getAuditResponseById,
  getGPSLogs,
  getLivePositions,
  getAnalytics,
  getNotifications,
  markNotificationRead,
} from '../controllers/auditController.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Upload route
router.post('/upload', protect, upload.array('images', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const urls = req.files.map(file => `/uploads/${file.filename}`);
    res.json({ urls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GPS Tracking
router.post('/gps-log', protect, logGPSPing);
router.get('/gps-logs/:assignmentId', protect, adminOnly, getGPSLogs);
router.get('/live-positions', protect, adminOnly, getLivePositions);

// Audit Submission
router.post('/submit', protect, submitAuditResponse);
router.post('/:id/review', protect, adminOnly, reviewAuditResponse);

// Reports
router.get('/responses', protect, getAuditResponses);
router.get('/responses/:id', protect, getAuditResponseById);

// Analytics
router.get('/analytics', protect, adminOnly, getAnalytics);

// Notifications
router.get('/notifications', protect, getNotifications);
router.put('/notifications/:id/read', protect, markNotificationRead);

export default router;
