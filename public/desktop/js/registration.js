document.addEventListener('DOMContentLoaded', function() {
    let currentStep = 1;
    const totalSteps = 4;
    const progress = document.getElementById('progress');
    
    // Update progress bar width
    function updateProgressBar() {
        const percent = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progress.style.width = `${percent}%`;
    }
    
    // Function to show a specific step
    function showStep(step) {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(el => {
            el.classList.remove('active');
        });
        
        // Show the current step
        document.getElementById(`form-step-${step}`).classList.add('active');
        
        // Update progress steps
        for (let i = 1; i <= totalSteps; i++) {
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
        
        currentStep = step;
        updateProgressBar();
    }
    
    // OTP input functionality
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
    
    // Navigation buttons
    document.getElementById('btn-to-step-2').addEventListener('click', function() {
        const email = document.getElementById('email').value;
        if (!email || !email.includes('@')) {
            alert('Silakan masukkan alamat email yang valid');
            return;
        }
        
        // In a real app, you would send an API request to verify the email and send OTP
        // For demo purposes, we'll just move to the next step
        showStep(2);
    });
    
    document.getElementById('btn-back-to-step-1').addEventListener('click', function() {
        showStep(1);
    });
    
    document.getElementById('btn-to-step-3').addEventListener('click', function() {
        // Collect all OTP inputs
        let otp = '';
        otpInputs.forEach(input => {
            otp += input.value;
        });
        
        if (otp.length !== 6) {
            alert('Silakan masukkan kode OTP 6 digit');
            return;
        }
        
        // In a real app, you would verify the OTP with the server
        // For demo purposes, we'll just move to the next step
        showStep(3);
    });
    
    document.getElementById('btn-back-to-step-2').addEventListener('click', function() {
        showStep(2);
    });
    
    document.getElementById('btn-to-step-4').addEventListener('click', function() {
        const fullname = document.getElementById('fullname').value;
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (!fullname || !phone || !password) {
            alert('Silakan lengkapi semua field');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Konfirmasi kata sandi tidak cocok');
            return;
        }
        
        if (password.length < 8) {
            alert('Kata sandi minimal 8 karakter');
            return;
        }
        
        // In a real app, you would send this data to the server
        // For demo purposes, we'll just move to the next step
        showStep(4);
    });
    
    document.getElementById('btn-back-to-step-3').addEventListener('click', function() {
        showStep(3);
    });
    
    document.getElementById('btn-finish').addEventListener('click', function() {
        // Check if a package is selected
        const selectedPackage = document.querySelector('.package-card.selected');
        if (!selectedPackage) {
            alert('Silakan pilih paket langganan');
            return;
        }
        
        // Check if a payment method is selected
        const selectedMethod = document.querySelector('.payment-method.selected');
        if (!selectedMethod) {
            alert('Silakan pilih metode pembayaran');
            return;
        }
        
        // Hide all steps and show success message
        document.querySelectorAll('.form-step').forEach(el => {
            el.classList.remove('active');
        });
        document.getElementById('success-step').classList.add('active');
        
        // Update payment info based on selected method
        const paymentInfo = document.getElementById('payment-info');
        const packageType = selectedPackage.dataset.package;
        const methodType = selectedMethod.dataset.method;
        
        paymentInfo.classList.remove('hide');
        
        if (methodType === 'midtrans') {
            paymentInfo.innerHTML = `
                <p>Anda akan diarahkan ke halaman pembayaran Midtrans untuk menyelesaikan transaksi.</p>
                <p>Paket: <strong>${packageType} Bulan</strong></p>
            `;
            
            document.getElementById('btn-to-payment').textContent = 'Bayar Sekarang';
        } else {
            let bankInfo = `
                <p>Silakan transfer ke rekening berikut:</p>
                <p><strong>Bank BCA</strong><br>
                No. Rekening: 1234567890<br>
                Atas Nama: PT Xtreme Soft Indonesia</p>
                <p>Jumlah: <strong>${selectedPackage.querySelector('.package-price').textContent}</strong></p>
                <p>Setelah transfer, silakan unggah bukti pembayaran melalui tombol di bawah ini.</p>
            `;
            
            paymentInfo.innerHTML = bankInfo;
            document.getElementById('btn-to-payment').textContent = 'Unggah Bukti Transfer';
        }
    });
    
    // Resend OTP link
    document.getElementById('resend-otp').addEventListener('click', function(e) {
        e.preventDefault();
        alert('Kode OTP baru telah dikirim ke email Anda.');
    });
    
    // Initialize the progress bar
    updateProgressBar();
});
