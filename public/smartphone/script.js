// Variabel global untuk aplikasi
let isLoading = false; // Status loading data pencarian
let hasMore = true; // Indikator masih ada data yang bisa dimuat
let socket; // Koneksi WebSocket
let playlist = []; // Daftar putar video
let historyList = []; // Daftar riwayat tontonan
let favoritesList = []; // Daftar video favorit
let playerState = {
    playing: false, // Status pemutaran (play/pause)
    currentTime: 0, // Waktu saat ini dalam detik
    duration: 0, // Durasi total video dalam detik
    volume: 100, // Volume (0-100)
    videoId: null // ID video yang sedang diputar
};
let activePlaylistItemIndex = null; // Indeks item yang aktif di playlist

// Variabel untuk menangani pagination history di beranda
let currentHistoryPage = 0;
let historyItemsPerPage = 10;
let isLoadingHistory = false;
let historyHasMore = true;

/**
 * Menghubungkan ke server melalui WebSocket
 */
function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}`;
    
    socket = new WebSocket(wsUrl);
    
    // Menangani event koneksi berhasil
    socket.onopen = function() {
        console.log('Terhubung ke server');
        document.getElementById('connectionIcon').className = 'fas fa-wifi';
        document.getElementById('connectionIconContainer').classList.remove('disconnected');
        
        // Daftarkan sebagai controller
        socket.send(JSON.stringify({
            type: 'register',
            clientType: 'controller'
        }));
    };
    
    // Menangani event koneksi terputus
    socket.onclose = function() {
        console.log('Terputus dari server');
        document.getElementById('connectionIcon').className = 'fas fa-wifi-slash';
        document.getElementById('connectionIconContainer').classList.add('disconnected');
        
        // Coba hubungkan kembali setelah 5 detik
        setTimeout(connectWebSocket, 5000);
    };
    
    // Menangani error koneksi
    socket.onerror = function(error) {
        console.error('Error WebSocket:', error);
    };
    
    // Menangani pesan yang masuk dari server
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        console.log('Pesan diterima:', data);
        
        // Update data sesuai tipe pesan
        if (data.type === 'playlist') {
            playlist = data.playlist;
            updatePlaylistUI();
        }
        else if (data.type === 'history') {
            historyList = data.history;
            updateHistoryUI();
            
            // Jika tab beranda aktif dan search input kosong, perbarui tampilan history
            const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
            const searchInput = document.getElementById('searchInput');
            if (activeTab === 'search' && (!searchInput || !searchInput.value.trim())) {
                displayHistoryOnHome(true);
            }
        }
        else if (data.type === 'favorites') {
            favoritesList = data.favorites;
            updateFavoritesUI();
        }
        else if (data.type === 'playerState') {
            playerState = data.state;
            updatePlayerUI();
        }
    };
}

/**
 * Menampilkan data history pada halaman beranda
 * @param {boolean} isInitial - True jika ini adalah load awal, false jika load more
 */
function displayHistoryOnHome(isInitial = true) {
    if (isLoadingHistory) return;
    
    const videosContainer = document.getElementById('videosContainer');
    isLoadingHistory = true;
    
    if (isInitial) {
        videosContainer.innerHTML = '<div class="loading">Memuat video...</div>';
        currentHistoryPage = 0;
        historyHasMore = true;
    }

    // Hitung indeks awal dan akhir untuk pagination
    const startIndex = currentHistoryPage * historyItemsPerPage;
    const endIndex = Math.min(startIndex + historyItemsPerPage, historyList.length);
    
    // Pastikan masih ada data yang bisa dimuat
    historyHasMore = endIndex < historyList.length;
    
    // Jika tidak ada history atau semua data sudah dimuat
    if (historyList.length === 0) {
        videosContainer.innerHTML = '<p>Belum ada riwayat tontonan</p>';
        isLoadingHistory = false;
        return;
    }
    
    if (isInitial) {
        videosContainer.innerHTML = '';
    }
    
    // Ambil sepotong data history untuk ditampilkan
    const historySlice = historyList.slice(startIndex, endIndex);
    
    historySlice.forEach(video => {
        const isFavorite = isVideoFavorite(video.videoId);
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        
        // Format tampilan video
        videoCard.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}" class="thumbnail" loading="lazy">
            <div class="video-info">
                <h3 class="video-title">${video.title}</h3>
                <p class="video-author">${video.author}</p>
                <p class="video-views">${video.views || 'N/A'} • ${video.duration || 'N/A'}</p>
            </div>
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${video.videoId}">
                <i class="fas fa-star"></i>
            </button>
        `;
        
        // Tambahkan event click untuk menambah ke playlist
        videoCard.addEventListener('click', (e) => {
            // Jangan aktifkan jika klik pada tombol favorit
            if (!e.target.closest('.favorite-btn')) {
                socket.send(JSON.stringify({
                    type: 'addToPlaylist',
                    video: video
                }));
                
                // Umpan balik visual
                const originalBackgroundColor = videoCard.style.backgroundColor;
                videoCard.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                setTimeout(() => {
                    videoCard.style.backgroundColor = originalBackgroundColor;
                }, 300);
            }
        });
        
        // Event listener untuk tombol favorit
        const favoriteBtn = videoCard.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = favoriteBtn.getAttribute('data-id');
            
            // Toggle favorit dan dapatkan status baru
            const isNowFavorite = toggleFavorite(videoId);
            
            // Update kelas tombol sesuai status baru
            favoriteBtn.classList.toggle('active', isNowFavorite);
        });
        
        videosContainer.appendChild(videoCard);
    });
    
    // Increment halaman untuk load more berikutnya
    currentHistoryPage++;
    
    // Hapus indikator loading jika ada
    const loadingEl = document.querySelector('.loading');
    if (loadingEl) loadingEl.remove();
    
    isLoadingHistory = false;
}

