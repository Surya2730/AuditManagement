import Location from '../models/Location.js';

// @desc    Get all campus locations
// @route   GET /api/locations
// @access  Private
export const getLocations = async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true }).select('-checklist');
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single location with its full checklist
// @route   GET /api/locations/:id
// @access  Private
export const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a location
// @route   PUT /api/locations/:id
// @access  Private/Admin
export const updateLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const { description, building, floor, latitude, longitude, radius, checklist } = req.body;

    if (description !== undefined) location.description = description;
    if (building !== undefined) location.building = building;
    if (floor !== undefined) location.floor = floor;
    if (latitude !== undefined) location.latitude = parseFloat(latitude);
    if (longitude !== undefined) location.longitude = parseFloat(longitude);
    if (radius !== undefined) location.radius = parseInt(radius);

    if (checklist) {
      const parsedChecklist = typeof checklist === 'string' ? JSON.parse(checklist) : checklist;
      location.checklist = parsedChecklist;
    }

    if (req.file) {
      location.fitnessCertificateUrl = `/uploads/${req.file.filename}`;
    }

    const updatedLocation = await location.save();
    res.json(updatedLocation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
