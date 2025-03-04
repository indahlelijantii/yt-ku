/**
 * ApiService - Kelas untuk menangani komunikasi dengan API
 */
class ApiService {
    constructor() {
        this.baseUrl = '/api';
    }

    /**
     * Melakukan permintaan ke API
     * @param {string} endpoint - Endpoint API
     * @param {string} method - Metode HTTP (GET, POST, PUT, DELETE)
     * @param {Object} data - Data yang akan dikirim (opsional)
     * @returns {Promise} - Promise response API
     */
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
    
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    
        // Tambahkan token jika ada
        const token = localStorage.getItem('token');
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
    
        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            console.log(`API Request: ${method} ${url}`, data);
            
            const response = await fetch(url, options);
            let result;
            
            try {
                result = await response.json();
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                throw new Error('Invalid response from server');
            }
            
            console.log(`API Response: ${response.status}`, result);
            
            if (!response.ok) {
                throw new Error(result.message || 'Terjadi kesalahan pada server');
            }
            
            return result;
        } catch (error) {
            console.error('API Error:', error);
            
            // Cek apakah ini error jaringan
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Gagal terhubung ke server. Periksa koneksi Anda.');
            }
            
            throw error;
        }
    }

    /**
     * Mendaftarkan email baru (Step 1)
     * @param {string} email - Email pengguna
     * @returns {Promise} - Promise response API
     */
    registerEmail(email) {
        return this.request('/auth/register/email', 'POST', { email });
    }

    /**
     * Verifikasi kode OTP (Step 2)
     * @param {string} email - Email pengguna
     * @param {string} otp - Kode OTP
     * @returns {Promise} - Promise response API
     */
    verifyOtp(email, otp) {
        return this.request('/auth/verify-otp', 'POST', { email, otp });
    }

    /**
     * Melengkapi registrasi (Step 3)
     * @param {Object} userData - Data pengguna (email, fullname, phone, password)
     * @returns {Promise} - Promise response API
     */
    completeRegistration(userData) {
        return this.request('/auth/register/complete', 'POST', userData);
    }

    /**
     * Membuat langganan baru (Step 4)
     * @param {Object} subscriptionData - Data langganan (email, package_duration, payment_method)
     * @returns {Promise} - Promise response API
     */
    createSubscription(subscriptionData) {
        return this.request('/subscriptions/create', 'POST', subscriptionData);
    }

    /**
     * Mengirim ulang kode OTP
     * @param {string} email - Email pengguna
     * @returns {Promise} - Promise response API
     */
    resendOtp(email) {
        return this.request('/auth/resend-otp', 'POST', { email });
    }

    /**
     * Mengambil daftar paket langganan
     * @returns {Promise} - Promise response API
     */
    getPackages() {
        return this.request('/subscriptions/packages');
    }

    /**
     * Mengunggah bukti pembayaran
     * @param {string} paymentId - ID pembayaran
     * @param {string} proofUrl - URL bukti pembayaran
     * @returns {Promise} - Promise response API
     */
    uploadPaymentProof(paymentId, proofUrl) {
        return this.request(`/subscriptions/payments/${paymentId}/proof`, 'POST', { proof_url: proofUrl });
    }
}

// Export sebagai singleton
window.apiService = new ApiService();