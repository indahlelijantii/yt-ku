// Variabel global untuk aplikasi
let socket;
let player;
let playerReady = false;
let playlist = [];
let historyList = [];
let favoritesList = [];
let isPlaylistCollapsed = false;
let isSidebarCollapsed = false;
let playerState = {
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 100,
    videoId: null
};
let progressInterval = null;

// Initialize YouTube API
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'rel': 0,
            'showinfo': 0,
            'modestbranding': 1,
            'fs': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

// Handle YouTube player errors
function onPlayerError(event) {
    console.error('YouTube Player Error:', event.data);
    
    // Error codes:
    // 2 - Invalid video ID
    // 5 - Video can't be played in HTML5 player
    // 100 - Video not found
    // 101, 150 - Video embedding not allowed
    
    const errorMessages = {
        2: 'ID video tidak valid',
        5: 'Video tidak dapat diputar di player',
        100: 'Video tidak ditemukan',
        101: 'Video tidak diizinkan untuk diputar Oleh Channel Pemiliknya',
        150: 'DILARANG MELIHAT YANG BEGITUAN..!!'
    };
    
    // Show error to user
    document.getElementById('noVideoOverlay').style.display = 'block';
    document.getElementById('noVideoOverlay').querySelector('.overlay-text').textContent = 
        'Error: ' + (errorMessages[event.data] || 'Tidak dapat memutar video');
    
    // Notify server about error
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'playerError',
            errorCode: event.data,
            videoId: playerState.videoId
        }));
    }
    
    // Try to play next video after a few seconds
    setTimeout(() => {
        socket.send(JSON.stringify({ type: 'playNext' }));
    }, 3000);
}

function onPlayerReady(event) {
    playerReady = true;
    player.setVolume(playerState.volume);
    
    // Start progress tracking interval
    progressInterval = setInterval(updateProgress, 1000);
    
    // Periksa apakah ada playlist yang bisa diputar secara otomatis
    if (playlist.length > 0 && !playerState.videoId && !playerState.playing) {
        // Auto-play item pertama dari playlist
        socket.send(JSON.stringify({
            type: 'playPlaylistItem',
            index: 0
        }));
    }
}

function onPlayerStateChange(event) {
    // 1 = playing, 2 = paused, 0 = ended
    if (event.data === YT.PlayerState.PLAYING) {
        playerState.playing = true;
        updatePlayerStateOnServer();
        
        // Update overlay visibility
        document.getElementById('noVideoOverlay').style.display = 'none';
        
        // Pindahkan video ke history dan hapus dari playlist saat pertama kali diputar
        moveToHistory(playerState.videoId);
    } 
    else if (event.data === YT.PlayerState.PAUSED) {
        playerState.playing = false;
        updatePlayerStateOnServer();
    }
    else if (event.data === YT.PlayerState.ENDED) {
        playerState.playing = false;
        
        // Play next video in playlist
        socket.send(JSON.stringify({ type: 'playNext' }));
    }
}

function moveToHistory(videoId) {
    // Find the video in the playlist
    const videoIndex = playlist.findIndex(video => video.videoId === videoId);
    
    if (videoIndex !== -1) {
        const video = playlist[videoIndex];
        
        // Add to history if not already there
        if (!historyList.some(item => item.videoId === videoId)) {
            historyList.unshift({...video, timestamp: Date.now()});
            
            // Limit history to 50 items
            if (historyList.length > 50) {
                historyList.pop();
            }
            
            // Update history UI
            updateHistoryUI();
            
            // Save history to server
            socket.send(JSON.stringify({
                type: 'updateHistory',
                history: historyList
            }));
        }
        
        // Remove from local playlist
        playlist.splice(videoIndex, 1);
        
        // Remove from server playlist
        socket.send(JSON.stringify({
            type: 'removeFromPlaylist',
            index: videoIndex
        }));
        
        // Update playlist UI after removal
        updatePlaylistUI();
    }
}

function updateProgress() {
    if (playerReady && player && player.getCurrentTime) {
        try {
            playerState.currentTime = player.getCurrentTime() || 0;
            playerState.duration = player.getDuration() || 0;
            
            // Only send updates every 3 seconds to reduce traffic
            if (Math.round(playerState.currentTime) % 3 === 0) {
                socket.send(JSON.stringify({
                    type: 'progress',
                    currentTime: playerState.currentTime,
                    duration: playerState.duration
                }));
            }
        } catch (e) {
            console.error('Error updating progress:', e);
        }
    }
}

function updatePlayerStateOnServer() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'playerState',
            state: playerState
        }));
    }
}

