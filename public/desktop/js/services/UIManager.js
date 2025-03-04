/**
 * UIManager - Kelas untuk mengelola tampilan UI
 */
class UIManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.progress = document.getElementById('progress');
        this.formData = {
            email: '',
            otpCode: '',
            fullname: '',
            phone: '',
            password: '',
            selectedPackage: null,
            selectedPaymentMethod: null
        };
    }

    /**
     * Inisialisasi tampilan
     */
    initialize() {
        this.updateProgressBar();
    }

    /**
     * Update progress bar
     */
    updateProgressBar() {
        const percent = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
        this.progress.style.width = `${percent}%`;
    }

    /**
     * Tampilkan langkah tertentu
     * @param {number} step - Nomor langkah yang akan ditampilkan
     */
    showStep(step) {
        // Sembunyikan semua langkah
        document.querySelectorAll('.form-step').forEach(el => {
            el.classList.remove('active');
        });
        
        // Tampilkan langkah yang dipilih
        document.getElementById(`form-step-${step}`).classList.add('active');
        
        // Update progress steps
        for (let i = 1; i <= this.totalSteps; i++) {
            const stepEl = document.getElementById(`step-${i}`);
            if (i < step) {
                stepEl.classList.add('completed');
                stepEl.classList.remove('active');
                stepEl.innerHTML = '<i class="fas fa-check"></i>';
            } else if (i === step) {
                stepEl.classList.add('active');
                stepEl.classList.remove('completed');
                stepEl.innerHTML = i;
            } else {
                stepEl.classList.remove('active', 'completed');
                stepEl.innerHTML = i;
            }
        }
        
        this.currentStep = step;
        this.updateProgressBar();
    }

    /**
     * Tampilkan loading indicator
     */
    showLoading() {
        // Buat loading overlay jika belum ada
        if (!document.getElementById('loading-overlay')) {
            const loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
            `;
            loadingOverlay.style.position = 'fixed';
            loadingOverlay.style.top = '0';
            loadingOverlay.style.left = '0';
            loadingOverlay.style.width = '100%';
            loadingOverlay.style.height = '100%';
            loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            loadingOverlay.style.display = 'flex';
            loadingOverlay.style.alignItems = 'center';
            loadingOverlay.style.justifyContent = 'center';
            loadingOverlay.style.zIndex = '9999';
            
            const loadingSpinner = loadingOverlay.querySelector('.loading-spinner');
            loadingSpinner.style.backgroundColor = '#fff';
            loadingSpinner.style.padding = '20px';
            loadingSpinner.style.borderRadius = '10px';
            loadingSpinner.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
            
            const spinner = loadingSpinner.querySelector('i');
            spinner.style.fontSize = '3rem';
            spinner.style.color = '#f0800c';
            
            document.body.appendChild(loadingOverlay);
        }
        
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    /**
     * Sembunyikan loading indicator
     */
    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Tampilkan notifikasi
     * @param {string} message - Pesan notifikasi
     * @param {string} type - Tipe notifikasi (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Buat notifikasi element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Cari container untuk menaruh notifikasi
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        
        // Tambahkan notifikasi ke container
        container.appendChild(notification);
        
        // Hapus notifikasi setelah 5 detik
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 500);
        }, 5000);
    }

    /**
     * Dapatkan input OTP
     * @returns {string} - Kode OTP yang diinput
     */
    getOtpInput() {
        let otp = '';
        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs.forEach(input => {
            otp += input.value;
        });
        return otp;
    }

    /**
     * Dapatkan data pengguna dari form
     * @returns {Object} - Data pengguna
     */
    getUserFormData() {
        return {
            email: this.formData.email,
            fullname: document.getElementById('fullname').value,
            phone: document.getElementById('phone').value,
            password: document.getElementById('password').value,
            confirm_password: document.getElementById('confirm-password').value
        };
    }

    /**
     * Dapatkan data langganan dari form
     * @returns {Object} - Data langganan
     */
    getSubscriptionData() {
        // Ambil data dari card yang dipilih
        const selectedPackageCard = document.querySelector('.package-card.selected');
        const selectedPaymentMethod = document.querySelector('.payment-method.selected');
        
        return {
            email: this.formData.email,
            package_duration: selectedPackageCard ? selectedPackageCard.dataset.package : null,
            payment_method: selectedPaymentMethod ? selectedPaymentMethod.dataset.method : null
        };
    }

    /**
     * Tampilkan informasi pembayaran
     * @param {Object} paymentData - Data pembayaran
     */
    showPaymentInfo(paymentData) {
        const paymentInfo = document.getElementById('payment-info');
        paymentInfo.classList.remove('hide');
        
        console.log('Showing payment info:', paymentData);
        
        if (paymentData.payment_method === 'midtrans') {
            paymentInfo.innerHTML = `
                <p>Anda akan diarahkan ke halaman pembayaran Midtrans untuk menyelesaikan transaksi.</p>
                <p>Paket: <strong>${paymentData.package_name}</strong></p>
                <p>Jumlah: <strong>Rp ${paymentData.amount.toLocaleString('id-ID')}</strong></p>
            `;
            
            document.getElementById('btn-to-payment').textContent = 'Bayar Sekarang';
            document.getElementById('btn-to-payment').setAttribute('data-redirect', paymentData.redirectUrl);
        } else {
            // Untuk pembayaran manual
            const bankDetails = paymentData.bankDetails || {
                bank_name: 'BCA',
                account_number: '1234567890',
                account_holder: 'PT Xtreme Soft Indonesia'
            };
            
            let bankInfo = `
                <p>Silakan transfer ke rekening berikut:</p>
                <p><strong>Bank ${bankDetails.bank_name}</strong><br>
                No. Rekening: ${bankDetails.account_number}<br>
                Atas Nama: ${bankDetails.account_holder}</p>
                <p>Jumlah: <strong>Rp ${paymentData.amount.toLocaleString('id-ID')}</strong></p>
                <p>ID Pembayaran: <strong>${paymentData.payment_id}</strong></p>
                <p>Setelah transfer, silakan unggah bukti pembayaran melalui tombol di bawah ini.</p>
            `;
            
            paymentInfo.innerHTML = bankInfo;
            document.getElementById('btn-to-payment').textContent = 'Unggah Bukti Transfer';
            document.getElementById('btn-to-payment').setAttribute('data-payment-id', paymentData.payment_id);
        }
    }

    /**
     * Tampilkan halaman sukses
     */
    showSuccessPage() {
        document.querySelectorAll('.form-step').forEach(el => {
            el.classList.remove('active');
        });
        document.getElementById('success-step').classList.add('active');
    }

    /**
     * Reset form
     */
    resetForm() {
        document.querySelectorAll('input').forEach(input => {
            input.value = '';
        });
        
        document.querySelectorAll('.package-card, .payment-method').forEach(el => {
            el.classList.remove('selected');
        });
        
        this.formData = {
            email: '',
            otpCode: '',
            fullname: '',
            phone: '',
            password: '',
            selectedPackage: null,
            selectedPaymentMethod: null
        };
        
        this.showStep(1);
    }
}

// Export sebagai singleton
window.uiManager = new UIManager();