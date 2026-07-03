import express from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getCategories)
  .post(protect, authorize('Admin', 'Super Admin'), createCategory);

router.route('/:id')
  .get(protect, getCategoryById)
  .put(protect, authorize('Admin', 'Super Admin'), updateCategory)
  .delete(protect, authorize('Admin', 'Super Admin'), deleteCategory);

export default router;
