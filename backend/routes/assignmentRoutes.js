import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from '../controllers/assignmentController.js';

const router = express.Router();

router.route('/')
  .get(protect, getAssignments)
  .post(protect, adminOnly, createAssignment);

router.route('/:id')
  .get(protect, getAssignmentById)
  .put(protect, adminOnly, updateAssignment)
  .delete(protect, adminOnly, deleteAssignment);

export default router;
