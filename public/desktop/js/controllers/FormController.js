/**
 * FormController - Kelas untuk mengendalikan alur formulir registrasi
 */
class FormController {
    constructor() {
        this.apiService = window.apiService;
        this.formValidator = window.formValidator;
        this.uiManager = window.uiManager;
    }

    /**
     * Inisialisasi controller
     */
    initialize() {
        // Inisialisasi UI
        this.uiManager.initialize();
        
        // Bind event handlers
        this.bindEventHandlers();
        
        // Setup OTP input functionality
        this.setupOtpInputs();
        
        // Setup package and payment method selection
        this.setupSelections();
    }

    /**
     * Bind event handlers ke tombol-tombol
     */
    bindEventHandlers() {
        // Step 1: Email registration
        document.getElementById('btn-to-step-2').addEventListener('click', this.handleEmailRegistration.bind(this));
        
        // Step 2: OTP verification
        document.getElementById('btn-back-to-step-1').addEventListener('click', () => {
            // Reset form OTP saat kembali
            document.querySelectorAll('.otp-input').forEach(input => {
                input.value = '';
            });
            this.uiManager.showStep(1);
        });
        document.getElementById('btn-to-step-3').addEventListener('click', this.handleOtpVerification.bind(this));
        document.getElementById('resend-otp').addEventListener('click', this.handleResendOtp.bind(this));
        
        // Step 3: Create account
        document.getElementById('btn-back-to-step-2').addEventListener('click', () => {
            // Konfirmasi kembali ke langkah sebelumnya
            if (confirm('Anda yakin ingin kembali? Data yang sudah diisi tidak akan disimpan.')) {
                this.uiManager.showStep(2);
            }
        });
        document.getElementById('btn-to-step-4').addEventListener('click', this.handleAccountCreation.bind(this));
        
        // Step 4: Choose subscription
        document.getElementById('btn-back-to-step-3').addEventListener('click', () => {
            this.uiManager.showStep(3);
        });
        document.getElementById('btn-finish').addEventListener('click', this.handleSubscriptionCreation.bind(this));
        
        // Success page
        document.getElementById('btn-to-payment').addEventListener('click', this.handlePaymentRedirect.bind(this));
    }

