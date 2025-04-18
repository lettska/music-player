// Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "harryo-65117.firebaseapp.com",
    databaseURL: "https://harryo-65117-default-rtdb.firebaseio.com",
    projectId: "harryo-65117",
    storageBucket: "harryo-65117.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();
const auth = firebase.auth();

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
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin123";

// Check admin status
function checkAdminStatus(user) {
    if (user) {
        database.ref('admins').child(user.uid).once('value')
            .then(snapshot => {
                isAdmin = snapshot.exists();
                updateUIForAdminStatus();
            })
            .catch(error => {
                console.error('Error checking admin status:', error);
                isAdmin = false;
                updateUIForAdminStatus();
            });
    } else {
        isAdmin = false;
        updateUIForAdminStatus();
    }
}

// Update UI based on admin status
function updateUIForAdminStatus() {
    if (isAdmin) {
        uploadSection.style.display = 'block';
        loginForm.style.display = 'none';
        logoutBtn.style.display = 'block';
    } else {
        uploadSection.style.display = 'none';
        loginForm.style.display = 'block';
        logoutBtn.style.display = 'none';
    }
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            checkAdminStatus(userCredential.user);
        })
        .catch(error => {
            console.error('Login error:', error);
            alert('Invalid credentials. Please try again.');
        });
}

// Handle logout
function handleLogout() {
    auth.signOut()
        .then(() => {
            isAdmin = false;
            updateUIForAdminStatus();
        })
        .catch(error => {
            console.error('Logout error:', error);
        });
}

// Auth state listener
auth.onAuthStateChanged(user => {
    checkAdminStatus(user);
});

// Load songs from Firebase on page load
function loadSongsFromFirebase() {
    database.ref('songs').on('value', (snapshot) => {
        const songsData = snapshot.val();
        if (songsData) {
            songs = Object.values(songsData);
            playlist.innerHTML = '';
            songs.forEach((song, index) => {
                addSongToPlaylist(song, index);
            });
        } else {
            songs = [];
            playlist.innerHTML = '';
        }
    });
}

// Save songs to Firebase
function saveSongsToFirebase() {
    const songsRef = database.ref('songs');
    songsRef.set(songs)
        .then(() => {
            console.log('Songs saved successfully');
        })
        .catch((error) => {
            console.error('Error saving songs:', error);
        });
}

// Modified handleUpload function to save files to Firebase Storage
async function handleUpload(e) {
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

    try {
        // Upload song file
        const songRef = storage.ref().child(`songs/${songFile.name}`);
        const songSnapshot = await songRef.put(songFile);
        const songUrl = await songSnapshot.ref.getDownloadURL();

        // Upload cover image
        const coverRef = storage.ref().child(`covers/${coverFile.name}`);
        const coverSnapshot = await coverRef.put(coverFile);
        const coverUrl = await coverSnapshot.ref.getDownloadURL();

        const song = {
            name: songName,
            artist: artistName,
            file: songUrl,
            cover: coverUrl,
            timestamp: Date.now()
        };

        songs.push(song);
        saveSongsToFirebase();
        addSongToPlaylist(song, songs.length - 1);
        uploadForm.reset();

        if (songs.length === 1) {
            loadSong(0);
        }
    } catch (error) {
        console.error('Error uploading files:', error);
        alert('Error uploading files. Please try again.');
    }
}

// Modified deleteSong function to remove from Firebase
async function deleteSong(index) {
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
    
    const song = songs[index];
    
    try {
        // Delete from Storage
        await storage.refFromURL(song.file).delete();
        await storage.refFromURL(song.cover).delete();
        
        songs.splice(index, 1);
        saveSongsToFirebase();
        playlist.innerHTML = '';
        songs.forEach((song, i) => addSongToPlaylist(song, i));
        
        if (currentSongIndex >= songs.length) {
            currentSongIndex = Math.max(0, songs.length - 1);
        }
    } catch (error) {
        console.error('Error deleting song:', error);
        alert('Error deleting song. Please try again.');
    }
}

// Create admins node if it doesn't exist
function initializeAdminsNode() {
    const adminsRef = database.ref('admins');
    adminsRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            // Create the admins node with your admin user
            const adminData = {
                "YOUR_ADMIN_UID": true  // Replace with your actual admin user's UID
            };
            adminsRef.set(adminData)
                .then(() => {
                    console.log('Admins node created successfully');
                })
                .catch((error) => {
                    console.error('Error creating admins node:', error);
                });
        }
    });
}

// Load songs when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeAdminsNode();
    loadSongsFromFirebase();
});

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

function addSongToPlaylist(song, index) {
    const li = document.createElement('li');
    li.innerHTML = `
        <span>${song.name} - ${song.artist}</span>
        ${isAdmin ? `
            <button class="delete-btn" onclick="deleteSong(${index})">
                <i class="fas fa-trash"></i>
            </button>
        ` : ''}
    `;
    li.addEventListener('click', () => loadSong(index));
    playlist.appendChild(li);
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