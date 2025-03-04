/**
 * RegistrationApp - Kelas utama aplikasi registrasi
 */
class RegistrationApp {
    constructor() {
        this.formController = null;
    }

    /**
     * Inisialisasi aplikasi
     */
    initialize() {
        // Pastikan dokumen sudah siap
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeApp();
            });
        } else {
            this.initializeApp();
        }
    }

    /**
     * Inisialisasi komponen aplikasi
     */
    initializeApp() {
        console.log('Initializing Registration App...');
        
        // Inisialisasi form controller
        this.formController = new FormController();
        this.formController.initialize();
        
        console.log('Registration App initialized');
    }
}

// Buat instance dan jalankan aplikasi
const registrationApp = new RegistrationApp();
registrationApp.initialize();