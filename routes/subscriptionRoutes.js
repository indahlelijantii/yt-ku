/**
 * Subscription Routes
 */

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middlewares/auth');

// Public routes
router.get('/packages', subscriptionController.getAllPackages);
router.get('/packages/:id', subscriptionController.getPackageById);
router.post('/create', subscriptionController.createSubscription);

// Protected routes
router.get('/user', authMiddleware.verifyToken, subscriptionController.getUserSubscription);
router.get('/history', authMiddleware.verifyToken, subscriptionController.getSubscriptionHistory);
router.post('/renew', authMiddleware.verifyToken, subscriptionController.renewSubscription);
router.post('/payments/:payment_id/proof', authMiddleware.verifyToken, subscriptionController.uploadPaymentProof);

module.exports = router;