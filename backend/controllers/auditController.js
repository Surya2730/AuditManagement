import AuditResponse from '../models/AuditResponse.js';
import Assignment from '../models/Assignment.js';
import Location from '../models/Location.js';
import GPSLog from '../models/GPSLog.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';

// Haversine formula to compute distance in meters between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// @desc    Log a continuous GPS ping during an active inspection
// @route   POST /api/audits/gps-log
// @access  Private/Auditor
export const logGPSPing = async (req, res) => {
  const { assignmentId, latitude, longitude, accuracy, deviceInfo } = req.body;

  try {
    const assignment = await Assignment.findById(assignmentId).populate('location');
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Only the assigned auditor can log GPS pings
    if (assignment.auditor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const location = assignment.location;
    const distance = calculateDistance(latitude, longitude, location.latitude, location.longitude);
    const isInsideGeofence = distance <= location.radius;

    // Detect deviation: previously the auditor was inside, now outside
    const lastPing = await GPSLog.findOne({ assignment: assignmentId }).sort({ timestamp: -1 });
    const isDeviationEvent = lastPing && lastPing.isInsideGeofence && !isInsideGeofence;

    const gpsLog = await GPSLog.create({
      assignment: assignmentId,
      auditor: req.user._id,
      location: location._id,
      latitude,
      longitude,
      accuracy: accuracy || 10,
      distanceFromLocation: Math.round(distance),
      isInsideGeofence,
      isDeviationEvent,
      deviceInfo: deviceInfo || '',
    });

    // Update assignment tracking state
    if (!assignment.trackingActive) {
      assignment.trackingActive = true;
      assignment.trackingStarted = new Date();
      assignment.status = 'In Progress';
    }

    if (isDeviationEvent) {
      assignment.totalDeviationCount = (assignment.totalDeviationCount || 0) + 1;

      // Notify Admin of deviation
      const admins = await User.find({ role: 'Admin' }).select('_id');
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          title: 'GPS Deviation Alert',
          message: `Auditor ${req.user.username} has moved outside the ${location.name} geofence (${Math.round(distance)}m away)`,
          type: 'Deviation',
        });
      }
    }

    await assignment.save();

    res.status(201).json({
      logged: true,
      isInsideGeofence,
      distanceFromLocation: Math.round(distance),
      isDeviationEvent,
      locationName: location.name,
      allowedRadius: location.radius,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit an inspection report
// @route   POST /api/audits/submit
// @access  Private/Auditor
export const submitAuditResponse = async (req, res) => {
  const { assignmentId, answers, gps, startTime, device, ip, visitImage } = req.body;

  try {
    const assignment = await Assignment.findById(assignmentId).populate('location');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status === 'Submitted' || assignment.status === 'Approved') {
      return res.status(400).json({ message: 'Audit has already been submitted' });
    }

    const location = assignment.location;
    const distance = calculateDistance(gps.latitude, gps.longitude, location.latitude, location.longitude);
    const isInsideGeofence = distance <= location.radius;

    // Calculate compliance score from location-specific checklist
    const checklistQuestions = location.checklist;
    let totalWeight = 0;
    let earnedWeight = 0;

    answers.forEach((ans) => {
      const q = checklistQuestions.find((ques) => ques.questionId === ans.questionId);
      if (q) {
        const weight = q.weightage || 1;
        if (q.type === 'Yes/No') {
          totalWeight += weight;
          if (ans.value === 'Yes') earnedWeight += weight;
        } else if (q.type === 'Rating') {
          totalWeight += weight;
          const ratingVal = parseFloat(ans.value) || 0;
          earnedWeight += (ratingVal / 5) * weight;
        } else if (q.type === 'Dropdown') {
          totalWeight += weight;
          if (ans.value && !ans.value.toLowerCase().includes('not') && !ans.value.toLowerCase().includes('fail')) {
            earnedWeight += weight;
          }
        }
      }
    });

    const complianceScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100;

    // GPS deviation summary
    const totalGpsPings = await GPSLog.countDocuments({ assignment: assignmentId });
    const totalDeviations = await GPSLog.countDocuments({ assignment: assignmentId, isDeviationEvent: true });

    // Create or update audit response
    let auditResponse = await AuditResponse.findOne({ assignment: assignmentId });
    if (auditResponse) {
      auditResponse.answers = answers;
      auditResponse.visitImage = visitImage || auditResponse.visitImage || '';
      auditResponse.gpsMetadata = {
        latitude: gps.latitude,
        longitude: gps.longitude,
        accuracy: gps.accuracy || 10,
        isInsideGeofence,
        distanceFromLocation: Math.round(distance),
        deviceInfo: device || '',
        ipAddress: ip || req.ip || '127.0.0.1',
        verifiedAt: new Date(),
      };
      auditResponse.totalGpsPings = totalGpsPings;
      auditResponse.totalDeviations = totalDeviations;
      auditResponse.startTime = startTime || auditResponse.startTime;
      auditResponse.submitTime = new Date();
      auditResponse.complianceScore = complianceScore;
      auditResponse.status = 'Pending Review';
      auditResponse.history.push({
        status: 'Submitted',
        updatedBy: req.user._id,
        remarks: 'Audit re-submitted',
      });
      await auditResponse.save();
    } else {
      auditResponse = await AuditResponse.create({
        assignment: assignmentId,
        auditor: req.user._id,
        location: location._id,
        answers,
        visitImage: visitImage || '',
        gpsMetadata: {
          latitude: gps.latitude,
          longitude: gps.longitude,
          accuracy: gps.accuracy || 10,
          isInsideGeofence,
          distanceFromLocation: Math.round(distance),
          deviceInfo: device || '',
          ipAddress: ip || req.ip || '127.0.0.1',
          verifiedAt: new Date(),
        },
        totalGpsPings,
        totalDeviations,
        startTime: startTime || new Date(),
        submitTime: new Date(),
        complianceScore,
        status: 'Pending Review',
        history: [{ status: 'Submitted', updatedBy: req.user._id, remarks: 'Initial submission' }],
      });
    }

    // Update assignment status
    assignment.status = 'Submitted';
    assignment.trackingActive = false;
    await assignment.save();

    // Notify Admins
    const admins = await User.find({ role: 'Admin' }).select('_id');
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        title: 'New Audit Submission',
        message: `Auditor ${req.user.username} submitted inspection for ${location.name}. Score: ${complianceScore}%`,
        type: 'AuditSubmitted',
      });
    }

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'SUBMIT_AUDIT',
      details: `Submitted inspection for ${location.name}. Score: ${complianceScore}%`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(201).json({
      message: 'Inspection submitted successfully',
      complianceScore,
      isInsideGeofence,
      totalGpsPings,
      totalDeviations,
      auditResponse,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin reviews audit submission
// @route   POST /api/audits/:id/review
// @access  Private/Admin
export const reviewAuditResponse = async (req, res) => {
  const { status, remarks } = req.body;

  if (!['Approved', 'Rejected', 'Needs Reinspection'].includes(status)) {
    return res.status(400).json({ message: 'Invalid review status' });
  }

  try {
    let response = await AuditResponse.findById(req.params.id)
      .populate({ path: 'assignment', populate: { path: 'location', select: 'name' } })
      .populate('auditor');

    if (!response) {
      response = await AuditResponse.findOne({ assignment: req.params.id })
        .populate({ path: 'assignment', populate: { path: 'location', select: 'name' } })
        .populate('auditor');
    }

    if (!response) {
      return res.status(404).json({ message: 'Audit response not found' });
    }

    response.status = status;
    response.reviewedBy = req.user._id;
    response.reviewRemarks = remarks || '';
    response.history.push({ status, updatedBy: req.user._id, remarks: remarks || '' });
    await response.save();

    const assignment = await Assignment.findById(response.assignment._id);
    assignment.status = status;
    await assignment.save();

    await Notification.create({
      recipient: response.auditor._id,
      title: `Inspection ${status}`,
      message: `Your inspection for ${response.assignment.location.name} has been ${status.toLowerCase()}`,
      type: 'ApprovalStatus',
    });

    await ActivityLog.create({
      user: req.user._id,
      action: `REVIEW_AUDIT_${status.toUpperCase().replace(/\s+/g, '_')}`,
      details: `Reviewed inspection ID ${response._id} — Status: ${status}`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({ message: `Inspection reviewed. Status: ${status}`, response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all audit responses
// @route   GET /api/audits/responses
// @access  Private
export const getAuditResponses = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Auditor') query.auditor = req.user._id;
    if (req.query.status) query.status = req.query.status;

    const responses = await AuditResponse.find(query)
      .populate({ path: 'assignment', populate: { path: 'location', select: 'name code description latitude longitude radius fitnessCertificateUrl' } })
      .populate('location', 'name code description latitude longitude radius fitnessCertificateUrl')
      .populate('auditor', 'username email profile')
      .populate('reviewedBy', 'username')
      .sort({ submitTime: -1 });

    res.json(responses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get audit response by ID or Assignment ID
// @route   GET /api/audits/responses/:id
// @access  Private
export const getAuditResponseById = async (req, res) => {
  try {
    let response = await AuditResponse.findById(req.params.id)
      .populate({ path: 'assignment', populate: { path: 'location' } })
      .populate('location')
      .populate('auditor', 'username email profile')
      .populate('reviewedBy', 'username');

    if (!response) {
      response = await AuditResponse.findOne({ assignment: req.params.id })
        .populate({ path: 'assignment', populate: { path: 'location' } })
        .populate('location')
        .populate('auditor', 'username email profile')
        .populate('reviewedBy', 'username');
    }

    if (!response) {
      return res.status(404).json({ message: 'Audit response not found' });
    }

    if (
      req.user.role === 'Auditor' &&
      response.auditor._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get GPS logs for an assignment
// @route   GET /api/audits/gps-logs/:assignmentId
// @access  Private/Admin
export const getGPSLogs = async (req, res) => {
  try {
    const logs = await GPSLog.find({ assignment: req.params.assignmentId })
      .populate('auditor', 'username profile')
      .sort({ timestamp: 1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get live auditor positions (most recent ping for each active auditor)
// @route   GET /api/audits/live-positions
// @access  Private/Admin
export const getLivePositions = async (req, res) => {
  try {
    const activeAssignments = await Assignment.find({
      trackingActive: true,
      status: 'In Progress',
    }).populate('auditor', 'username profile isOnline').populate('location', 'name code latitude longitude');

    const positions = [];
    for (const assignment of activeAssignments) {
      const lastPing = await GPSLog.findOne({ assignment: assignment._id }).sort({ timestamp: -1 });
      if (lastPing) {
        positions.push({
          assignmentId: assignment._id,
          auditor: assignment.auditor,
          location: assignment.location,
          lastPing: {
            latitude: lastPing.latitude,
            longitude: lastPing.longitude,
            accuracy: lastPing.accuracy,
            isInsideGeofence: lastPing.isInsideGeofence,
            distanceFromLocation: lastPing.distanceFromLocation,
            timestamp: lastPing.timestamp,
          },
          totalDeviations: assignment.totalDeviationCount,
        });
      }
    }

    res.json(positions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard analytics
// @route   GET /api/audits/analytics
// @access  Private/Admin
export const getAnalytics = async (req, res) => {
  try {
    const totalAssignmentsCount = await Assignment.countDocuments({});
    const completedAuditsCount = await Assignment.countDocuments({ status: 'Approved' });
    const pendingAuditsCount = await Assignment.countDocuments({ status: 'Pending' });
    const failedAuditsCount = await Assignment.countDocuments({ status: 'Rejected' });
    const submittedAuditsCount = await Assignment.countDocuments({ status: 'Submitted' });
    const inProgressCount = await Assignment.countDocuments({ status: 'In Progress' });

    const approvedResponses = await AuditResponse.find({ status: 'Approved' });
    let totalScoreSum = 0;
    approvedResponses.forEach((r) => (totalScoreSum += r.complianceScore || 0));
    const averageCompliance =
      approvedResponses.length > 0 ? Math.round(totalScoreSum / approvedResponses.length) : 0;

    // Location-wise compliance
    const locationStats = await AuditResponse.aggregate([
      { $match: { status: 'Approved' } },
      {
        $lookup: {
          from: 'assignments',
          localField: 'assignment',
          foreignField: '_id',
          as: 'assignmentInfo',
        },
      },
      { $unwind: '$assignmentInfo' },
      {
        $lookup: {
          from: 'locations',
          localField: 'assignmentInfo.location',
          foreignField: '_id',
          as: 'locationInfo',
        },
      },
      { $unwind: '$locationInfo' },
      {
        $group: {
          _id: '$locationInfo.name',
          avgScore: { $avg: '$complianceScore' },
          count: { $sum: 1 },
        },
      },
      { $project: { locationName: '$_id', avgScore: { $round: ['$avgScore', 0] }, count: 1 } },
    ]);

    const monthlyStats = await AuditResponse.aggregate([
      { $match: { status: 'Approved' } },
      {
        $group: {
          _id: { year: { $year: '$submitTime' }, month: { $month: '$submitTime' } },
          avgScore: { $avg: '$complianceScore' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const formattedMonthly = monthlyStats.map((item) => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        avgScore: Math.round(item.avgScore),
        count: item.count,
      };
    });

    const onlineAuditorsCount = await User.countDocuments({ role: 'Auditor', isOnline: true });
    const totalAuditorsCount = await User.countDocuments({ role: 'Auditor' });

    const recentActivity = await ActivityLog.find({})
      .populate('user', 'username role')
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({
      summary: {
        totalAssignments: totalAssignmentsCount,
        completedAudits: completedAuditsCount,
        pendingAudits: pendingAuditsCount,
        failedAudits: failedAuditsCount,
        submittedAudits: submittedAuditsCount,
        inProgress: inProgressCount,
        averageCompliance,
        onlineAuditors: onlineAuditorsCount,
        totalAuditors: totalAuditorsCount,
      },
      locationStats,
      monthlyStats: formattedMonthly,
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get auditor notifications
// @route   GET /api/audits/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/audits/notifications/:id/read
// @access  Private
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    notification.isRead = true;
    await notification.save();
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
