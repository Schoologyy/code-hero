// Game State
const gameState = {
    score: 0,
    combo: 0,
    maxCombo: 0,
    notes: [],
    isPlaying: false,
    currentTime: 0,
    perfectHits: 0,
    goodHits: 0,
    misses: 0,
    audioDuration: 0
};

const KEYS = {
    'a': 0,
    's': 1,
    'd': 2,
    'f': 3
};

const STRIKE_ZONE = {
    top: window.innerHeight - 140,
    bottom: window.innerHeight,
    tolerance: 50 // pixels
};

// Menu Functions
function showMainMenu() {
    document.getElementById('mainMenu').classList.add('active');
    document.getElementById('importMenu').classList.remove('active');
    document.getElementById('instructionsMenu').classList.remove('active');
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('gameOverScreen').classList.remove('active');
}

function showImportMenu() {
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('importMenu').classList.add('active');
    document.getElementById('instructionsMenu').classList.remove('active');
    resetFileInput();
}

function showInstructions() {
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('instructionsMenu').classList.add('active');
}

function resetFileInput() {
    document.getElementById('audioFile').value = '';
    document.getElementById('fileInfo').classList.add('hidden');
}

// Audio Loading
function loadAudioFile() {
    const fileInput = document.getElementById('audioFile');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const audioPlayer = document.getElementById('audioPlayer');
    const fileURL = URL.createObjectURL(file);
    audioPlayer.src = fileURL;
    
    audioPlayer.onloadedmetadata = function() {
        gameState.audioDuration = audioPlayer.duration;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileDuration').textContent = Math.floor(audioPlayer.duration);
        document.getElementById('fileInfo').classList.remove('hidden');
    };
}

// Game Start
function startGame() {
    const audioPlayer = document.getElementById('audioPlayer');
    if (!audioPlayer.src) {
        alert('Please select an MP3 file first!');
        return;
    }
    
    // Reset game state
    gameState.score = 0;
    gameState.combo = 0;
    gameState.maxCombo = 0;
    gameState.notes = [];
    gameState.perfectHits = 0;
    gameState.goodHits = 0;
    gameState.misses = 0;
    gameState.isPlaying = true;
    
    // Generate notes based on audio duration
    generateNotes();
    
    // Update UI
    document.getElementById('importMenu').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('notesContainer').innerHTML = '';
    
    // Start audio and game loop
    audioPlayer.play();
    gameLoop();
}

// Generate Notes
function generateNotes() {
    gameState.notes = [];
    const duration = gameState.audioDuration * 1000; // convert to ms
    const noteSpacing = 300; // ms between notes
    
    for (let time = 0; time < duration; time += noteSpacing) {
        const lane = Math.floor(Math.random() * 4);
        gameState.notes.push({
            lane: lane,
            time: time,
            hit: false,
            missed: false,
            element: null
        });
    }
}

// Game Loop
function gameLoop() {
    const audioPlayer = document.getElementById('audioPlayer');
    
    if (!gameState.isPlaying) return;
    
    gameState.currentTime = audioPlayer.currentTime * 1000; // convert to ms
    
    // Create note elements
    for (let note of gameState.notes) {
        if (note.element) continue; // already created
        
        // Create notes that are coming soon (within 5 seconds)
        if (note.time <= gameState.currentTime + 5000 && note.time > gameState.currentTime - 3000) {
            createNoteElement(note);
        }
    }
    
    // Move notes and check for misses
    updateNotes();
    
    // Check if song ended
    if (audioPlayer.ended) {
        endGame();
    } else {
        requestAnimationFrame(gameLoop);
    }
}

