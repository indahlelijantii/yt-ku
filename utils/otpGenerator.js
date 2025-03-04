/**
 * Utility untuk menghasilkan dan mengelola OTP
 */

const crypto = require('crypto');

// OTP expires after 10 minutes
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds

module.exports = {
    /**
     * Generate a 6-digit OTP
     * @returns {string} 6-digit OTP
     */
    generateOTP: () => {
        // Generate a random 6-digit number
        return Math.floor(100000 + Math.random() * 900000).toString();
    },
    
    /**
     * Generate expiry time for OTP
     * @returns {Date} Expiry date for OTP
     */
    generateExpiryTime: () => {
        return new Date(Date.now() + OTP_EXPIRY);
    },
    
    /**
     * Check if OTP is expired
     * @param {Date} expiryTime - OTP expiry time
     * @returns {boolean} True if expired, false otherwise
     */
    isExpired: (expiryTime) => {
        return new Date() > new Date(expiryTime);
    }
};