    /**
     * Setup input OTP
     */
    setupOtpInputs() {
        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs.forEach(input => {
            input.addEventListener('input', function() {
                if (this.value.length === 1) {
                    const nextIndex = parseInt(this.dataset.index) + 1;
                    if (nextIndex <= 6) {
                        document.querySelector(`.otp-input[data-index="${nextIndex}"]`).focus();
                    }
                }
            });
            
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && this.value.length === 0) {
                    const prevIndex = parseInt(this.dataset.index) - 1;
                    if (prevIndex >= 1) {
                        const prevInput = document.querySelector(`.otp-input[data-index="${prevIndex}"]`);
                        prevInput.focus();
                        prevInput.value = '';
                    }
                }
            });
        });
    }

    /**
     * Setup paket dan metode pembayaran
     */
    setupSelections() {
        // Package selection
        const packageCards = document.querySelectorAll('.package-card');
        packageCards.forEach(card => {
            card.addEventListener('click', function() {
                packageCards.forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
        
        // Payment method selection
        const paymentMethods = document.querySelectorAll('.payment-method');
        paymentMethods.forEach(method => {
            method.addEventListener('click', function() {
                paymentMethods.forEach(m => m.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    }

/**
 * Handle registrasi email (langkah 1)
 */
async handleEmailRegistration(event) {
    event.preventDefault();
    
    this.formValidator.resetErrors();
    this.formValidator.clearAllErrors();
    
    const email = document.getElementById('email').value;
    
    // Validasi email
    if (!this.formValidator.validateEmail(email)) {
        this.formValidator.showAllErrors();
        return;
    }
    
    // Simpan email di formData
    this.uiManager.formData.email = email;
    
    try {
        this.uiManager.showLoading();
        
        // Panggil API untuk register email
        const response = await this.apiService.registerEmail(email);
        
        this.uiManager.hideLoading();
        this.uiManager.showNotification(response.message, 'success');
        this.uiManager.showStep(2);
    } catch (error) {
        this.uiManager.hideLoading();
        
        // Jika error email sudah terdaftar, tetap lanjut ke langkah berikutnya
        if (error.message === 'Email sudah terdaftar') {
            this.uiManager.showNotification('Email sudah terdaftar, melanjutkan ke verifikasi OTP', 'info');
            
            // Mengirim OTP ke email yang sudah terdaftar
            try {
                await this.apiService.resendOtp(email);
                this.uiManager.showNotification('OTP telah dikirim ke email Anda', 'success');
            } catch (otpError) {
                console.error('Error saat mengirim OTP:', otpError);
                this.uiManager.showNotification('Gagal mengirim OTP, silakan coba lagi', 'error');
            }
            
            // Lanjut ke langkah berikutnya
            this.uiManager.showStep(2);
        } else {
            // Error lainnya
            this.uiManager.showNotification(error.message || 'Terjadi kesalahan saat mendaftarkan email', 'error');
        }
    }
}

    /**
     * Handle verifikasi OTP (langkah 2)
     */
    async handleOtpVerification(event) {
        event.preventDefault();
        
        this.formValidator.resetErrors();
        this.formValidator.clearAllErrors();
        
        const otp = this.uiManager.getOtpInput();
        
        // Validasi OTP
        if (!this.formValidator.validateOtp(otp)) {
            this.formValidator.showAllErrors();
            return;
        }
        
        // Simpan OTP di formData
        this.uiManager.formData.otpCode = otp;
        
        try {
            this.uiManager.showLoading();
            
            // Panggil API untuk verifikasi OTP
            const response = await this.apiService.verifyOtp(this.uiManager.formData.email, otp);
            
            this.uiManager.hideLoading();
            this.uiManager.showNotification(response.message, 'success');
            
            // Hanya pindah ke langkah selanjutnya jika berhasil
            this.uiManager.showStep(3);
        } catch (error) {
            this.uiManager.hideLoading();
            this.uiManager.showNotification(error.message || 'Terjadi kesalahan saat memverifikasi OTP', 'error');
            // Tetap di langkah saat ini - tidak pindah ke langkah berikutnya
        }
    }

    /**
     * Handle kirim ulang OTP
     */
    async handleResendOtp(event) {
        event.preventDefault();
        
        const email = this.uiManager.formData.email;
        
        if (!email) {
            this.uiManager.showNotification('Email tidak ditemukan', 'error');
            return;
        }
        
        try {
            this.uiManager.showLoading();
            
            // Panggil API untuk kirim ulang OTP
            const response = await this.apiService.resendOtp(email);
            
            this.uiManager.hideLoading();
            this.uiManager.showNotification(response.message, 'success');
        } catch (error) {
            this.uiManager.hideLoading();
            this.uiManager.showNotification(error.message || 'Terjadi kesalahan saat mengirim ulang OTP', 'error');
        }
    }

    /**
     * Handle pembuatan akun (langkah 3)
     */
    async handleAccountCreation(event) {
        event.preventDefault();
        
        this.formValidator.resetErrors();
        this.formValidator.clearAllErrors();
        
        const userData = this.uiManager.getUserFormData();
        
        // Validasi data pengguna
        if (!this.formValidator.validateUserData(userData)) {
            this.formValidator.showAllErrors();
            return;
        }
        
        // Simpan data pengguna di formData
        this.uiManager.formData.fullname = userData.fullname;
        this.uiManager.formData.phone = userData.phone;
        this.uiManager.formData.password = userData.password;
        
        try {
            this.uiManager.showLoading();
            
            // Untuk debugging - cek data yang dikirim
            console.log('Sending user data:', {
                email: this.uiManager.formData.email,
                fullname: userData.fullname,
                phone: userData.phone,
                password: userData.password
            });
            
            // Panggil API untuk melengkapi registrasi
            const response = await this.apiService.completeRegistration({
                email: this.uiManager.formData.email,
                fullname: userData.fullname,
                phone: userData.phone,
                password: userData.password
            });
            
            this.uiManager.hideLoading();
            this.uiManager.showNotification(response.message, 'success');
            
            // Hanya pindah ke langkah selanjutnya jika berhasil
            this.uiManager.showStep(4);
        } catch (error) {
            this.uiManager.hideLoading();
            this.uiManager.showNotification(error.message || 'Terjadi kesalahan saat melengkapi registrasi', 'error');
            // Tetap di langkah saat ini - tidak pindah ke langkah berikutnya
        }
    }

    /**
     * Handle pembuatan langganan (langkah 4)
     */
    async handleSubscriptionCreation(event) {
        event.preventDefault();
        
        this.formValidator.resetErrors();
        this.formValidator.clearAllErrors();
        
        const subscriptionData = this.uiManager.getSubscriptionData();
        
        // Validasi data langganan
        if (!this.formValidator.validateSubscription(subscriptionData)) {
            this.formValidator.showAllErrors();
            return;
        }
        
        try {
            this.uiManager.showLoading();
            
            // Panggil API untuk membuat langganan
            const response = await this.apiService.createSubscription(subscriptionData);
            
            this.uiManager.hideLoading();
            
            // Ambil data yang relevan dari response
            const { payment, package: packageData, paymentResponse } = response.data;
            
            // Siapkan data untuk tampilan pembayaran
            const paymentData = {
                payment_id: payment.payment_id,
                payment_method: subscriptionData.payment_method,
                package_name: packageData.name,
                amount: payment.amount,
                redirectUrl: paymentResponse.redirectUrl || '',
                bankDetails: paymentResponse.bankDetails || null
            };
            
            console.log('Payment data:', paymentData);
            
            // Tampilkan halaman sukses dengan informasi pembayaran
            this.uiManager.showPaymentInfo(paymentData);
            this.uiManager.showSuccessPage();
            this.uiManager.showNotification(response.message, 'success');
            
            // Jika metode pembayaran adalah Midtrans, redirect otomatis
            if (subscriptionData.payment_method === 'midtrans' && paymentResponse.redirectUrl) {
                this.uiManager.showNotification('Anda akan dialihkan ke halaman pembayaran dalam 3 detik...', 'info');
                setTimeout(() => {
                    window.location.href = paymentResponse.redirectUrl;
                }, 3000);
            }
        } catch (error) {
            this.uiManager.hideLoading();
            this.uiManager.showNotification(error.message || 'Terjadi kesalahan saat membuat langganan', 'error');
        }
    }

    /**
     * Handle redirect ke pembayaran
     */
    handlePaymentRedirect(event) {
        event.preventDefault();
        
        const button = event.target;
        const redirectUrl = button.getAttribute('data-redirect');
        const paymentId = button.getAttribute('data-payment-id');
        
        if (redirectUrl) {
            // Redirect ke halaman pembayaran
            window.location.href = redirectUrl;
        } else if (paymentId) {
            // Tampilkan modal upload bukti pembayaran
            this.showUploadModal(paymentId);
        }
    }

    /**
     * Tampilkan modal upload bukti pembayaran
     * @param {string} paymentId - ID pembayaran 
     */
    showUploadModal(paymentId) {
        // Cek apakah modal sudah ada
        let modalElement = document.getElementById('upload-modal');
        
        if (!modalElement) {
            // Buat modal jika belum ada
            modalElement = document.createElement('div');
            modalElement.id = 'upload-modal';
            modalElement.className = 'modal';
            modalElement.innerHTML = `
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Unggah Bukti Pembayaran</h2>
                    <p>Silakan unggah bukti transfer Anda untuk memproses pembayaran.</p>
                    <div class="form-group">
                        <label for="proof-url">URL Bukti Pembayaran</label>
                        <input type="text" id="proof-url" placeholder="Masukkan URL bukti pembayaran">
                    </div>
                    <p class="text-small">*Untuk sementara Anda dapat menggunakan URL gambar dari internet.</p>
                    <button type="button" class="btn" id="btn-submit-proof">Kirim Bukti</button>
                </div>
            `;
            
            // Tambahkan styling untuk modal
            const style = document.createElement('style');
            style.textContent = `
                .modal {
                    display: none;
                    position: fixed;
                    z-index: 9999;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.5);
                }
                .modal-content {
                    background-color: #fff;
                    margin: 15% auto;
                    padding: 20px;
                    border-radius: 10px;
                    width: 80%;
                    max-width: 500px;
                }
                .close {
                    color: #aaa;
                    float: right;
                    font-size: 28px;
                    font-weight: bold;
                    cursor: pointer;
                }
                .close:hover {
                    color: #555;
                }
                .text-small {
                    font-size: 12px;
                    color: #666;
                    margin-top: 5px;
                }
            `;
            
            document.head.appendChild(style);
            document.body.appendChild(modalElement);
            
            // Tambahkan event listeners
            const closeBtn = modalElement.querySelector('.close');
            closeBtn.addEventListener('click', () => {
                modalElement.style.display = 'none';
            });
            
            const submitBtn = modalElement.querySelector('#btn-submit-proof');
            submitBtn.addEventListener('click', () => {
                const proofUrl = document.getElementById('proof-url').value;
                if (proofUrl) {
                    this.handlePaymentProofUpload(paymentId, proofUrl);
                    modalElement.style.display = 'none';
                } else {
                    this.uiManager.showNotification('URL bukti pembayaran diperlukan', 'error');
                }
            });
        }
        
        // Tampilkan modal
        modalElement.style.display = 'block';
    }

    /**
     * Handle upload bukti pembayaran
     */
    async handlePaymentProofUpload(paymentId, proofUrl) {
        try {
            this.uiManager.showLoading();
            
            // Panggil API untuk upload bukti pembayaran
            const response = await this.apiService.uploadPaymentProof(paymentId, proofUrl);
            
            this.uiManager.hideLoading();
            this.uiManager.showNotification(response.message, 'success');
            
            // Redirect ke halaman index setelah upload bukti
            this.uiManager.showNotification('Pembayaran sedang diproses. Anda akan dialihkan ke halaman utama dalam 3 detik...', 'success');
            
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 3000);
        } catch (error) {
            this.uiManager.hideLoading();
            this.uiManager.showNotification(error.message || 'Terjadi kesalahan saat mengunggah bukti pembayaran', 'error');
        }
    }
}