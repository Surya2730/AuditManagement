import mongoose from 'mongoose';

/**
 * Assignment Model - Refactored for the 2-role BIT system.
 * Links an Admin-assigned location to a specific Auditor with a schedule.
 */
const assignmentSchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    auditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'In Progress',
        'Submitted',
        'Approved',
        'Rejected',
        'Needs Reinspection',
      ],
      default: 'Pending',
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    remarks: {
      type: String,
      default: '',
    },
    // GPS Tracking Session
    trackingActive: {
      type: Boolean,
      default: false,
    },
    trackingStarted: {
      type: Date,
    },
    totalDeviationCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;
