/**
 * Konfigurasi email server
 */

module.exports = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false,
    auth: {
        user: process.env.EMAIL_USER || 'updatelagukaraoke@gmail.com',
        pass: process.env.EMAIL_PASS || 'ipyxvdnobzfklfjy'
    }
};