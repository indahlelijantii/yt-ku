/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');

// Register step 1: Email registration
router.post('/register/email', authController.registerEmail);

// Register step 2: OTP verification
router.post('/verify-otp', authController.verifyOTP);

// Register step 3: Complete registration
router.post('/register/complete', authController.completeRegistration);

// Resend OTP
router.post('/resend-otp', authController.resendOTP);

// Login
router.post('/login', authController.login);

// Verify token (protected route)
router.get('/verify-token', authMiddleware.verifyToken, authController.verifyToken);

// Logout
router.post('/logout', authMiddleware.verifyToken, authController.logout);

module.exports = router;