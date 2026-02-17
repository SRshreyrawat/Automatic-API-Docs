import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate, authorize } from '../controllers/authMiddleware.js';

const router = express.Router();

/**
 * User Management Routes
 */

// Get all users
router.get('/', authenticate, userController.getAllUsers);

// Get user by ID
router.get('/:id', authenticate, userController.getUserById);

// Create new user
router.post('/', userController.createUser);

// Update user
router.put('/:id', authenticate, authorize('admin'), userController.updateUser);

// Delete user
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

// Get user profile
router.get('/:id/profile', authenticate, userController.getUserProfile);

// Update user profile
router.patch('/:id/profile', authenticate, userController.updateUserProfile);

export default router;
