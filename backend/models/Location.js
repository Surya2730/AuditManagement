import mongoose from 'mongoose';

/**
 * Location Model - Represents one of the 5 pre-defined campus locations
 * for Bannari Amman Institute of Technology.
 * Each location has a fixed GPS geofence and embedded checklist.
 */

const checklistItemSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  question: { type: String, required: true },
  type: {
    type: String,
    enum: ['Yes/No', 'Rating', 'Dropdown', 'Text'],
    default: 'Yes/No',
  },
  options: { type: [String], default: [] }, // For Dropdown type
  weightage: { type: Number, default: 1 },
  isRequired: { type: Boolean, default: true },
  category: { type: String, default: 'General' }, // Sub-section within a checklist
});

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: [
        'Medical Center',
        'A1 Guest House',
        'Community Radio Station',
        'Research and Development',
        'Controller of Examinations',
      ],
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    description: { type: String, default: '' },
    building: { type: String, default: '' },
    floor: { type: String, default: 'Ground Floor' },
    
    // GPS Geofence Configuration
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    radius: {
      type: Number,
      default: 100, // meters — geofence radius
    },

    // Embedded Checklist for this location
    checklist: [checklistItemSchema],

    fitnessCertificateUrl: {
      type: String,
      default: '',
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Location = mongoose.model('Location', locationSchema);
export default Location;
