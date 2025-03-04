/**
 * Payment model
 */

const db = require('../config/database');
const Subscription = require('./Subscription');

class Payment {
    /**
     * Create a new payment
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} Created payment
     */
    static async create(paymentData) {
        const { 
            subscription_id, 
            amount, 
            payment_method,
            transaction_id = null,
            payment_date = new Date(),
            status = 'pending',
            proof_of_payment = null
        } = paymentData;
        
        const query = `
            INSERT INTO payments 
            (subscription_id, amount, payment_method, transaction_id, payment_date, status, proof_of_payment, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const result = await db.query(query, [
            subscription_id,
            amount,
            payment_method,
            transaction_id,
            payment_date,
            status,
            proof_of_payment
        ]);
        
        return {
            payment_id: result.insertId,
            subscription_id,
            amount,
            payment_method,
            transaction_id,
            payment_date,
            status,
            proof_of_payment
        };
    }
    
    /**
     * Get payment by ID
     * @param {number} paymentId - Payment ID
     * @returns {Promise<Object|null>} Payment object or null
     */
    static async getById(paymentId) {
        const query = `
            SELECT p.*, s.user_id
            FROM payments p
            JOIN subscriptions s ON p.subscription_id = s.subscription_id
            WHERE p.payment_id = ?
        `;
        
        const payments = await db.query(query, [paymentId]);
        
        return payments.length > 0 ? payments[0] : null;
    }
    
    /**
     * Get payments by subscription ID
     * @param {number} subscriptionId - Subscription ID
     * @returns {Promise<Array>} List of payments
     */
    static async getBySubscriptionId(subscriptionId) {
        const query = `
            SELECT *
            FROM payments
            WHERE subscription_id = ?
            ORDER BY created_at DESC
        `;
        
        return await db.query(query, [subscriptionId]);
    }
    
    /**
     * Get payments by transaction ID
     * @param {string} transactionId - Transaction ID
     * @returns {Promise<Object|null>} Payment object or null
     */
    static async getByTransactionId(transactionId) {
        const query = `
            SELECT p.*, s.user_id
            FROM payments p
            JOIN subscriptions s ON p.subscription_id = s.subscription_id
            WHERE p.transaction_id = ?
        `;
        
        const payments = await db.query(query, [transactionId]);
        
        return payments.length > 0 ? payments[0] : null;
    }
    
    /**
     * Update payment status
     * @param {number} paymentId - Payment ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<boolean>} True if successful
     */
    static async update(paymentId, updateData) {
        const allowedFields = ['status', 'transaction_id', 'proof_of_payment'];
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
        values.push(paymentId);
        
        const query = `UPDATE payments SET ${updates.join(', ')} WHERE payment_id = ?`;
        await db.query(query, values);
        
        // If payment is now successful, update subscription status
        if (updateData.status === 'success') {
            const payment = await this.getById(paymentId);
            if (payment) {
                await Subscription.update(payment.subscription_id, {
                    payment_status: 'paid',
                    subscription_status: 'active'
                });
            }
        }
        
        return true;
    }
    
    /**
     * Get pending payments for manual verification
     * @returns {Promise<Array>} List of pending payments
     */
    static async getPendingManualPayments() {
        const query = `
            SELECT p.*, s.user_id, u.email, u.fullname
            FROM payments p
            JOIN subscriptions s ON p.subscription_id = s.subscription_id
            JOIN users u ON s.user_id = u.user_id
            WHERE p.payment_method = 'manual' AND p.status = 'pending' AND p.proof_of_payment IS NOT NULL
            ORDER BY p.created_at ASC
        `;
        
        return await db.query(query);
    }
}

module.exports = Payment;