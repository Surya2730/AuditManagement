import express from 'express';
import {
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  addRoomToBuilding,
  deleteRoomFromBuilding,
} from '../controllers/buildingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getBuildings)
  .post(protect, authorize('Admin', 'Super Admin'), createBuilding);

router.route('/:id')
  .get(protect, getBuildingById)
  .put(protect, authorize('Admin', 'Super Admin'), updateBuilding)
  .delete(protect, authorize('Admin', 'Super Admin'), deleteBuilding);

router.route('/:id/rooms')
  .post(protect, authorize('Admin', 'Super Admin'), addRoomToBuilding);

router.route('/:id/rooms/:roomId')
  .delete(protect, authorize('Admin', 'Super Admin'), deleteRoomFromBuilding);

export default router;
