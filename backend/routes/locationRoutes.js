import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { getLocations, getLocationById, updateLocation } from '../controllers/locationController.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', protect, getLocations);
router.get('/:id', protect, getLocationById);
router.put('/:id', protect, adminOnly, upload.single('fitnessCertificate'), updateLocation);

export default router;
