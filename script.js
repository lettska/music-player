// Audio player setup
const audio = new Audio();
let currentSongIndex = 0;
let songs = [];
let isAdmin = false;

// DOM elements
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const volumeSlider = document.getElementById('volume');
const progressBar = document.querySelector('.progress');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const coverImage = document.getElementById('cover');
const playlist = document.getElementById('playlist');
const uploadForm = document.getElementById('upload-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const uploadSection = document.querySelector('.upload-section');

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', playPrevious);
nextBtn.addEventListener('click', playNext);
volumeSlider.addEventListener('input', setVolume);
audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('ended', playNext);
audio.addEventListener('loadedmetadata', updateDuration);
uploadForm.addEventListener('submit', handleUpload);

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        isAdmin = true;
        uploadSection.style.display = 'block';
        loginForm.style.display = 'none';
        logoutBtn.style.display = 'block';
        loginForm.reset();
    } else {
        alert('Invalid credentials. Please try again.');
    }
}

function handleLogout() {
    isAdmin = false;
    uploadSection.style.display = 'none';
    loginForm.style.display = 'block';
    logoutBtn.style.display = 'none';
}

function handleUpload(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        alert('You must be an admin to upload songs');
        return;
    }

    const songFile = document.getElementById('song-file').files[0];
    const coverFile = document.getElementById('cover-image').files[0];
    const songName = document.getElementById('song-name').value;
    const artistName = document.getElementById('artist-name').value;

    if (!songFile || !coverFile || !songName || !artistName) {
        alert('Please fill in all fields');
        return;
    }

    const song = {
        name: songName,
        artist: artistName,
        file: URL.createObjectURL(songFile),
        cover: URL.createObjectURL(coverFile)
    };

    songs.push(song);
    addSongToPlaylist(song);
    uploadForm.reset();

    if (songs.length === 1) {
        loadSong(0);
    }
}

function addSongToPlaylist(song) {
    const li = document.createElement('li');
    li.innerHTML = `
        <span>${song.name} - ${song.artist}</span>
        ${isAdmin ? `
            <button class="delete-btn" onclick="deleteSong(${songs.length - 1})">
                <i class="fas fa-trash"></i>
            </button>
        ` : ''}
    `;
    li.addEventListener('click', () => loadSong(songs.indexOf(song)));
    playlist.appendChild(li);
}

function deleteSong(index) {
    if (!isAdmin) {
        alert('You must be an admin to delete songs');
        return;
    }

    if (currentSongIndex === index) {
        if (songs.length > 1) {
            playNext();
        } else {
            audio.pause();
            playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
        }
    }
    
    songs.splice(index, 1);
    playlist.innerHTML = '';
    songs.forEach((song, i) => addSongToPlaylist(song));
    
    if (currentSongIndex >= songs.length) {
        currentSongIndex = Math.max(0, songs.length - 1);
    }
}

function loadSong(index) {
    if (songs.length === 0) return;
    
    currentSongIndex = index;
    const song = songs[index];
    
    audio.src = song.file;
    coverImage.src = song.cover;
    songTitle.textContent = song.name;
    songArtist.textContent = song.artist;
    
    audio.play();
    playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
}

function togglePlay() {
    if (songs.length === 0) return;
    
    if (audio.paused) {
        audio.play();
        playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
    } else {
        audio.pause();
        playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
    }
}

function playPrevious() {
    if (songs.length === 0) return;
    
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    loadSong(currentSongIndex);
}

function playNext() {
    if (songs.length === 0) return;
    
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    loadSong(currentSongIndex);
}

function setVolume() {
    audio.volume = volumeSlider.value;
}

function updateProgress() {
    const { currentTime, duration } = audio;
    const progressPercent = (currentTime / duration) * 100;
    progressBar.style.width = `${progressPercent}%`;
    
    // Update time display
    currentTimeEl.textContent = formatTime(currentTime);
}

function updateDuration() {
    durationEl.textContent = formatTime(audio.duration);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 