// Fungsi untuk navigasi scroll pada playlist
function scrollPlaylistItem(container, direction) {
    // Dapatkan semua item playlist
    const items = container.querySelectorAll('.playlist-item');
    if (items.length === 0) return;
    
    // Dapatkan tinggi rata-rata item
    let itemHeight = 0;
    for (let i = 0; i < Math.min(items.length, 3); i++) {
        itemHeight += items[i].offsetHeight + 
                      parseInt(window.getComputedStyle(items[i]).marginBottom);
    }
    itemHeight = itemHeight / Math.min(items.length, 3);
    
    // Scroll berdasarkan arah
    if (direction === 'up') {
        container.scrollTop -= itemHeight;
    } else if (direction === 'down') {
        container.scrollTop += itemHeight;
    }
}

// Fungsi untuk membuat dan menambahkan tombol scroll
function createScrollButtons() {
    // Dapatkan semua playlist headers
    const playlistHeaders = document.querySelectorAll('.playlist-header');
    
    playlistHeaders.forEach(header => {
        // Periksa apakah tombol scroll sudah ada
        if (header.querySelector('.scroll-buttons')) return;
        
        // Hapus tombol toggle yang lama jika ada
        const oldToggle = header.querySelector('.playlist-toggle');
        if (oldToggle) {
            header.removeChild(oldToggle);
        }
        
        // Buat container untuk tombol scroll
        const scrollBtnsContainer = document.createElement('div');
        scrollBtnsContainer.className = 'scroll-buttons';
        
        // Buat tombol scroll up
        const scrollUpBtn = document.createElement('button');
        scrollUpBtn.className = 'scroll-btn scroll-up-btn';
        scrollUpBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        scrollUpBtn.title = 'Scroll ke atas';
        
        // Buat tombol scroll down
        const scrollDownBtn = document.createElement('button');
        scrollDownBtn.className = 'scroll-btn scroll-down-btn';
        scrollDownBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        scrollDownBtn.title = 'Scroll ke bawah';
        
        // Tambahkan tombol ke container
        scrollBtnsContainer.appendChild(scrollUpBtn);
        scrollBtnsContainer.appendChild(scrollDownBtn);
        
        // Tambahkan container ke header
        header.appendChild(scrollBtnsContainer);
        
        // Dapatkan container playlist yang terkait
        const playlistContainer = header.nextElementSibling;
        if (!playlistContainer || !playlistContainer.classList.contains('playlist-items')) return;
        
        // Tambahkan event listener untuk tombol
        scrollUpBtn.addEventListener('click', () => {
            scrollPlaylistItem(playlistContainer, 'up');
        });
        
        scrollDownBtn.addEventListener('click', () => {
            scrollPlaylistItem(playlistContainer, 'down');
        });
    });
}

// Inisialisasi fitur navigasi scroll
function initScrollNavigation() {
    // Tambahkan tombol scroll ke semua playlist
    createScrollButtons();
    
    // Pasang observer untuk menangkap perubahan DOM
    const observer = new MutationObserver(mutations => {
        // Periksa apakah ada perubahan yang relevan
        let shouldUpdate = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                // Periksa apakah ada elemen playlist header yang baru
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && (
                        node.classList.contains('playlist-header') ||
                        node.querySelector('.playlist-header')
                    )) {
                        shouldUpdate = true;
                        break;
                    }
                }
                if (shouldUpdate) break;
            }
        }
        
        // Jika ada perubahan relevan, update tombol
        if (shouldUpdate) {
            createScrollButtons();
        }
    });
    
    // Perhatikan perubahan pada seluruh body
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
}

// Initialize sidebar
function initSidebar() {
    // Get sidebar toggle button
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const mouseOverlay = document.getElementById('mouseOverlay'); // Tambahkan ini

    // Toggle sidebar pada klik tombol
    toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        isSidebarCollapsed = sidebar.classList.contains('collapsed');
        
        // Update tombol toggle
        if (isSidebarCollapsed) {
            toggleSidebarBtn.innerHTML = '<i class="fas fa-bars"></i>';
        } else {
            toggleSidebarBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
    });

    // Tambahkan event listener untuk mouseOverlay
    mouseOverlay.addEventListener('click', () => {
        toggleSidebarBtn.click();
    });

    // Add resize listener to adjust playlist height
    window.addEventListener('resize', adjustPlaylistHeight);
    
    // Call once initially
    adjustPlaylistHeight();
}

function adjustPlaylistHeight() {
    const playlistContainers = document.querySelectorAll('.playlist-items');
    const mainPlayer = document.querySelector('.main-player');
    const playerHeight = mainPlayer ? mainPlayer.offsetHeight : window.innerHeight;
    
    playlistContainers.forEach(container => {
        const headerHeight = container.previousElementSibling ? 
                           container.previousElementSibling.offsetHeight : 50;
        container.style.maxHeight = `${playerHeight - headerHeight}px`;
    });
}

