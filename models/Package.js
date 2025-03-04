/**
 * Package model
 */

const db = require('../config/database');

class Package {
    /**
     * Get all active packages
     * @returns {Promise<Array>} List of packages
     */
    static async getAll() {
        const query = 'SELECT * FROM packages WHERE is_active = true ORDER BY duration_months';
        return await db.query(query);
    }
    
    /**
     * Get package by ID
     * @param {number} packageId - Package ID
     * @returns {Promise<Object|null>} Package object or null
     */
    static async getById(packageId) {
        const query = 'SELECT * FROM packages WHERE package_id = ?';
        const packages = await db.query(query, [packageId]);
        
        return packages.length > 0 ? packages[0] : null;
    }
    
    /**
     * Get package by duration
     * @param {number} durationMonths - Duration in months
     * @returns {Promise<Object|null>} Package object or null
     */
    static async getByDuration(durationMonths) {
        const query = 'SELECT * FROM packages WHERE duration_months = ? AND is_active = true';
        const packages = await db.query(query, [durationMonths]);
        
        return packages.length > 0 ? packages[0] : null;
    }
    
    /**
     * Create default packages
     * Used for initial setup
     * @returns {Promise<boolean>} True if successful
     */
    static async createDefaults() {
        const defaultPackages = [
            {
                name: '1 Bulan',
                duration_months: 1,
                price: 99000,
                description: 'Paket 1 bulan (30 hari)',
                is_active: true
            },
            {
                name: '3 Bulan',
                duration_months: 3,
                price: 269000,
                description: 'Paket 3 bulan (90 hari)',
                is_active: true
            },
            {
                name: '6 Bulan',
                duration_months: 6,
                price: 499000,
                description: 'Paket 6 bulan (180 hari)',
                is_active: true
            },
            {
                name: '12 Bulan',
                duration_months: 12,
                price: 899000,
                description: 'Paket 12 bulan (365 hari)',
                is_active: true
            }
        ];
        
        // Check if packages already exist
        const existingPackages = await this.getAll();
        
        if (existingPackages.length > 0) {
            return true; // Packages already exist
        }
        
        // Insert default packages
        for (const pkg of defaultPackages) {
            await db.query(
                `INSERT INTO packages 
                (name, duration_months, price, description, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
                [pkg.name, pkg.duration_months, pkg.price, pkg.description, pkg.is_active]
            );
        }
        
        return true;
    }
}

module.exports = Package;