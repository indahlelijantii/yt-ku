/**
 * User Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/auth');

// All routes require authentication
router.use(authMiddleware.verifyToken);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/change-password', userController.changePassword);

// Device routes
router.post('/devices', userController.registerDevice);
router.get('/devices/active', userController.getActiveDevice);
router.delete('/devices/:device_id', userController.deactivateDevice);

module.exports = router;