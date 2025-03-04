/**
 * Authentication middleware
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'xtremesoft-v4-secret-key';

module.exports = {
    /**
     * Verify JWT token
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    verifyToken: async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token tidak ditemukan',
                    code: 'TOKEN_NOT_FOUND'
                });
            }
            
            const token = authHeader.split(' ')[1];
            
            // Verify token
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Get user from database
            const user = await User.findById(decoded.user_id);
            
            if (!user) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token tidak valid',
                    code: 'INVALID_TOKEN'
                });
            }
            
            // Add user info to request
            req.user = {
                user_id: user.user_id,
                email: user.email,
                fullname: user.fullname,
                status: user.status
            };
            
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token kedaluwarsa',
                    code: 'TOKEN_EXPIRED'
                });
            }
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token tidak valid',
                    code: 'INVALID_TOKEN'
                });
            }
            
            console.error('Auth middleware error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan pada autentikasi'
            });
        }
    },
    
    /**
     * Check if user is active
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    isActive: async (req, res, next) => {
        try {
            const user = req.user;
            
            if (user.status !== 'active') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Akun belum aktif, silakan lengkapi pembayaran',
                    code: 'INACTIVE_ACCOUNT'
                });
            }
            
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan pada autentikasi'
            });
        }
    }
};