// Initialize sidebar tabs
function initSidebarTabs() {
    const tabs = document.querySelectorAll('.sidebar-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Activate clicked tab
            tab.classList.add('active');
            
            // Hide all content
            document.querySelectorAll('.sidebar-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show related content
            const tabName = tab.getAttribute('data-tab');
            document.querySelector(`.sidebar-content[data-content="${tabName}"]`).classList.add('active');
        });
    });
}

// Toggle favorite status
function toggleFavorite(videoId) {
    const videoIndex = favoritesList.findIndex(video => video.videoId === videoId);
    
    if (videoIndex === -1) {
        // Add to favorites
        const video = playlist.find(v => v.videoId === videoId) || 
                      historyList.find(v => v.videoId === videoId);
                      
        if (video) {
            favoritesList.push({...video});
            
            // Save favorites to server
            socket.send(JSON.stringify({
                type: 'updateFavorites',
                favorites: favoritesList
            }));
            
            // Update UI
            updateFavoritesUI();
            updatePlaylistUI();
            updateHistoryUI();
        }
    } else {
        // Remove from favorites
        favoritesList.splice(videoIndex, 1);
        
        // Save favorites to server
        socket.send(JSON.stringify({
            type: 'updateFavorites',
            favorites: favoritesList
        }));
        
        // Update UI
        updateFavoritesUI();
        updatePlaylistUI();
        updateHistoryUI();
    }
}

// Check if video is in favorites
function isVideoFavorite(videoId) {
    return favoritesList.some(video => video.videoId === videoId);
}

// Connect to WebSocket server
function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = function() {
        console.log('Connected to server');
        const statusIndicator = document.getElementById('connectionStatus');
        statusIndicator.classList.add('connected');
        statusIndicator.classList.remove('disconnected');
        statusIndicator.title = 'Terhubung';
        
        // Register as a player
        socket.send(JSON.stringify({
            type: 'register',
            clientType: 'player'
        }));
    };
    
    socket.onclose = function() {
        console.log('Disconnected from server');
        const statusIndicator = document.getElementById('connectionStatus');
        statusIndicator.classList.remove('connected');
        statusIndicator.classList.add('disconnected');
        statusIndicator.title = 'Terputus';
        
        // Try to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
    };
    
    socket.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
    
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);
        
        if (data.type === 'play') {
            if (data.videoId) {
                if (playerState.videoId !== data.videoId) {
                    playerState.videoId = data.videoId;
                    player.loadVideoById(data.videoId);
                } else {
                    player.playVideo();
                }
                playerState.playing = true;
                document.getElementById('noVideoOverlay').style.display = 'none';
            }
        }
        else if (data.type === 'pause') {
            player.pauseVideo();
            playerState.playing = false;
        }
        else if (data.type === 'volume') {
            player.setVolume(data.value);
            playerState.volume = data.value;
        }
        else if (data.type === 'seek') {
            player.seekTo(data.time, true);
            playerState.currentTime = data.time;
        }
        else if (data.type === 'playlist') {
            playlist = data.playlist;
            updatePlaylistUI();
            
            // Auto-play jika playlist baru muncul dan player tidak sedang memutar
            if (playlist.length > 0 && playerReady && !playerState.playing && !playerState.videoId) {
                socket.send(JSON.stringify({
                    type: 'playPlaylistItem',
                    index: 0
                }));
            }
        }
        else if (data.type === 'history') {
            historyList = data.history;
            updateHistoryUI();
        }
        else if (data.type === 'favorites') {
            favoritesList = data.favorites;
            updateFavoritesUI();
        }
        else if (data.type === 'playerState') {
            playerState = data.state;
        }
    };
}