function toggleSearchContainer() {
    const searchContainer = document.getElementById('searchContainer');
    const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
    
    if (activeTab === 'search') {
        searchContainer.style.display = 'flex';
    } else {
        searchContainer.style.display = 'none';
    }
}

/**
 * Inisialisasi tab menu aplikasi
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Update tombol yang aktif
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update konten yang aktif
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Jika tab search/beranda aktif, perlu memuat history
            if (tabName === 'search') {
                const searchInput = document.getElementById('searchInput');
                // Hanya tampilkan history jika kotak pencarian kosong
                if (!searchInput.value.trim()) {
                    displayHistoryOnHome(true);
                }
            }
            
            // Tutup menu jika terbuka
            hidePlaylistMenu();
            toggleSearchContainer();
        });
    });
}

/**
 * Inisialisasi kontrol player (play, pause, next, prev, dll)
 */
function initPlayerControls() {
    // Tombol Play/Pause
    document.getElementById('playPauseButton').addEventListener('click', () => {
        if (playerState.playing) {
            socket.send(JSON.stringify({ type: 'pause' }));
        } else {
            socket.send(JSON.stringify({ type: 'play', videoId: playerState.videoId }));
        }
    });
    
    // Tombol Next
    document.getElementById('nextButton').addEventListener('click', () => {
        socket.send(JSON.stringify({ type: 'playNext' }));
    });
    
    // Tombol Previous
    document.getElementById('prevButton').addEventListener('click', () => {
        socket.send(JSON.stringify({ type: 'playPrevious' }));
    });
    
    // Slider Volume
    document.getElementById('volumeSlider').addEventListener('input', (e) => {
        const volume = parseInt(e.target.value);
        socket.send(JSON.stringify({ type: 'volume', value: volume }));
    });
    
    // Slider Timeline 
    document.getElementById('timelineSlider').addEventListener('input', (e) => {
        const seekTime = (parseInt(e.target.value) / 100) * playerState.duration;
        document.getElementById('currentTime').textContent = formatTime(seekTime);
    });
    
    document.getElementById('timelineSlider').addEventListener('change', (e) => {
        const seekTime = (parseInt(e.target.value) / 100) * playerState.duration;
        socket.send(JSON.stringify({ type: 'seek', time: seekTime }));
    });
}

/**
 * Memperbarui tampilan player berdasarkan status saat ini
 */
