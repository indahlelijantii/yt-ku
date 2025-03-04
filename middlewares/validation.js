/**
 * Validation middleware
 */

module.exports = {
    /**
     * Validate registration email
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    validateEmail: (req, res, next) => {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                status: 'error',
                message: 'Email diperlukan'
            });
        }
        
        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: 'error',
                message: 'Format email tidak valid'
            });
        }
        
        next();
    },
    
    /**
     * Validate OTP
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    validateOTP: (req, res, next) => {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Email dan OTP diperlukan'
            });
        }
        
        if (otp.length !== 6 || !/^\d+$/.test(otp)) {
            return res.status(400).json({
                status: 'error',
                message: 'OTP harus berupa 6 digit angka'
            });
        }
        
        next();
    },
    
    /**
     * Validate user registration
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    validateUserRegistration: (req, res, next) => {
        const { email, fullname, phone, password } = req.body;
        
        if (!email || !fullname || !phone || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Semua field diperlukan'
            });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: 'error',
                message: 'Format email tidak valid'
            });
        }
        
        // Password validation
        if (password.length < 8) {
            return res.status(400).json({
                status: 'error',
                message: 'Password minimal 8 karakter'
            });
        }
        
        // Phone validation
        if (!/^\d+$/.test(phone)) {
            return res.status(400).json({
                status: 'error',
                message: 'Nomor telepon hanya boleh berisi angka'
            });
        }
        
        next();
    },
    
    /**
     * Validate subscription creation
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    validateSubscription: (req, res, next) => {
        const { email, package_duration, payment_method } = req.body;
        
        if (!email || !package_duration || !payment_method) {
            return res.status(400).json({
                status: 'error',
                message: 'Email, durasi paket, dan metode pembayaran diperlukan'
            });
        }
        
        // Validate package duration
        const allowedDurations = [1, 3, 6, 12];
        if (!allowedDurations.includes(parseInt(package_duration))) {
            return res.status(400).json({
                status: 'error',
                message: 'Durasi paket tidak valid'
            });
        }
        
        // Validate payment method
        const allowedMethods = ['midtrans', 'manual'];
        if (!allowedMethods.includes(payment_method)) {
            return res.status(400).json({
                status: 'error',
                message: 'Metode pembayaran tidak valid'
            });
        }
        
        next();
    },
    
    /**
     * Validate payment proof upload
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    validatePaymentProof: (req, res, next) => {
        const { payment_id } = req.params;
        const { proof_url } = req.body;
        
        if (!payment_id || !proof_url) {
            return res.status(400).json({
                status: 'error',
                message: 'ID pembayaran dan URL bukti pembayaran diperlukan'
            });
        }
        
        // Simple URL validation
        const urlRegex = /^(https?:\/\/)/;
        if (!urlRegex.test(proof_url)) {
            return res.status(400).json({
                status: 'error',
                message: 'URL bukti pembayaran tidak valid'
            });
        }
        
        next();
    },
    
    /**
     * Validate device registration
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    validateDeviceRegistration: (req, res, next) => {
        const { device_uuid, device_name, device_type } = req.body;
        
        if (!device_uuid || !device_name || !device_type) {
            return res.status(400).json({
                status: 'error',
                message: 'UUID perangkat, nama perangkat, dan tipe perangkat diperlukan'
            });
        }
        
        next();
    }
};