// Update playlist UI
function updatePlaylistUI() {
    const playlistContainer = document.getElementById('playlistItems');
    
    if (playlist.length === 0) {
        playlistContainer.innerHTML = '<div class="empty-playlist">Tidak ada video dalam playlist</div>';
        return;
    }
    
    playlistContainer.innerHTML = '';
    
    playlist.forEach((video, index) => {
        const isActive = video.videoId === playerState.videoId;
        const isFavorite = isVideoFavorite(video.videoId);
        
        const itemElement = document.createElement('div');
        itemElement.className = `playlist-item ${isActive ? 'active' : ''}`;
        itemElement.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}">
            <div class="playlist-info">
                <h3>${video.title}</h3>
                <p>${video.author}</p>
            </div>
            <div class="playlist-actions">
                <button class="delete-btn" data-index="${index}" title="Hapus dari playlist">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${video.videoId}">
                    <i class="fas fa-star"></i>
                </button>
            </div>
        `;
        
        itemElement.querySelector('.playlist-info').addEventListener('click', () => {
            socket.send(JSON.stringify({
                type: 'playPlaylistItem',
                index: index
            }));
        });
        
        // Event untuk tombol hapus
        itemElement.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            socket.send(JSON.stringify({
                type: 'removeFromPlaylist',
                index: index
            }));
        });
        
        itemElement.querySelector('.favorite-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(video.videoId);
        });
        
        playlistContainer.appendChild(itemElement);
    });
}

// Update history UI
function updateHistoryUI() {
    const historyContainer = document.getElementById('historyItems');
    
    if (historyList.length === 0) {
        historyContainer.innerHTML = '<div class="empty-playlist">Tidak ada riwayat tontonan</div>';
        return;
    }
    
    historyContainer.innerHTML = '';
    
    historyList.forEach((video) => {
        const isActive = video.videoId === playerState.videoId;
        const isFavorite = isVideoFavorite(video.videoId);
        const hasError = video.error || false;
        const dateStr = new Date(video.timestamp).toLocaleString('id-ID');
        
        const itemElement = document.createElement('div');
        itemElement.className = `playlist-item ${isActive ? 'active' : ''}`;
        itemElement.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}">
            <div class="playlist-info">
                <h3>${video.title} ${hasError ? '<i class="fas fa-exclamation-triangle error-indicator"></i>' : ''}</h3>
                <p>${video.author}</p>
                <p class="watched-date">Ditonton: ${dateStr}</p>
            </div>
            <div class="playlist-actions">
                <button class="add-to-playlist-btn" data-id="${video.videoId}" title="Tambahkan ke playlist">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${video.videoId}" title="Favorit">
                    <i class="fas fa-star"></i>
                </button>
            </div>
        `;
        
        itemElement.querySelector('.add-to-playlist-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = e.target.closest('.add-to-playlist-btn').getAttribute('data-id');
            
            // Cari video di historyList
            const video = historyList.find(v => v.videoId === videoId);
            if (video) {
                socket.send(JSON.stringify({
                    type: 'addToPlaylist',
                    video: video
                }));
                
                // Umpan balik visual
                const button = e.target.closest('.add-to-playlist-btn');
                const originalColor = button.style.color;
                button.style.color = 'red';
                setTimeout(() => {
                    button.style.color = originalColor;
                }, 300);
            }
        });
        
        // Tambahkan event handler untuk tombol favorit
        itemElement.querySelector('.favorite-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(video.videoId);
        });
        
        historyContainer.appendChild(itemElement);
    });
}

// Update favorites UI
function updateFavoritesUI() {
    const favoritesContainer = document.getElementById('favoritesItems');
    
    if (favoritesList.length === 0) {
        favoritesContainer.innerHTML = '<div class="empty-playlist">Tidak ada video favorit</div>';
        return;
    }
    
    favoritesContainer.innerHTML = '';
    
    favoritesList.forEach((video, index) => {
        const isActive = video.videoId === playerState.videoId;
        
        const itemElement = document.createElement('div');
        itemElement.className = `playlist-item ${isActive ? 'active' : ''}`;
        itemElement.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}">
            <div class="playlist-info">
                <h3>${video.title}</h3>
                <p>${video.author}</p>
            </div>
            <div class="playlist-actions">
                <button class="add-to-playlist-btn" data-id="${video.videoId}" title="Tambahkan ke playlist">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="remove-favorite-btn" data-index="${index}" title="Hapus dari favorit">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        itemElement.querySelector('.add-to-playlist-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = e.target.closest('.add-to-playlist-btn').getAttribute('data-id');
            
            // Cari video di favoritesList
            const video = favoritesList.find(v => v.videoId === videoId);
            if (video) {
                socket.send(JSON.stringify({
                    type: 'addToPlaylist',
                    video: video
                }));
                
                // Umpan balik visual
                const button = e.target.closest('.add-to-playlist-btn');
                const originalColor = button.style.color;
                button.style.color = 'red';
                setTimeout(() => {
                    button.style.color = originalColor;
                }, 300);
            }
        });
        
        // Tambahkan event handler untuk tombol hapus favorit
        itemElement.querySelector('.remove-favorite-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            favoritesList.splice(index, 1);
            
            // Simpan ke server
            socket.send(JSON.stringify({
                type: 'updateFavorites',
                favorites: favoritesList
            }));
            
            // Update UI
            updateFavoritesUI();
            updatePlaylistUI();
            updateHistoryUI();
        });
        
        favoritesContainer.appendChild(itemElement);
    });
}

// Clear watch history
function clearHistory() {
    if (confirm('Apakah Anda yakin ingin menghapus semua riwayat tontonan?')) {
        historyList = [];
        updateHistoryUI();
        
        socket.send(JSON.stringify({
            type: 'updateHistory',
            history: []
        }));
    }
}

// Initialize everything when page loads
window.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    initSidebarTabs();
    initSidebar();
    initScrollNavigation();
    
    // Set up event listeners
    document.getElementById('clearHistory').addEventListener('click', clearHistory);
});