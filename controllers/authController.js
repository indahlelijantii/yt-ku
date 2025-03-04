/**
 * Auth Controller
 * Mengatur autentikasi, registrasi, dan verifikasi OTP
 */

const User = require('../models/User');
const otpGenerator = require('../utils/otpGenerator');
const emailSender = require('../utils/emailSender');
const jwt = require('jsonwebtoken');

// Secret key untuk JWT
const JWT_SECRET = process.env.JWT_SECRET || 'xtremesoft-v4-secret-key';
// JWT expiry
const JWT_EXPIRY = '24h';

module.exports = {
    /**
     * Register new user (Step 1: Email Registration)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    registerEmail: async (req, res) => {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email diperlukan'
                });
            }
            
            // Check if email already exists
            const existingUser = await User.findByEmail(email);
            
            if (existingUser) {
                // If user exists but not verified, generate new OTP
                if (existingUser.status === 'inactive') {
                    const otp = otpGenerator.generateOTP();
                    const expiryTime = otpGenerator.generateExpiryTime();
                    
                    await User.updateOTP(email, otp, expiryTime);
                    await emailSender.sendOTPEmail(email, otp);
                    
                    return res.status(200).json({
                        status: 'success',
                        message: 'OTP telah dikirim ke email Anda',
                        data: { email }
                    });
                }
                
                return res.status(400).json({
                    status: 'error',
                    message: 'Email sudah terdaftar'
                });
            }
            
            // Generate OTP
            const otp = otpGenerator.generateOTP();
            const expiryTime = otpGenerator.generateExpiryTime();
            
            // Create user with minimum data
            await User.create({
                email,
                password: Math.random().toString(36).slice(-10), // Temporary password
                fullname: '',
                phone: '',
                otp_code: otp,
                otp_expiry: expiryTime
            });
            
            // Send OTP email
            await emailSender.sendOTPEmail(email, otp);
            
            res.status(201).json({
                status: 'success',
                message: 'OTP telah dikirim ke email Anda',
                data: { email }
            });
        } catch (error) {
            console.error('Register email error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mendaftarkan email'
            });
        }
    },
    
    /**
     * Verify OTP (Step 2: OTP Verification)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    verifyOTP: async (req, res) => {
        try {
            const { email, otp } = req.body;
            
            if (!email || !otp) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email dan OTP diperlukan'
                });
            }
            
            // Verify OTP
            const isValid = await User.verifyOTP(email, otp);
            
            if (!isValid) {
                return res.status(400).json({
                    status: 'error',
                    message: 'OTP tidak valid atau telah kedaluwarsa'
                });
            }
            
            res.status(200).json({
                status: 'success',
                message: 'OTP berhasil diverifikasi',
                data: { email }
            });
        } catch (error) {
            console.error('Verify OTP error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat memverifikasi OTP'
            });
        }
    },
    
    /**
     * Complete registration (Step 3: Create Account)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    completeRegistration: async (req, res) => {
        try {
            console.log('Complete registration request body:', req.body);
            const { email, fullname, phone, password } = req.body;
            
            if (!email || !fullname || !phone || !password) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Semua field diperlukan'
                });
            }
            
            // Get user by email
            const user = await User.findByEmail(email);
            console.log('Found user:', user ? { ...user, password: '***' } : null);
            
            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Pengguna tidak ditemukan'
                });
            }
            
            if (user.status !== 'verified') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email belum diverifikasi'
                });
            }
            
            // Update user data
            const updateSuccess = await User.update(user.user_id, {
                fullname,
                phone
            });
            
            if (!updateSuccess) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Gagal memperbarui data pengguna'
                });
            }
            
            // Update password (handled separately for security)
            const db = require('../config/database');
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(password, 10);
            
            await db.query(
                'UPDATE users SET password = ?, updated_at = NOW() WHERE user_id = ?',
                [hashedPassword, user.user_id]
            );
            
            res.status(200).json({
                status: 'success',
                message: 'Registrasi berhasil dilengkapi',
                data: { 
                    email,
                    fullname,
                    phone
                }
            });
        } catch (error) {
            console.error('Complete registration error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat melengkapi registrasi',
                debug: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },
    
    /**
     * Login
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    login: async (req, res) => {
        try {
            const { email, password, device_id } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email dan password diperlukan'
                });
            }
            
            // Verify credentials
            const user = await User.verifyCredentials(email, password);
            
            if (!user) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Email atau password tidak valid'
                });
            }
            
            if (user.status !== 'active') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Akun belum aktif, silakan lengkapi pembayaran'
                });
            }
            
            // If device_id is provided, handle device registration
            if (device_id) {
                // Implement device handling logic here
                // This would involve:
                // 1. Check if this device is already registered
                // 2. If not, register new device
                // 3. If yes, update last login time
                // 4. If there's an active device, handle logout from previous device
            }
            
            // Generate JWT token
            const token = jwt.sign(
                { 
                    user_id: user.user_id,
                    email: user.email,
                    status: user.status
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRY }
            );
            
            res.status(200).json({
                status: 'success',
                message: 'Login berhasil',
                data: {
                    user: {
                        user_id: user.user_id,
                        email: user.email,
                        fullname: user.fullname,
                        status: user.status
                    },
                    token
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat login'
            });
        }
    },
    
    /**
     * Resend OTP
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    resendOTP: async (req, res) => {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email diperlukan'
                });
            }
            
            // Check if user exists
            const user = await User.findByEmail(email);
            
            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Email tidak terdaftar'
                });
            }
            
            // Generate new OTP
            const otp = otpGenerator.generateOTP();
            const expiryTime = otpGenerator.generateExpiryTime();
            
            // Update user OTP
            await User.updateOTP(email, otp, expiryTime);
            
            // Send OTP email
            await emailSender.sendOTPEmail(email, otp);
            
            res.status(200).json({
                status: 'success',
                message: 'OTP baru telah dikirim ke email Anda',
                data: { email }
            });
        } catch (error) {
            console.error('Resend OTP error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengirim ulang OTP'
            });
        }
    },
    
    /**
     * Verify JWT token
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    verifyToken: async (req, res) => {
        try {
            // Token is verified by middleware
            const user = req.user;
            
            res.status(200).json({
                status: 'success',
                message: 'Token valid',
                data: { user }
            });
        } catch (error) {
            console.error('Verify token error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat memverifikasi token'
            });
        }
    },
    
    /**
     * Logout user
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    logout: async (req, res) => {
        try {
            // In a more comprehensive implementation, you might:
            // 1. Add the token to a blacklist
            // 2. Update the device status if using device tracking
            
            res.status(200).json({
                status: 'success',
                message: 'Logout berhasil'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat logout'
            });
        }
    }
}