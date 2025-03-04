/**
 * Subscription model
 */

const db = require('../config/database');
const User = require('./User');

class Subscription {
    /**
     * Create a new subscription
     * @param {Object} subscriptionData - Subscription data
     * @returns {Promise<Object>} Created subscription
     */
    static async create(subscriptionData) {
        const { 
            user_id, 
            package_id, 
            start_date = new Date(), 
            end_date,
            payment_status = 'pending',
            subscription_status = 'inactive'
        } = subscriptionData;
        
        const query = `
            INSERT INTO subscriptions 
            (user_id, package_id, start_date, end_date, payment_status, subscription_status, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const result = await db.query(query, [
            user_id,
            package_id,
            start_date,
            end_date,
            payment_status,
            subscription_status
        ]);
        
        return {
            subscription_id: result.insertId,
            user_id,
            package_id,
            start_date,
            end_date,
            payment_status,
            subscription_status
        };
    }
    
    /**
     * Get subscription by ID
     * @param {number} subscriptionId - Subscription ID
     * @returns {Promise<Object|null>} Subscription object or null
     */
    static async getById(subscriptionId) {
        const query = `
            SELECT s.*, p.name as package_name, p.duration_months, p.price
            FROM subscriptions s
            JOIN packages p ON s.package_id = p.package_id
            WHERE s.subscription_id = ?
        `;
        
        const subscriptions = await db.query(query, [subscriptionId]);
        
        return subscriptions.length > 0 ? subscriptions[0] : null;
    }
    
    /**
     * Get active subscription by user ID
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} Subscription object or null
     */
    static async getActiveByUserId(userId) {
        const query = `
            SELECT s.*, p.name as package_name, p.duration_months, p.price
            FROM subscriptions s
            JOIN packages p ON s.package_id = p.package_id
            WHERE s.user_id = ? AND s.subscription_status = 'active' AND s.end_date >= NOW()
            ORDER BY s.end_date DESC
            LIMIT 1
        `;
        
        const subscriptions = await db.query(query, [userId]);
        
        return subscriptions.length > 0 ? subscriptions[0] : null;
    }
    
    /**
     * Get all subscriptions by user ID
     * @param {number} userId - User ID
     * @returns {Promise<Array>} List of subscriptions
     */
    static async getAllByUserId(userId) {
        const query = `
            SELECT s.*, p.name as package_name, p.duration_months, p.price
            FROM subscriptions s
            JOIN packages p ON s.package_id = p.package_id
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
        `;
        
        return await db.query(query, [userId]);
    }
    
    /**
     * Update subscription status
     * @param {number} subscriptionId - Subscription ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<boolean>} True if successful
     */
    static async update(subscriptionId, updateData) {
        const allowedFields = ['payment_status', 'subscription_status', 'end_date'];
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
        values.push(subscriptionId);
        
        const query = `UPDATE subscriptions SET ${updates.join(', ')} WHERE subscription_id = ?`;
        await db.query(query, values);
        
        // If subscription is now active, update user status as well
        if (updateData.subscription_status === 'active') {
            const subscription = await this.getById(subscriptionId);
            if (subscription) {
                await User.update(subscription.user_id, { status: 'active' });
            }
        }
        
        return true;
    }
    
    /**
     * Check if subscription is expiring soon
     * @param {number} userId - User ID
     * @param {number} daysThreshold - Days threshold (default: 7)
     * @returns {Promise<Object|null>} Subscription object or null
     */
    static async checkExpiringSoon(userId, daysThreshold = 7) {
        const query = `
            SELECT s.*, p.name as package_name, p.duration_months, p.price
            FROM subscriptions s
            JOIN packages p ON s.package_id = p.package_id
            WHERE s.user_id = ? 
            AND s.subscription_status = 'active' 
            AND s.end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
            ORDER BY s.end_date ASC
            LIMIT 1
        `;
        
        const subscriptions = await db.query(query, [userId, daysThreshold]);
        
        return subscriptions.length > 0 ? subscriptions[0] : null;
    }
    
    /**
     * Calculate subscription end date
     * @param {Date} startDate - Start date
     * @param {number} durationMonths - Duration in months
     * @returns {Date} End date
     */
    static calculateEndDate(startDate, durationMonths) {
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + durationMonths);
        return endDate;
    }
}

module.exports = Subscription;