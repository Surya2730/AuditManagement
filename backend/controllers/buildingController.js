import Building from '../models/Building.js';
import qrcode from 'qrcode';

// @desc    Get all buildings
// @route   GET /api/buildings
// @access  Private
export const getBuildings = async (req, res) => {
  try {
    const buildings = await Building.find({});
    res.json(buildings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get building by ID
// @route   GET /api/buildings/:id
// @access  Private
export const getBuildingById = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }
    res.json(building);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new building
// @route   POST /api/buildings
// @access  Private/Admin
export const createBuilding = async (req, res) => {
  const { name, campus, latitude, longitude, radius, rooms } = req.body;

  try {
    const buildingExists = await Building.findOne({ name });
    if (buildingExists) {
      return res.status(400).json({ message: 'Building already exists' });
    }

    const processedRooms = [];
    if (rooms && rooms.length > 0) {
      for (const r of rooms) {
        const qrString = `ROOM_VERIFY_${name.replace(/\s+/g, '_')}_${r.roomNumber.replace(/\s+/g, '_')}`;
        processedRooms.push({
          roomNumber: r.roomNumber,
          block: r.block || '',
          floor: r.floor || '',
          roomType: r.roomType,
          qrCode: qrString,
        });
      }
    }

    const building = await Building.create({
      name,
      campus,
      latitude,
      longitude,
      radius: radius || 50,
      rooms: processedRooms,
    });

    res.status(201).json(building);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update building details
// @route   PUT /api/buildings/:id
// @access  Private/Admin
export const updateBuilding = async (req, res) => {
  const { name, campus, latitude, longitude, radius } = req.body;

  try {
    const building = await Building.findById(req.params.id);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    building.name = name || building.name;
    building.campus = campus || building.campus;
    building.latitude = latitude !== undefined ? latitude : building.latitude;
    building.longitude = longitude !== undefined ? longitude : building.longitude;
    building.radius = radius !== undefined ? radius : building.radius;

    const updatedBuilding = await building.save();
    res.json(updatedBuilding);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete building
// @route   DELETE /api/buildings/:id
// @access  Private/Admin
export const deleteBuilding = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    await Building.deleteOne({ _id: req.params.id });
    res.json({ message: 'Building removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add room to building
// @route   POST /api/buildings/:id/rooms
// @access  Private/Admin
export const addRoomToBuilding = async (req, res) => {
  const { roomNumber, block, floor, roomType } = req.body;

  try {
    const building = await Building.findById(req.params.id);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Check duplicate room
    const roomExists = building.rooms.find((r) => r.roomNumber === roomNumber);
    if (roomExists) {
      return res.status(400).json({ message: 'Room already exists in this building' });
    }

    const qrString = `ROOM_VERIFY_${building.name.replace(/\s+/g, '_')}_${roomNumber.replace(/\s+/g, '_')}`;

    building.rooms.push({
      roomNumber,
      block: block || '',
      floor: floor || '',
      roomType,
      qrCode: qrString,
    });

    await building.save();
    res.status(201).json(building);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete room from building
// @route   DELETE /api/buildings/:id/rooms/:roomId
// @access  Private/Admin
export const deleteRoomFromBuilding = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    building.rooms = building.rooms.filter((r) => r._id.toString() !== req.params.roomId);
    await building.save();

    res.json({ message: 'Room removed successfully', building });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
