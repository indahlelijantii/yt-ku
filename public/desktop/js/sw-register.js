// File sw-register.js
// Pendaftaran Service Worker

// Fungsi untuk mendaftarkan service worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((registration) => {
            console.log('Service Worker berhasil didaftarkan dengan scope:', registration.scope);
          })
          .catch((error) => {
            console.error('Service Worker gagal didaftarkan:', error);
          });
      });
    }
  }
  
  // Fungsi untuk menghapus cache
  function clearServiceWorkerCache() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Buat channel untuk komunikasi dua arah
      const messageChannel = new MessageChannel();
      
      // Tampilkan loading indicator
      const loadingToast = document.createElement('div');
      loadingToast.className = 'toast loading-toast';
      loadingToast.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghapus cache...';
      document.body.appendChild(loadingToast);
      
      // Atur handler untuk respons dari service worker
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          // Hapus loading indicator
          document.body.removeChild(loadingToast);
          
          // Tampilkan toast sukses
          const successToast = document.createElement('div');
          successToast.className = 'toast success-toast';
          successToast.innerHTML = '<i class="fas fa-check-circle"></i> ' + event.data.message;
          document.body.appendChild(successToast);
          
          // Hilangkan toast setelah 3 detik
          setTimeout(() => {
            document.body.removeChild(successToast);
            
            // Muat ulang halaman setelah toast hilang
            window.location.reload();
          }, 3000);
        }
      };
      
      // Kirim pesan ke service worker
      navigator.serviceWorker.controller.postMessage({
        action: 'clearCache'
      }, [messageChannel.port2]);
    } else {
      // Jika service worker belum aktif
      const errorToast = document.createElement('div');
      errorToast.className = 'toast error-toast';
      errorToast.innerHTML = '<i class="fas fa-exclamation-circle"></i> Service Worker belum aktif';
      document.body.appendChild(errorToast);
      
      // Hilangkan toast setelah 3 detik
      setTimeout(() => {
        document.body.removeChild(errorToast);
      }, 3000);
    }
  }
  
  // Tambahkan CSS untuk toast notifications
  function addToastStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        z-index: 1000;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
      }
      
      .loading-toast {
        background-color: #3498db;
      }
      
      .success-toast {
        background-color: #2ecc71;
      }
      
      .error-toast {
        background-color: #e74c3c;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Inisialisasi saat DOM dimuat
  document.addEventListener('DOMContentLoaded', () => {
    // Daftarkan service worker
    registerServiceWorker();
    
    // Tambahkan styles untuk toast
    addToastStyles();
    
    // Tambahkan event listener untuk tombol clear cache
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', clearServiceWorkerCache);
    }
  });
  
  // Ekspor fungsi agar dapat digunakan di luar
  window.clearServiceWorkerCache = clearServiceWorkerCache;