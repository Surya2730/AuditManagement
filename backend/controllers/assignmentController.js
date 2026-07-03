import Assignment from '../models/Assignment.js';
import Location from '../models/Location.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';

// @desc    Get all assignments
// @route   GET /api/assignments
// @access  Private
export const getAssignments = async (req, res) => {
  try {
    let query = {};

    // Auditors can only see their own assignments
    if (req.user.role === 'Auditor') {
      query.auditor = req.user._id;
    }

    if (req.query.status) query.status = req.query.status;
    if (req.query.location) query.location = req.query.location;
    if (req.query.auditorId && req.user.role !== 'Auditor') {
      query.auditor = req.query.auditorId;
    }

    const assignments = await Assignment.find(query)
      .populate('location', 'name code description latitude longitude radius')
      .populate('auditor', 'username email profile isOnline lastActive')
      .populate('assignedBy', 'username profile')
      .sort({ scheduledDate: -1 });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get assignment by ID (includes full checklist)
// @route   GET /api/assignments/:id
// @access  Private
export const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('location') // Full location with checklist
      .populate('auditor', 'username email profile')
      .populate('assignedBy', 'username');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Auditors can only see their own assignments
    if (
      req.user.role === 'Auditor' &&
      assignment.auditor._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to view this assignment' });
    }

    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new assignment
// @route   POST /api/assignments
// @access  Private/Admin
export const createAssignment = async (req, res) => {
  const { location, auditor, scheduledDate, dueDate, remarks } = req.body;

  try {
    // Verify location exists
    const locationDoc = await Location.findById(location);
    if (!locationDoc) {
      return res.status(404).json({ message: 'Location not found' });
    }

    // Verify auditor exists and has correct role
    const auditorDoc = await User.findById(auditor);
    if (!auditorDoc || auditorDoc.role !== 'Auditor') {
      return res.status(400).json({ message: 'Invalid auditor selection' });
    }

    const assignment = await Assignment.create({
      location,
      auditor,
      scheduledDate: scheduledDate || Date.now(),
      dueDate,
      assignedBy: req.user._id,
      remarks: remarks || '',
    });

    // Notify auditor
    await Notification.create({
      recipient: auditor,
      title: 'New Inspection Assigned',
      message: `You have been assigned to inspect ${locationDoc.name}. Scheduled: ${new Date(scheduledDate).toLocaleDateString('en-IN')}`,
      type: 'Assignment',
    });

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'ASSIGN_AUDIT',
      details: `Assigned inspection of ${locationDoc.name} to ${auditorDoc.username}`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
    });

    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate('location', 'name code')
      .populate('auditor', 'username email profile')
      .populate('assignedBy', 'username');

    res.status(201).json(populatedAssignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private/Admin
export const updateAssignment = async (req, res) => {
  const { auditor, scheduledDate, dueDate, status, remarks } = req.body;

  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (auditor) assignment.auditor = auditor;
    if (scheduledDate) assignment.scheduledDate = scheduledDate;
    if (dueDate) assignment.dueDate = dueDate;
    if (status) assignment.status = status;
    if (remarks !== undefined) assignment.remarks = remarks;

    const updatedAssignment = await assignment.save();
    const populated = await Assignment.findById(updatedAssignment._id)
      .populate('location', 'name code')
      .populate('auditor', 'username email profile')
      .populate('assignedBy', 'username');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private/Admin
export const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    await Assignment.deleteOne({ _id: req.params.id });
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
