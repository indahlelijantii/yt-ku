/**
 * FormValidator - Kelas untuk validasi formulir
 */
class FormValidator {
    constructor() {
        this.errors = {};
    }

    /**
     * Validasi email
     * @param {string} email - Email yang akan divalidasi
     * @returns {boolean} - True jika valid, false jika tidak
     */
    validateEmail(email) {
        if (!email || email.trim() === '') {
            this.errors.email = 'Email diperlukan';
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.errors.email = 'Format email tidak valid';
            return false;
        }

        return true;
    }

    /**
     * Validasi kode OTP
     * @param {string} otp - Kode OTP yang akan divalidasi
     * @returns {boolean} - True jika valid, false jika tidak
     */
    validateOtp(otp) {
        if (!otp || otp.trim() === '') {
            this.errors.otp = 'Kode OTP diperlukan';
            return false;
        }

        if (otp.length !== 6 || !/^\d+$/.test(otp)) {
            this.errors.otp = 'Kode OTP harus 6 digit angka';
            return false;
        }

        return true;
    }

    /**
     * Validasi form data pengguna
     * @param {Object} userData - Data pengguna (fullname, phone, password, confirm_password)
     * @returns {boolean} - True jika valid, false jika tidak
     */
    validateUserData(userData) {
        let isValid = true;

        // Validasi nama lengkap
        if (!userData.fullname || userData.fullname.trim() === '') {
            this.errors.fullname = 'Nama lengkap diperlukan';
            isValid = false;
        }

        // Validasi nomor telepon
        if (!userData.phone || userData.phone.trim() === '') {
            this.errors.phone = 'Nomor telepon diperlukan';
            isValid = false;
        } else if (!/^\d+$/.test(userData.phone)) {
            this.errors.phone = 'Nomor telepon hanya boleh berisi angka';
            isValid = false;
        }

        // Validasi password
        if (!userData.password || userData.password.trim() === '') {
            this.errors.password = 'Password diperlukan';
            isValid = false;
        } else if (userData.password.length < 8) {
            this.errors.password = 'Password minimal 8 karakter';
            isValid = false;
        }

        // Validasi konfirmasi password
        if (userData.password !== userData.confirm_password) {
            this.errors.confirm_password = 'Konfirmasi password tidak cocok';
            isValid = false;
        }

        return isValid;
    }

    /**
     * Validasi form langganan
     * @param {Object} subscriptionData - Data langganan (package, payment_method)
     * @returns {boolean} - True jika valid, false jika tidak
     */
    validateSubscription(subscriptionData) {
        let isValid = true;

        // Validasi paket
        if (!subscriptionData.package_duration) {
            this.errors.package = 'Silakan pilih paket langganan';
            isValid = false;
        }

        // Validasi metode pembayaran
        if (!subscriptionData.payment_method) {
            this.errors.payment_method = 'Silakan pilih metode pembayaran';
            isValid = false;
        }

        return isValid;
    }

    /**
     * Mendapatkan pesan error
     * @param {string} field - Nama field
     * @returns {string|null} - Pesan error atau null jika tidak ada
     */
    getError(field) {
        return this.errors[field] || null;
    }

    /**
     * Reset semua error
     */
    resetErrors() {
        this.errors = {};
    }

    /**
     * Menampilkan pesan error
     * @param {string} field - Nama field
     * @param {string} message - Pesan error
     */
    showError(field, message) {
        const input = document.getElementById(field);
        if (!input) return;

        // Tambahkan class error ke input
        input.classList.add('error');

        // Cari atau buat element error
        let errorElement = input.parentElement.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            input.parentElement.appendChild(errorElement);
        }

        errorElement.textContent = message;
    }

    /**
     * Membersihkan pesan error
     * @param {string} field - Nama field
     */
    clearError(field) {
        const input = document.getElementById(field);
        if (!input) return;

        // Hapus class error dari input
        input.classList.remove('error');

        // Hapus element error
        const errorElement = input.parentElement.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }

    /**
     * Menampilkan semua pesan error
     */
    showAllErrors() {
        for (const field in this.errors) {
            this.showError(field, this.errors[field]);
        }
    }

    /**
     * Membersihkan semua pesan error
     */
    clearAllErrors() {
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(el => el.remove());

        const errorInputs = document.querySelectorAll('input.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    }
}

// Export sebagai singleton
window.formValidator = new FormValidator();