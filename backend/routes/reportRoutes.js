import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { generatePDFReport } from '../controllers/reportController.js';

const router = express.Router();

router.get('/:responseId/pdf', protect, generatePDFReport);

export default router;
