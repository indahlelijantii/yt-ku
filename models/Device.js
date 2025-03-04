/**
 * Device model
 */

const db = require('../config/database');

class Device {
    /**
     * Register a new device
     * @param {Object} deviceData - Device data
     * @returns {Promise<Object>} Created device
     */
    static async register(deviceData) {
        const { 
            user_id, 
            device_uuid, 
            device_name,
            device_type,
            login_token
        } = deviceData;
        
        // First, deactivate all existing devices for this user
        await this.deactivateAllForUser(user_id);
        
        // Check if device already exists
        const existingDevice = await this.getByUUID(device_uuid);
        
        if (existingDevice) {
            // Update existing device
            await db.query(
                `UPDATE devices SET 
                user_id = ?, 
                device_name = ?, 
                device_type = ?, 
                is_active = true, 
                last_active = NOW(), 
                login_token = ?,
                updated_at = NOW()
                WHERE device_id = ?`,
                [user_id, device_name, device_type, login_token, existingDevice.device_id]
            );
            
            return {
                device_id: existingDevice.device_id,
                user_id,
                device_uuid,
                device_name,
                device_type,
                is_active: true,
                last_active: new Date(),
                login_token
            };
        }
        
        // Register new device
        const query = `
            INSERT INTO devices 
            (user_id, device_uuid, device_name, device_type, is_active, last_active, login_token, created_at, updated_at) 
            VALUES (?, ?, ?, ?, true, NOW(), ?, NOW(), NOW())
        `;
        
        const result = await db.query(query, [
            user_id,
            device_uuid,
            device_name,
            device_type,
            login_token
        ]);
        
        return {
            device_id: result.insertId,
            user_id,
            device_uuid,
            device_name,
            device_type,
            is_active: true,
            last_active: new Date(),
            login_token
        };
    }
    
    /**
     * Get device by UUID
     * @param {string} deviceUUID - Device UUID
     * @returns {Promise<Object|null>} Device object or null
     */
    static async getByUUID(deviceUUID) {
        const query = 'SELECT * FROM devices WHERE device_uuid = ?';
        const devices = await db.query(query, [deviceUUID]);
        
        return devices.length > 0 ? devices[0] : null;
    }
    
    /**
     * Get device by ID
     * @param {number} deviceId - Device ID
     * @returns {Promise<Object|null>} Device object or null
     */
    static async getById(deviceId) {
        const query = 'SELECT * FROM devices WHERE device_id = ?';
        const devices = await db.query(query, [deviceId]);
        
        return devices.length > 0 ? devices[0] : null;
    }
    
    /**
     * Get active device for user
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} Device object or null
     */
    static async getActiveForUser(userId) {
        const query = 'SELECT * FROM devices WHERE user_id = ? AND is_active = true';
        const devices = await db.query(query, [userId]);
        
        return devices.length > 0 ? devices[0] : null;
    }
    
    /**
     * Deactivate all devices for user
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} True if successful
     */
    static async deactivateAllForUser(userId) {
        await db.query(
            'UPDATE devices SET is_active = false, updated_at = NOW() WHERE user_id = ?',
            [userId]
        );
        
        return true;
    }
    
    /**
     * Deactivate device
     * @param {number} deviceId - Device ID
     * @returns {Promise<boolean>} True if successful
     */
    static async deactivate(deviceId) {
        await db.query(
            'UPDATE devices SET is_active = false, updated_at = NOW() WHERE device_id = ?',
            [deviceId]
        );
        
        return true;
    }
    
    /**
     * Check if token is valid for device
     * @param {number} deviceId - Device ID
     * @param {string} token - Login token
     * @returns {Promise<boolean>} True if token is valid
     */
    static async isTokenValid(deviceId, token) {
        const device = await this.getById(deviceId);
        
        if (!device || !device.is_active) {
            return false;
        }
        
        return device.login_token === token;
    }
    
    /**
     * Update device last active time
     * @param {number} deviceId - Device ID
     * @returns {Promise<boolean>} True if successful
     */
    static async updateLastActive(deviceId) {
        await db.query(
            'UPDATE devices SET last_active = NOW(), updated_at = NOW() WHERE device_id = ?',
            [deviceId]
        );
        
        return true;
    }
}

module.exports = Device;