// Create Note Element
function createNoteElement(note) {
    const container = document.getElementById('notesContainer');
    const noteEl = document.createElement('div');
    noteEl.className = 'note';
    noteEl.dataset.lane = note.lane;
    
    // Position based on lane
    const laneWidth = window.innerWidth / 4;
    noteEl.style.left = (note.lane * laneWidth + 2) + 'px';
    noteEl.style.width = (laneWidth - 4) + 'px';
    
    // Calculate when this note should reach the strike zone
    const timeToStrike = note.time - gameState.currentTime;
    const fallDuration = Math.max(2, timeToStrike / 1000);
    
    // Calculate current progress through animation
    const elapsedTime = gameState.currentTime - (note.time - timeToStrike);
    const progress = Math.max(0, elapsedTime / (fallDuration * 1000));
    
    // Set animation
    noteEl.style.animation = `fall ${fallDuration}s linear forwards`;
    
    // If note is already partway down, adjust the transform
    if (progress > 0 && progress < 1) {
        const currentY = window.innerHeight * progress;
        noteEl.style.transform = `translateY(${currentY}px)`;
        noteEl.style.animation = `none`;
    }
    
    container.appendChild(noteEl);
    note.element = noteEl;
}

// Update Notes
function updateNotes() {
    for (let note of gameState.notes) {
        if (!note.element) continue;
        if (note.hit || note.missed) continue;
        
        const notePos = note.element.getBoundingClientRect().top;
        
        // Check if note passed the strike zone
        if (notePos > STRIKE_ZONE.bottom) {
            if (!note.hit) {
                missNote(note);
            }
        }
    }
}

// Hit Note
function hitNote(lane) {
    let bestNote = null;
    let bestDistance = STRIKE_ZONE.tolerance;
    
    for (let note of gameState.notes) {
        if (!note.element || note.hit || note.missed || note.lane !== lane) continue;
        
        const notePos = note.element.getBoundingClientRect().top;
        const distance = Math.abs(notePos - STRIKE_ZONE.top);
        
        if (distance < bestDistance) {
            bestDistance = distance;
            bestNote = note;
        }
    }
    
    if (bestNote) {
        bestNote.hit = true;
        
        // Calculate score
        if (bestDistance < 20) {
            // Perfect
            gameState.score += 100 * Math.ceil(gameState.combo / 2 + 1);
            gameState.perfectHits++;
            bestNote.element.classList.add('perfect');
        } else if (bestDistance < STRIKE_ZONE.tolerance) {
            // Good
            gameState.score += 50 * Math.ceil(gameState.combo / 2 + 1);
            gameState.goodHits++;
            bestNote.element.classList.add('good');
        }
        
        gameState.combo++;
        gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
        
        // Visual feedback
        const lane = document.querySelector(`.lane[data-lane="${lane}"]`);
        lane.classList.add('hit');
        setTimeout(() => lane.classList.remove('hit'), 100);
        
        // Remove element with scale animation
        bestNote.element.style.animation = 'hitPop 0.3s ease-out forwards';
        setTimeout(() => bestNote.element.remove(), 300);
    }
}

// Miss Note
function missNote(note) {
    note.missed = true;
    gameState.combo = 0;
    gameState.misses++;
    
    note.element.classList.add('miss');
    setTimeout(() => note.element.remove(), 300);
    
    updateUI();
}

// Update UI
function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('combo').textContent = gameState.combo;
}

// End Game
function endGame() {
    gameState.isPlaying = false;
    document.getElementById('audioPlayer').pause();
    document.getElementById('gameScreen').classList.remove('active');
    
    const accuracy = gameState.perfectHits + gameState.goodHits > 0 
        ? Math.round((gameState.perfectHits / (gameState.perfectHits + gameState.goodHits + gameState.misses)) * 100)
        : 0;
    
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('maxCombo').textContent = gameState.maxCombo;
    document.getElementById('accuracy').textContent = accuracy;
    document.getElementById('gameOverScreen').classList.add('active');
}

// Keyboard Input
document.addEventListener('keydown', function(e) {
    const key = e.key.toLowerCase();
    if (KEYS.hasOwnProperty(key) && gameState.isPlaying) {
        e.preventDefault();
        hitNote(KEYS[key]);
        updateUI();
    }
});

// Initialize
window.addEventListener('load', function() {
    showMainMenu();
});