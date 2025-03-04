/**
 * Payment Controller
 * Mengatur pembayaran dan callback
 */

const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const emailSender = require('../utils/emailSender');

module.exports = {
    /**
     * Get payment details
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getPaymentDetails: async (req, res) => {
        try {
            const { payment_id } = req.params;
            
            const payment = await Payment.getById(payment_id);
            
            if (!payment) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Pembayaran tidak ditemukan'
                });
            }
            
            // Check if user is authorized to view this payment
            if (payment.user_id !== req.user.user_id) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Anda tidak memiliki akses ke pembayaran ini'
                });
            }
            
            // Get subscription details
            const subscription = await Subscription.getById(payment.subscription_id);
            
            res.status(200).json({
                status: 'success',
                message: 'Berhasil mendapatkan detail pembayaran',
                data: {
                    payment,
                    subscription
                }
            });
        } catch (error) {
            console.error('Get payment details error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengambil detail pembayaran'
            });
        }
    },
    
    /**
     * Midtrans notification callback
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    midtransCallback: async (req, res) => {
        try {
            const notification = req.body;
            
            // In a real implementation, you would verify the signature
            // and validate the notification from Midtrans
            
            if (!notification.transaction_id || !notification.order_id || !notification.transaction_status) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Data notifikasi tidak lengkap'
                });
            }
            
            // Get payment by transaction ID (Midtrans order ID)
            const payment = await Payment.getByTransactionId(notification.order_id);
            
            if (!payment) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Pembayaran tidak ditemukan'
                });
            }
            
            // Process based on transaction status
            let paymentStatus;
            let subscriptionStatus;
            
            switch (notification.transaction_status) {
                case 'capture':
                case 'settlement':
                    paymentStatus = 'success';
                    subscriptionStatus = 'active';
                    break;
                case 'pending':
                    paymentStatus = 'pending';
                    subscriptionStatus = 'inactive';
                    break;
                case 'deny':
                case 'cancel':
                case 'expire':
                case 'failure':
                    paymentStatus = 'failed';
                    subscriptionStatus = 'inactive';
                    break;
                default:
                    paymentStatus = 'pending';
                    subscriptionStatus = 'inactive';
            }
            
            // Update payment status
            await Payment.update(payment.payment_id, {
                status: paymentStatus,
                transaction_id: notification.transaction_id
            });
            
            // Update subscription
            const subscription = await Subscription.getById(payment.subscription_id);
            
            if (paymentStatus === 'success') {
                await Subscription.update(subscription.subscription_id, {
                    payment_status: 'paid',
                    subscription_status: subscriptionStatus
                });
                
                // Also update user status to active
                await User.activate(subscription.user_id);
                
                // Get user email and send notification
                const user = await User.findById(subscription.user_id);
                
                if (user) {
                    await emailSender.sendRegistrationSuccessEmail(user.email, {
                        packageName: subscription.package_name,
                        startDate: subscription.start_date,
                        endDate: subscription.end_date,
                        paymentStatus: 'Lunas'
                    });
                }
            }
            
            res.status(200).json({ status: 'success' });
        } catch (error) {
            console.error('Midtrans callback error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat memproses callback'
            });
        }
    },
    
    /**
     * Manually verify a payment (for admin)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    verifyManualPayment: async (req, res) => {
        try {
            const { payment_id } = req.params;
            const { status } = req.body;
            
            if (!status || !['success', 'failed'].includes(status)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Status pembayaran tidak valid'
                });
            }
            
            // Get payment
            const payment = await Payment.getById(payment_id);
            
            if (!payment) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Pembayaran tidak ditemukan'
                });
            }
            
            if (payment.payment_method !== 'manual') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Hanya dapat memverifikasi pembayaran manual'
                });
            }
            
            // Update payment status
            await Payment.update(payment_id, {
                status
            });
            
            // If approved, update subscription
            if (status === 'success') {
                const subscription = await Subscription.getById(payment.subscription_id);
                
                await Subscription.update(subscription.subscription_id, {
                    payment_status: 'paid',
                    subscription_status: 'active'
                });
                
                // Also update user status to active
                await User.activate(subscription.user_id);
                
                // Get user email and send notification
                const user = await User.findById(subscription.user_id);
                
                if (user) {
                    await emailSender.sendRegistrationSuccessEmail(user.email, {
                        packageName: subscription.package_name,
                        startDate: subscription.start_date,
                        endDate: subscription.end_date,
                        paymentStatus: 'Lunas'
                    });
                }
            }
            
            res.status(200).json({
                status: 'success',
                message: `Pembayaran berhasil ${status === 'success' ? 'diverifikasi' : 'ditolak'}`,
                data: { payment_id, status }
            });
        } catch (error) {
            console.error('Verify manual payment error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat memverifikasi pembayaran'
            });
        }
    },
    
    /**
     * Get pending manual payments (for admin)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getPendingManualPayments: async (req, res) => {
        try {
            const pendingPayments = await Payment.getPendingManualPayments();
            
            res.status(200).json({
                status: 'success',
                message: 'Berhasil mendapatkan pembayaran manual yang tertunda',
                data: { pendingPayments }
            });
        } catch (error) {
            console.error('Get pending manual payments error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengambil pembayaran tertunda'
            });
        }
    }
};