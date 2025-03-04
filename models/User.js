/**
 * User model
 */

const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Created user
     */
    static async create(userData) {
        const { email, password, fullname, phone, otp_code, otp_expiry } = userData;
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const query = `
            INSERT INTO users 
            (email, password, fullname, phone, otp_code, otp_expiry, status, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const status = 'inactive'; // User status is inactive until email verification
        
        const result = await db.query(query, [
            email, 
            hashedPassword, 
            fullname, 
            phone, 
            otp_code, 
            otp_expiry,
            status
        ]);
        
        return {
            user_id: result.insertId,
            email,
            fullname,
            phone,
            status
        };
    }
    
    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>} User object or null
     */
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ?';
        const users = await db.query(query, [email]);
        
        return users.length > 0 ? users[0] : null;
    }
    
    /**
     * Find user by ID
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} User object or null
     */
    static async findById(userId) {
        const query = 'SELECT * FROM users WHERE user_id = ?';
        const users = await db.query(query, [userId]);
        
        return users.length > 0 ? users[0] : null;
    }
    
    /**
     * Verify user OTP
     * @param {string} email - User email
     * @param {string} otp - OTP to verify
     * @returns {Promise<boolean>} True if OTP is valid, false otherwise
     */
    static async verifyOTP(email, otp) {
        const user = await this.findByEmail(email);
        
        if (!user) {
            return false;
        }
        
        // Check if OTP matches and is not expired
        if (user.otp_code === otp && new Date() < new Date(user.otp_expiry)) {
            // OTP is valid - update user status to verified
            await db.query(
                'UPDATE users SET status = ?, updated_at = NOW() WHERE user_id = ?',
                ['verified', user.user_id]
            );
            return true;
        }
        
        return false;
    }
    
    /**
     * Update user OTP
     * @param {string} email - User email
     * @param {string} otp - New OTP
     * @param {Date} expiryTime - OTP expiry time
     * @returns {Promise<boolean>} True if successful
     */
    static async updateOTP(email, otp, expiryTime) {
        const user = await this.findByEmail(email);
        
        if (!user) {
            return false;
        }
        
        await db.query(
            'UPDATE users SET otp_code = ?, otp_expiry = ?, updated_at = NOW() WHERE user_id = ?',
            [otp, expiryTime, user.user_id]
        );
        
        return true;
    }
    
    /**
     * Verify user credentials
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object|null>} User object if credentials are valid, null otherwise
     */
    static async verifyCredentials(email, password) {
        const user = await this.findByEmail(email);
        
        if (!user) {
            return null;
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return null;
        }
        
        // Don't return password and OTP information
        const { password: _, otp_code: __, otp_expiry: ___, ...userWithoutSensitiveData } = user;
        
        return userWithoutSensitiveData;
    }
    
    /**
     * Update user account
     * @param {number} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<boolean>} True if successful
     */
    static async update(userId, updateData) {
        const allowedFields = ['fullname', 'phone', 'status'];
        const updates = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        if (updates.length === 0) {
            return false;
        }
        
        updates.push('updated_at = NOW()');
        values.push(userId);
        
        const query = `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`;
        await db.query(query, values);
        
        return true;
    }
    
    /**
     * Set user status to active
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} True if successful
     */
    static async activate(userId) {
        await db.query(
            'UPDATE users SET status = ?, updated_at = NOW() WHERE user_id = ?',
            ['active', userId]
        );
        
        return true;
    }
}

module.exports = User;