function updatePlayerUI() {
    // Update tombol play/pause
    const playPauseIcon = document.getElementById('playPauseButton').querySelector('i');
    if (playerState.playing) {
        playPauseIcon.className = 'fas fa-pause';
    } else {
        playPauseIcon.className = 'fas fa-play';
    }
    
    // Update slider volume
    document.getElementById('volumeSlider').value = playerState.volume;
    
    // Update slider timeline jika tidak sedang di-drag
    if (!document.getElementById('timelineSlider').matches(':active')) {
        const percent = playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0;
        document.getElementById('timelineSlider').value = percent;
        document.getElementById('currentTime').textContent = formatTime(playerState.currentTime);
        document.getElementById('duration').textContent = formatTime(playerState.duration);
    }
    
    // Update info "Now Playing"
    if (playerState.videoId) {
        // Cari video di playlist, history, atau favorites
        const currentVideo = playlist.find(video => video.videoId === playerState.videoId) || 
                            historyList.find(video => video.videoId === playerState.videoId) ||
                            favoritesList.find(video => video.videoId === playerState.videoId);
        
        if (currentVideo) {
            document.getElementById('currentThumbnail').src = currentVideo.thumbnail;
            document.getElementById('currentTitle').textContent = currentVideo.title;
            document.getElementById('currentAuthor').textContent = currentVideo.author;
        }
    } else {
        document.getElementById('currentThumbnail').src = '../logo.png';
        document.getElementById('currentTitle').textContent = 'Tidak ada video yang diputar';
        document.getElementById('currentAuthor').textContent = '';
    }
}

/**
 * Format waktu dalam detik ke format MM:SS
 * @param {number} seconds - Waktu dalam detik
 * @return {string} Waktu dalam format MM:SS
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Mengubah status favorit untuk sebuah video
 * @param {string} videoId - ID video YouTube
 * @param {Object} videoData - Data video lengkap (opsional, untuk tab search)
 */
function toggleFavorite(videoId, videoData = null) {
    const isFavorite = isVideoFavorite(videoId);
    
    if (isFavorite) {
        // Hapus dari favorit
        favoritesList = favoritesList.filter(video => video.videoId !== videoId);
    } else {
        // Tambahkan ke favorit
        // Jika videoData diberikan (dari search), gunakan itu
        if (videoData) {
            favoritesList.push({
                ...videoData,
                timestamp: Date.now() // Tambahkan timestamp
            });
        } else {
            // Cari di playlist atau history jika tidak ada videoData
            const video = playlist.find(v => v.videoId === videoId) || 
                          historyList.find(v => v.videoId === videoId);
                       
            if (video) {
                // Buat salinan objek video dan tambahkan ke favorit
                favoritesList.push({
                    ...video,
                    timestamp: Date.now() // Pastikan ada timestamp
                });
            }
        }
    }
    
    // Update UI
    updatePlaylistUI();
    updateHistoryUI();
    updateFavoritesUI();
    
    // Kirim ke server
    socket.send(JSON.stringify({
        type: 'updateFavorites',
        favorites: favoritesList
    }));
    
    return !isFavorite; // Kembalikan status favorit baru
}

/**
 * Memeriksa apakah video ada di daftar favorit
 * @param {string} videoId - ID video YouTube
 * @return {boolean} True jika video ada di favorit
 */
function isVideoFavorite(videoId) {
    return favoritesList.some(video => video.videoId === videoId);
}

/**
 * Menampilkan menu konteks playlist
 * @param {number} index - Indeks item di playlist
 */
function showPlaylistMenu(index) {
    const menu = document.getElementById('playlistMenu');
    menu.classList.add('active');
    activePlaylistItemIndex = index;
    
    // Siapkan aksi tombol menu
    const moveTopBtn = menu.querySelector('.move-top');
    const moveUpBtn = menu.querySelector('.move-up');
    const moveDownBtn = menu.querySelector('.move-down');
    const removeBtn = menu.querySelector('.remove-item');
    
    // Aktifkan/nonaktifkan tombol berdasarkan posisi
    moveTopBtn.style.display = index > 0 ? 'flex' : 'none';
    moveUpBtn.style.display = index > 0 ? 'flex' : 'none';
    moveDownBtn.style.display = index < playlist.length - 1 ? 'flex' : 'none';
    
    // Atur event listener
    moveTopBtn.onclick = function() {
        socket.send(JSON.stringify({
            type: 'movePlaylistItem',
            fromIndex: index,
            toIndex: 0
        }));
        hidePlaylistMenu();
    };
    
    moveUpBtn.onclick = function() {
        socket.send(JSON.stringify({
            type: 'movePlaylistItem',
            fromIndex: index,
            toIndex: index - 1
        }));
        hidePlaylistMenu();
    };
    
    moveDownBtn.onclick = function() {
        socket.send(JSON.stringify({
            type: 'movePlaylistItem',
            fromIndex: index,
            toIndex: index + 1
        }));
        hidePlaylistMenu();
    };
    
    removeBtn.onclick = function() {
        socket.send(JSON.stringify({
            type: 'removeFromPlaylist',
            index: index
        }));
        hidePlaylistMenu();
    };
    
    // Tutup menu saat klik di luar
    document.addEventListener('click', closeMenuOnOutsideClick);
}

