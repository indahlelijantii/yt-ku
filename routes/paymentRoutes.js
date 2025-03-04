/**
 * Payment Routes
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/auth');

// Get payment details (protected)
router.get('/:payment_id', authMiddleware.verifyToken, paymentController.getPaymentDetails);

// Midtrans callback (public)
router.post('/midtrans-callback', paymentController.midtransCallback);

// Admin routes
// Note: In a real application, you would have admin middleware
router.get('/admin/pending', paymentController.getPendingManualPayments);
router.post('/admin/:payment_id/verify', paymentController.verifyManualPayment);

module.exports = router;