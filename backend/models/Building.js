import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: true,
  },
  block: {
    type: String,
    default: '',
  },
  floor: {
    type: String,
    default: '',
  },
  roomType: {
    type: String,
    required: true, // e.g. Classroom, Laboratory, Washroom, Seminar Hall, Server Room
  },
  qrCode: {
    type: String,
    unique: true,
    sparse: true, // Unique but allows multiple null values
  },
});

const buildingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide building name'],
      unique: true,
      trim: true,
    },
    campus: {
      type: String,
      default: 'Main Campus',
    },
    latitude: {
      type: Number,
      required: [true, 'Please provide building Latitude coordinates'],
    },
    longitude: {
      type: Number,
      required: [true, 'Please provide building Longitude coordinates'],
    },
    radius: {
      type: Number,
      default: 50, // default 50 meters geofence
    },
    rooms: [roomSchema],
  },
  { timestamps: true }
);

const Building = mongoose.model('Building', buildingSchema);
export default Building;
