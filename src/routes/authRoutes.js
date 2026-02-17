import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../controllers/authMiddleware.js';

const router = express.Router();

/**
 * Authentication Routes
 */

// Login
router.post('/login', authController.login);

// Register
router.post('/register', authController.register);

// Logout
router.post('/logout', authenticate, authController.logout);

// Refresh token
router.post('/refresh', authController.refreshToken);

// Forgot password
router.post('/forgot-password', authController.forgotPassword);

// Reset password
router.post('/reset-password', authController.resetPassword);

export default router;