/**
 * Menyembunyikan menu konteks playlist
 */
function hidePlaylistMenu() {
    const menu = document.getElementById('playlistMenu');
    menu.classList.remove('active');
    activePlaylistItemIndex = null;
    
    // Hapus listener untuk klik di luar
    document.removeEventListener('click', closeMenuOnOutsideClick);
}

/**
 * Fungsi untuk menutup menu saat klik di luar
 * @param {Event} e - Event klik
 */
function closeMenuOnOutsideClick(e) {
    const menu = document.getElementById('playlistMenu');
    
    // Periksa apakah klik di luar menu dan bukan pada tombol menu
    if (!menu.contains(e.target) && !e.target.closest('.menu-button')) {
        hidePlaylistMenu();
    }
}

/**
 * Memperbarui tampilan playlist
 */
function updatePlaylistUI() {
    const playlistContainer = document.getElementById('playlistContainer');
    
    if (playlist.length === 0) {
        playlistContainer.innerHTML = '<p class="empty-playlist">Tidak ada video dalam playlist</p>';
        return;
    }
    
    playlistContainer.innerHTML = '';
    
    playlist.forEach((video, index) => {
        const isFavorite = isVideoFavorite(video.videoId);
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';
        playlistItem.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}" class="thumbnail">
            <div class="playlist-info">
                <h3 class="playlist-title">${video.title}</h3>
                <p class="playlist-author">${video.author}</p>
            </div>
            
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${video.videoId}">
                <i class="fas fa-star"></i>
            </button>
            <button class="menu-button" data-index="${index}">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        `;
        
        // Tambahkan event click untuk memutar video ini
        playlistItem.addEventListener('click', (e) => {
            // Jangan aktifkan jika klik pada tombol menu atau tombol favorit
            if (!e.target.closest('.menu-button') && !e.target.closest('.favorite-btn')) {
                socket.send(JSON.stringify({
                    type: 'playPlaylistItem',
                    index: index
                }));
            }
        });
        
        playlistContainer.appendChild(playlistItem);
    });
    
    // Tambahkan event listener untuk tombol menu
    document.querySelectorAll('.menu-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(button.getAttribute('data-index'));
            showPlaylistMenu(index);
        });
    });
    
    // Tambahkan event listener untuk tombol favorit
    document.querySelectorAll('#playlistContainer .favorite-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = button.getAttribute('data-id');
            toggleFavorite(videoId);
        });
    });
}

/**
 * Memperbarui tampilan riwayat tontonan
 */
function updateHistoryUI() {
    const historyContainer = document.getElementById('historyContainer');
    
    if (historyList.length === 0) {
        historyContainer.innerHTML = '<p class="empty-playlist">Belum ada riwayat tontonan</p>';
        return;
    }
    
    historyContainer.innerHTML = '';
    
    historyList.forEach((video, index) => {
        const isFavorite = isVideoFavorite(video.videoId);
        const dateStr = new Date(video.timestamp).toLocaleString('id-ID');
        
        const historyItem = document.createElement('div');
        historyItem.className = 'playlist-item';
        historyItem.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}" class="thumbnail">
            <div class="playlist-info">
                <h3 class="playlist-title">${video.title}</h3>
                <p class="playlist-author">${video.author}</p>
                <p class="watched-date">Ditonton: ${dateStr}</p>
            </div>
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${video.videoId}">
                <i class="fas fa-star"></i>
            </button>
        `;
        
        // Tambahkan event click untuk memutar video dari riwayat
        historyItem.addEventListener('click', (e) => {
            // Jangan aktifkan jika klik pada tombol favorit
            if (!e.target.closest('.favorite-btn')) {
                // Tambahkan ke playlist dan putar langsung
                socket.send(JSON.stringify({
                    type: 'addToPlaylist',
                    video: video
                }));
                
                // Delay kecil untuk memastikan video ditambahkan ke playlist
                setTimeout(() => {
                    socket.send(JSON.stringify({
                        type: 'play',
                        videoId: video.videoId
                    }));
                }, 100);
            }
        });
        
        historyContainer.appendChild(historyItem);
    });
    
    // Tambahkan event listener untuk tombol favorit
    document.querySelectorAll('#historyContainer .favorite-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = button.getAttribute('data-id');
            toggleFavorite(videoId);
        });
    });
}

