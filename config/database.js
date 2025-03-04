const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'xtremesoft_v4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;

module.exports = {
    connect: async () => {
        try {
            pool = mysql.createPool(dbConfig);
            console.log('Connected to MySQL database');
            
            // Validate connection
            const connection = await pool.getConnection();
            connection.release();
            
            return true;
        } catch (error) {
            console.error('Database connection error:', error);
            process.exit(1);
        }
    },
    
    getPool: () => {
        if (!pool) throw new Error('Database not connected');
        return pool;
    },
    
    query: async (sql, params) => {
        try {
            const [results] = await pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Query error:', error);
            throw error;
        }
    },
    
    close: async () => {
        if (pool) {
            await pool.end();
            console.log('Database connection closed');
        }
    }
};