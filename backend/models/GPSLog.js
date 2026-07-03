import mongoose from 'mongoose';

/**
 * GPSLog Model - Records continuous GPS pings from auditors during an active inspection.
 * Logs every position update, flags deviation events, and builds a trail for admin review.
 */
const gpsLogSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    auditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number,
      default: 10, // meters
    },
    distanceFromLocation: {
      type: Number,
      default: 0, // meters from the assigned location center
    },
    isInsideGeofence: {
      type: Boolean,
      required: true,
      default: false,
    },
    isDeviationEvent: {
      type: Boolean,
      default: false, // true if this is the first ping outside geofence after being inside
    },
    deviceInfo: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Index for fast lookup
gpsLogSchema.index({ assignment: 1, timestamp: -1 });
gpsLogSchema.index({ auditor: 1, timestamp: -1 });

const GPSLog = mongoose.model('GPSLog', gpsLogSchema);
export default GPSLog;