/**
 * Memperbarui tampilan favorit
 */
function updateFavoritesUI() {
    const favoritesContainer = document.getElementById('favoritesContainer');
    
    if (favoritesList.length === 0) {
        favoritesContainer.innerHTML = '<p class="empty-playlist">Belum ada video favorit</p>';
        return;
    }
    
    favoritesContainer.innerHTML = '';
    
    favoritesList.forEach((video) => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'playlist-item';
        favoriteItem.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}" class="thumbnail">
            <div class="playlist-info">
                <h3 class="playlist-title">${video.title}</h3>
                <p class="playlist-author">${video.author}</p>
            </div>
            <div >
                <button class="favorite-btn active" data-id="${video.videoId}">
                    <i class="fas fa-star"></i>
                </button>
            </div>

        `;
        
        // Tambahkan event click untuk memutar video favorit
        favoriteItem.addEventListener('click', (e) => {
            // Jangan aktifkan jika klik pada tombol favorit
            if (!e.target.closest('.favorite-btn')) {
                // Tambahkan ke playlist dan putar langsung
                socket.send(JSON.stringify({
                    type: 'addToPlaylist',
                    video: video
                }));
                
                // Delay kecil untuk memastikan video ditambahkan ke playlist
                setTimeout(() => {
                    socket.send(JSON.stringify({
                        type: 'play',
                        videoId: video.videoId
                    }));
                }, 100);
            }
        });
        
        favoritesContainer.appendChild(favoriteItem);
    });
    
    // Tambahkan event listener untuk tombol favorit
    document.querySelectorAll('#favoritesContainer .favorite-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = button.getAttribute('data-id');
            toggleFavorite(videoId);
        });
    });
}

/**
 * Mencari video berdasarkan keyword
 * @param {boolean} newSearch - True jika pencarian baru, false jika load more
 */
async function searchVideos(newSearch = true) {
    const searchInput = document.getElementById('searchInput');
    const videosContainer = document.getElementById('videosContainer');
    
    if (!searchInput.value.trim() || isLoading) {
        // Jika kotak pencarian dikosongkan, tampilkan history
        if (searchInput.value.trim() === '' && newSearch) {
            displayHistoryOnHome(true);
        }
        return;
    }

    try {
        isLoading = true;

        if (newSearch) {
            videosContainer.innerHTML = '<div class="loading">Memuat video...</div>';
            hasMore = true;
        }

        const endpoint = newSearch ? '/search' : '/load-more';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ keyword: searchInput.value })
        });

        const data = await response.json();
        
        if (data.videos && data.videos.length > 0) {
            if (newSearch) {
                videosContainer.innerHTML = '';
            }

            data.videos.forEach(video => {
                const isFavorite = isVideoFavorite(video.videoId);
                const videoCard = document.createElement('div');
                videoCard.className = 'video-card';
                videoCard.innerHTML = `
                    <img src="${video.thumbnail}" alt="${video.title}" class="thumbnail" loading="lazy">
                    <div class="video-info">
                        <h3 class="video-title">${video.title}</h3>
                        <p class="video-author">${video.author}</p>
                        <p class="video-views">${video.views} • ${video.duration}</p>
                    </div>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${video.videoId}">
                        <i class="fas fa-star"></i>
                    </button>
                `;
                
                // Tambahkan event listener untuk menambah ke playlist
                videoCard.addEventListener('click', (e) => {
                    // Jangan aktifkan jika klik pada tombol favorit
                    if (!e.target.closest('.favorite-btn')) {
                        // Tambahkan timestamp ke video sebelum dikirim
                        const videoWithTimestamp = {
                            ...video,
                            timestamp: Date.now()
                        };
                        
                        socket.send(JSON.stringify({
                            type: 'addToPlaylist',
                            video: videoWithTimestamp
                        }));
                        
                        // Umpan balik visual
                        const originalBackgroundColor = videoCard.style.backgroundColor;
                        videoCard.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                        setTimeout(() => {
                            videoCard.style.backgroundColor = originalBackgroundColor;
                        }, 300);
                    }
                });
                
                // Tambahkan event listener untuk tombol favorit (direct pada elemen, bukan delegasi)
                const favoriteBtn = videoCard.querySelector('.favorite-btn');
                favoriteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const videoId = favoriteBtn.getAttribute('data-id');
                    
                    // Buat objek video untuk favorit
                    const videoData = {
                        videoId: video.videoId,
                        title: video.title,
                        author: video.author,
                        thumbnail: video.thumbnail,
                        views: video.views,
                        duration: video.duration,
                        timestamp: Date.now()
                    };
                    
                    // Toggle favorit dan dapatkan status baru
                    const isNowFavorite = toggleFavorite(videoId, videoData);
                    
                    // Update kelas tombol sesuai status baru
                    favoriteBtn.classList.toggle('active', isNowFavorite);
                });
                
                videosContainer.appendChild(videoCard);
            });

            hasMore = data.hasMore;
        } else if (newSearch) {
            videosContainer.innerHTML = '<p>Tidak ada video ditemukan</p>';
        }

    } catch (error) {
        console.error('Error:', error);
        if (newSearch) {
            videosContainer.innerHTML = '<p>Error saat mengambil video. Silakan coba lagi.</p>';
        }
    } finally {
        isLoading = false;
        // Hapus indikator loading jika ada
        const loadingEl = document.querySelector('.loading');
        if (loadingEl) loadingEl.remove();
    }
}

/**
 * Handler infinite scroll
 * Muat lebih banyak video saat scroll mendekati bawah halaman
 */
window.addEventListener('scroll', () => {
    const isNearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
    const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
    
    if (isNearBottom && activeTab === 'search') {
        // Gunakan logika yang sesuai berdasarkan status pencarian
        const searchInput = document.getElementById('searchInput');
        if (searchInput.value.trim() && hasMore && !isLoading) {
            searchVideos(false);
        } 
        // Jika kotak pencarian kosong, load more history
        else if (!searchInput.value.trim() && historyHasMore && !isLoadingHistory) {
            displayHistoryOnHome(false);
        }
    }
});

/**
 * Cari video saat tombol Enter ditekan pada kotak pencarian
 */
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchVideos(true);
    }
});

/**
 * Event listener untuk input pencarian
 */
document.getElementById('searchInput').addEventListener('input', (e) => {
    // Jika input dikosongkan, tampilkan history
    if (e.target.value.trim() === '') {
        displayHistoryOnHome(true);
    }
});

/**
 * Membersihkan riwayat tontonan
 */
function clearHistory() {
    showCustomConfirm('Anda yakin ingin menghapus semua riwayat tontonan?', () => {
        historyList = [];
        updateHistoryUI();
        
        // Perbarui tampilan beranda jika tab aktif adalah search
        const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        if (activeTab === 'search') {
            displayHistoryOnHome(true);
        }
        
        // Kirim ke server
        socket.send(JSON.stringify({
            type: 'updateHistory',
            history: []
        }));
    });
}

/**
 * Menampilkan dialog konfirmasi kustom
 * @param {string} message - Pesan yang ditampilkan
 * @param {Function} onConfirm - Fungsi yang dijalankan jika konfirmasi
 */
function showCustomConfirm(message, onConfirm) {
    // Cek apakah sudah ada dialog
    const existingDialog = document.querySelector('.custom-confirm-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    // Buat elemen dialog
    const dialog = document.createElement('div');
    dialog.className = 'custom-confirm-dialog';
    
    dialog.innerHTML = `
        <div class="confirm-content">
            <p>${message}</p>
            <div class="confirm-buttons">
                <button class="btn-cancel">Batal</button>
                <button class="btn-confirm">Hapus</button>
            </div>
        </div>
    `;
    
    // Tambahkan ke DOM
    document.body.appendChild(dialog);
    
    // Event listener untuk tombol
    dialog.querySelector('.btn-cancel').addEventListener('click', () => {
        dialog.remove();
    });
    
    dialog.querySelector('.btn-confirm').addEventListener('click', () => {
        onConfirm();
        dialog.remove();
    });
    
    // Tambahkan event untuk klik di luar dialog
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });
}

// Inisialisasi semua saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    initTabs();
    initPlayerControls();
    
    // Tampilkan history di beranda saat pertama kali load
    displayHistoryOnHome(true);
    
    // Tombol hapus riwayat
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
});