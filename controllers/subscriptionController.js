/**
 * Subscription Controller
 * Mengatur paket dan langganan
 */

const Package = require('../models/Package');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const User = require('../models/User');

module.exports = {
    /**
     * Get all packages
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getAllPackages: async (req, res) => {
        try {
            const packages = await Package.getAll();
            
            res.status(200).json({
                status: 'success',
                message: 'Berhasil mendapatkan semua paket',
                data: { packages }
            });
        } catch (error) {
            console.error('Get all packages error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengambil paket'
            });
        }
    },
    
    /**
     * Get package by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getPackageById: async (req, res) => {
        try {
            const { id } = req.params;
            
            const package = await Package.getById(id);
            
            if (!package) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Paket tidak ditemukan'
                });
            }
            
            res.status(200).json({
                status: 'success',
                message: 'Berhasil mendapatkan paket',
                data: { package }
            });
        } catch (error) {
            console.error('Get package by ID error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengambil paket'
            });
        }
    },
    
    /**
     * Create subscription (Step 4: Choose Subscription)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    createSubscription: async (req, res) => {
        try {
            const { email, package_duration, payment_method } = req.body;
            
            if (!email || !package_duration || !payment_method) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email, durasi paket, dan metode pembayaran diperlukan'
                });
            }
            
            // Get user
            const user = await User.findByEmail(email);
            
            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Pengguna tidak ditemukan'
                });
            }
            
            // Get package
            const package = await Package.getByDuration(package_duration);
            
            if (!package) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Paket tidak ditemukan'
                });
            }
            
            // Calculate dates
            const startDate = new Date();
            const endDate = Subscription.calculateEndDate(startDate, package.duration_months);
            
            // Create subscription
            const subscription = await Subscription.create({
                user_id: user.user_id,
                package_id: package.package_id,
                start_date: startDate,
                end_date: endDate,
                payment_status: 'pending',
                subscription_status: 'inactive'
            });
            
            // Create payment
            const payment = await Payment.create({
                subscription_id: subscription.subscription_id,
                amount: package.price,
                payment_method: payment_method,
                status: 'pending'
            });
            
            // Generate response based on payment method
            let paymentResponse;
            
            if (payment_method === 'midtrans') {
                // In a real implementation, you would generate Midtrans payment URL here
                // For demo purposes, we'll just return a fake URL
                paymentResponse = {
                    redirectUrl: `/payment-gateway?payment_id=${payment.payment_id}`
                };
            } else if (payment_method === 'manual') {
                // For manual transfer, return bank details
                paymentResponse = {
                    bankDetails: {
                        bank_name: 'BCA',
                        account_number: '1234567890',
                        account_holder: 'PT Xtreme Soft Indonesia',
                        amount: package.price,
                        payment_id: payment.payment_id
                    }
                };
            }
            
            res.status(201).json({
                status: 'success',
                message: 'Berhasil membuat langganan',
                data: {
                    subscription,
                    payment,
                    package,
                    paymentResponse
                }
            });
        } catch (error) {
            console.error('Create subscription error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat membuat langganan'
            });
        }
    },
    
    /**
     * Upload manual payment proof
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    uploadPaymentProof: async (req, res) => {
        try {
            const { payment_id } = req.params;
            const { proof_url } = req.body;
            
            if (!proof_url) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Bukti pembayaran diperlukan'
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
                    message: 'Hanya dapat mengunggah bukti untuk pembayaran manual'
                });
            }
            
            // Update payment with proof
            await Payment.update(payment_id, {
                proof_of_payment: proof_url,
                status: 'pending_verification'
            });
            
            res.status(200).json({
                status: 'success',
                message: 'Bukti pembayaran berhasil diunggah',
                data: {
                    payment_id,
                    status: 'pending_verification'
                }
            });
        } catch (error) {
            console.error('Upload payment proof error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengunggah bukti pembayaran'
            });
        }
    },
    
    /**
     * Get user subscription
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getUserSubscription: async (req, res) => {
        try {
            const userId = req.user.user_id;
            
            // Get active subscription
            const subscription = await Subscription.getActiveByUserId(userId);
            
            if (!subscription) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Langganan aktif tidak ditemukan'
                });
            }
            
            // Get subscription details
            const endDate = new Date(subscription.end_date);
            const now = new Date();
            const remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            
            res.status(200).json({
                status: 'success',
                message: 'Berhasil mendapatkan langganan',
                data: {
                    subscription,
                    remainingDays
                }
            });
        } catch (error) {
            console.error('Get user subscription error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengambil langganan'
            });
        }
    },
    
    /**
     * Get subscription history
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getSubscriptionHistory: async (req, res) => {
        try {
            const userId = req.user.user_id;
            
            // Get all subscriptions
            const subscriptions = await Subscription.getAllByUserId(userId);
            
            res.status(200).json({
                status: 'success',
                message: 'Berhasil mendapatkan riwayat langganan',
                data: { subscriptions }
            });
        } catch (error) {
            console.error('Get subscription history error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengambil riwayat langganan'
            });
        }
    },
    
    /**
     * Renew subscription
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    renewSubscription: async (req, res) => {
        try {
            const userId = req.user.user_id;
            const { package_id, payment_method } = req.body;
            
            if (!package_id || !payment_method) {
                return res.status(400).json({
                    status: 'error',
                    message: 'ID paket dan metode pembayaran diperlukan'
                });
            }
            
            // Get current subscription
            const currentSubscription = await Subscription.getActiveByUserId(userId);
            
            // Get package
            const package = await Package.getById(package_id);
            
            if (!package) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Paket tidak ditemukan'
                });
            }
            
            // Calculate dates
            let startDate;
            if (currentSubscription && new Date(currentSubscription.end_date) > new Date()) {
                // If current subscription is still active, start from end date
                startDate = new Date(currentSubscription.end_date);
            } else {
                // Otherwise start from now
                startDate = new Date();
            }
            
            const endDate = Subscription.calculateEndDate(startDate, package.duration_months);
            
            // Create subscription
            const subscription = await Subscription.create({
                user_id: userId,
                package_id: package.package_id,
                start_date: startDate,
                end_date: endDate,
                payment_status: 'pending',
                subscription_status: 'inactive'
            });
            
            // Create payment
            const payment = await Payment.create({
                subscription_id: subscription.subscription_id,
                amount: package.price,
                payment_method: payment_method,
                status: 'pending'
            });
            
            // Generate response based on payment method
            let paymentResponse;
            
            if (payment_method === 'midtrans') {
                // In a real implementation, you would generate Midtrans payment URL here
                paymentResponse = {
                    redirectUrl: `/payment-gateway?payment_id=${payment.payment_id}`
                };
            } else if (payment_method === 'manual') {
                // For manual transfer, return bank details
                paymentResponse = {
                    bankDetails: {
                        bank_name: 'BCA',
                        account_number: '1234567890',
                        account_holder: 'PT Xtreme Soft Indonesia',
                        amount: package.price,
                        payment_id: payment.payment_id
                    }
                };
            }
            
            res.status(201).json({
                status: 'success',
                message: 'Berhasil memperpanjang langganan',
                data: {
                    subscription,
                    payment,
                    package,
                    paymentResponse
                }
            });
        } catch (error) {
            console.error('Renew subscription error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat memperpanjang langganan'
            });
        }
    }
};