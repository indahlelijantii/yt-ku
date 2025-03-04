/**
 * User Controller
 * Mengatur profil dan perangkat pengguna
 */

const User = require('../models/User');
const Device = require('../models/Device');
const bcrypt = require('bcrypt');

module.exports = {
    /**
     * Get user profile
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getProfile: async (req, res) => {
        try {
            const userId = req.user.user_id;
            
            // Get user from database
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Pengguna tidak ditemukan'
                });
            }
            
            // Remove sensitive data
            const { password, otp_code, otp_expiry, ...userProfile } = user;
            
            res.status(200).json({
                status: 'success',
                message: 'Berhasil mendapatkan profil pengguna',
                data: { user: userProfile }
            });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengambil profil pengguna'
            });
        }
    },
    
    /**
     * Update user profile
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    updateProfile: async (req, res) => {
        try {
            const userId = req.user.user_id;
            const { fullname, phone } = req.body;
            
            if (!fullname && !phone) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Tidak ada data yang diubah'
                });
            }
            
            const updateData = {};
            if (fullname) updateData.fullname = fullname;
            if (phone) updateData.phone = phone;
            
            // Update user
            const success = await User.update(userId, updateData);
            
            if (!success) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Gagal memperbarui profil'
                });
            }
            
            res.status(200).json({
                status: 'success',
                message: 'Profil berhasil diperbarui',
                data: { 
                    user: {
                        ...req.user,
                        ...updateData
                    }
                }
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat memperbarui profil'
            });
        }
    },
    
    /**
     * Change password
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    changePassword: async (req, res) => {
        try {
            const userId = req.user.user_id;
            const { current_password, new_password } = req.body;
            
            if (!current_password || !new_password) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Password saat ini dan password baru diperlukan'
                });
            }
            
            // Get user
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Pengguna tidak ditemukan'
                });
            }
            
            // Verify current password
            const isPasswordValid = await bcrypt.compare(current_password, user.password);
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Password saat ini tidak valid'
                });
            }
            
            // Hash new password
            const hashedPassword = await bcrypt.hash(new_password, 10);
            
            // Update password
            await db.query(
                'UPDATE users SET password = ?, updated_at = NOW() WHERE user_id = ?',
                [hashedPassword, userId]
            );
            
            res.status(200).json({
                status: 'success',
                message: 'Password berhasil diubah'
            });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengubah password'
            });
        }
    },
    
    /**
     * Register device
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    registerDevice: async (req, res) => {
        try {
            const userId = req.user.user_id;
            const { device_uuid, device_name, device_type } = req.body;
            
            if (!device_uuid || !device_name || !device_type) {
                return res.status(400).json({
                    status: 'error',
                    message: 'UUID perangkat, nama perangkat, dan tipe perangkat diperlukan'
                });
            }
            
            // Generate login token
            const loginToken = require('crypto').randomBytes(32).toString('hex');
            
            // Register device
            const device = await Device.register({
                user_id: userId,
                device_uuid,
                device_name,
                device_type,
                login_token: loginToken
            });
            
            res.status(201).json({
                status: 'success',
                message: 'Perangkat berhasil terdaftar',
                data: { 
                    device: {
                        device_id: device.device_id,
                        device_uuid: device.device_uuid,
                        device_name: device.device_name,
                        device_type: device.device_type,
                        is_active: device.is_active,
                        login_token: device.login_token
                    }
                }
            });
        } catch (error) {
            console.error('Register device error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mendaftarkan perangkat'
            });
        }
    },
    
    /**
     * Get active device
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getActiveDevice: async (req, res) => {
        try {
            const userId = req.user.user_id;
            
            // Get active device
            const device = await Device.getActiveForUser(userId);
            
            if (!device) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Tidak ada perangkat aktif'
                });
            }
            
            res.status(200).json({
                status: 'success',
                message: 'Berhasil mendapatkan perangkat aktif',
                data: { 
                    device: {
                        device_id: device.device_id,
                        device_uuid: device.device_uuid,
                        device_name: device.device_name,
                        device_type: device.device_type,
                        is_active: device.is_active,
                        last_active: device.last_active
                    }
                }
            });
        } catch (error) {
            console.error('Get active device error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengambil perangkat aktif'
            });
        }
    },
    
    /**
     * Deactivate device
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    deactivateDevice: async (req, res) => {
        try {
            const userId = req.user.user_id;
            const { device_id } = req.params;
            
            // Check if device belongs to user
            const device = await Device.getById(device_id);
            
            if (!device || device.user_id !== userId) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Perangkat tidak ditemukan'
                });
            }
            
            // Deactivate device
            await Device.deactivate(device_id);
            
            res.status(200).json({
                status: 'success',
                message: 'Perangkat berhasil dinonaktifkan'
            });
        } catch (error) {
            console.error('Deactivate device error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat menonaktifkan perangkat'
            });
        }
    }
}