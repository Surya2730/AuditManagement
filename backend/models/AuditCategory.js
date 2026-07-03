import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Yes/No', 'Text', 'Dropdown', 'Image', 'Rating'],
    default: 'Yes/No',
  },
  options: {
    type: [String],
    default: [], // Used if type is Dropdown
  },
  mandatory: {
    type: Boolean,
    default: true,
  },
  weightage: {
    type: Number,
    default: 1,
  },
});

const auditCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide category name'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    checklist: [questionSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const AuditCategory = mongoose.model('AuditCategory', auditCategorySchema);
export default AuditCategory;
