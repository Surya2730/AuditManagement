import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  value: { type: String, default: '' },
  remarks: { type: String, default: '' },
  images: { type: [String], default: [] },
});

const auditResponseSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      unique: true,
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
    answers: [answerSchema],
    visitImage: {
      type: String,
      default: '',
    },
    gpsMetadata: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: { type: Number, default: 10 },
      isInsideGeofence: { type: Boolean, default: false },
      distanceFromLocation: { type: Number, default: 0 },
      deviceInfo: { type: String, default: '' },
      ipAddress: { type: String, default: '' },
      verifiedAt: { type: Date, default: Date.now },
    },
    // GPS deviation summary
    totalGpsPings: { type: Number, default: 0 },
    totalDeviations: { type: Number, default: 0 },
    startTime: {
      type: Date,
      required: true,
    },
    submitTime: {
      type: Date,
      default: Date.now,
    },
    complianceScore: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pending Review', 'Approved', 'Rejected', 'Needs Reinspection'],
      default: 'Pending Review',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewRemarks: {
      type: String,
      default: '',
    },
    history: [
      {
        status: { type: String, required: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now },
        remarks: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

const AuditResponse = mongoose.model('AuditResponse', auditResponseSchema);
export default AuditResponse;
