// --- Game State Constants and Settings ---
const defaultGridSize = 10; //
let gridSize = defaultGridSize; //
const wordsToFind = ['SERENE', 'CALM', 'GARDEN', 'STONE', 'WATER', 'BAMBOO', 'ZEN', 'PEACE']; //
let grid = []; //
let placedWordsInfo = []; //
let foundWords = new Set(); //
let isSelecting = false; //
let selection = []; //
let foundWordCount = 0; //

const directions = [
    { name: 'H', rowDelta: 0, colDelta: 1 }, { name: 'V', rowDelta: 1, colDelta: 0 }, //
    { name: 'D1', rowDelta: 1, colDelta: 1 }, { name: 'D2', rowDelta: 1, colDelta: -1 } //
]; //

const wordThemes = {
    'STONE':  { sound: 'public/sounds/stone.mp3',  styleClass: 'found-stone' }, //
    'WATER':  { sound: 'public/sounds/water.mp3',  styleClass: 'found-water' }, //
    'BAMBOO': { sound: 'public/sounds/bamboo.mp3', styleClass: 'found-bamboo' }, //
    'SERENE': { sound: 'public/sounds/serene.mp3', styleClass: 'found-zen' }, //
    'CALM':   { sound: 'public/sounds/calm.mp3',   styleClass: 'found-zen' }, //
    'GARDEN': { sound: 'public/sounds/garden.mp3', styleClass: 'found-bamboo' }, //
    'ZEN':    { sound: 'public/sounds/zen.mp3',    styleClass: 'found-zen' }, //
    'PEACE':  { sound: 'public/sounds/peace.mp3',  styleClass: 'found-zen' }, //
    'DEFAULT':{ sound: 'public/sounds/peacock.mp3',styleClass: 'found-stone' } //
};

let canvas, ctx;
let firefliesArray = [];
let fireflyAnimationId = null;

// --- DOM Component Targets ---
const gridContainer = document.getElementById('grid-container'); //
const wordListElement = document.getElementById('word-list'); //
const gardenVisualizationElement = document.getElementById('garden-visualization'); //
const mindfulnessPopupElement = document.getElementById('mindfulness-popup'); //
const ambientToggle = document.getElementById('ambient-toggle'); //

// ==========================================================================
// Setup and Word Allocation Engines
// ==========================================================================
function resetGameState() {
    grid = []; placedWordsInfo = []; foundWords = new Set(); //
    isSelecting = false; selection = []; foundWordCount = 0; //
    if (gridContainer) { gridContainer.innerHTML = ''; gridContainer.removeAttribute('data-listeners-added'); } //
    if (wordListElement) wordListElement.innerHTML = ''; //
    if (gardenVisualizationElement) gardenVisualizationElement.className = ''; //
    if (mindfulnessPopupElement) {
        mindfulnessPopupElement.classList.remove('show', 'win-message'); //
        if (mindfulnessPopupElement.hideTimeout) { clearTimeout(mindfulnessPopupElement.hideTimeout); mindfulnessPopupElement.hideTimeout = null; } //
    }
}

function initializeGrid(size) { grid = Array(size).fill(null).map(() => Array(size).fill(null)); } //

function canPlaceWord(word, row, col, direction) { //
    const len = word.length; //
    for (let i = 0; i < len; i++) { //
        const r = row + i * direction.rowDelta, c = col + i * direction.colDelta; //
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return false; //
        const cell = grid[r][c]; //
        if (cell !== null && cell !== word[i]) return false; //
    } //
    return true; //
}

function placeWordInGrid(word, row, col, direction) { //
    const len = word.length; const cells = []; //
    for (let i = 0; i < len; i++) { //
        const r = row + i * direction.rowDelta, c = col + i * direction.colDelta; //
        grid[r][c] = word[i]; //
        cells.push({ row: r, col: c }); //
    } //
    placedWordsInfo.push({ word, cells, startRow: row, startCol: col, direction: direction.name }); //
}

function placeWords(words) { //
    const maxAttempts = 50; words.forEach(w => { //
        let p = false; //
        for (let a = 0; a < maxAttempts && !p; a++) { //
            const dir = directions[Math.floor(Math.random() * directions.length)]; //
            const len = w.length; const rd = dir.rowDelta, cd = dir.colDelta; //
            let minR = 0, maxR = gridSize - 1, minC = 0, maxC = gridSize - 1; //
            if (rd > 0) maxR = gridSize - len; //
            if (cd > 0) maxC = gridSize - len; //
            if (cd < 0) minC = len - 1; //
            if (maxR < minR || maxC < minC) continue; //
            const r = minR + Math.floor(Math.random() * (maxR - minR + 1)); //
            const c = minC + Math.floor(Math.random() * (maxC - minC + 1)); //
            if (canPlaceWord(w, r, c, dir)) { placeWordInGrid(w, r, c, dir); p = true; } //
        } //
    }); //
}

function fillEmptyCells() { //
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; //
    for (let r = 0; r < gridSize; r++) //
        for (let c = 0; c < gridSize; c++) //
            if (grid[r][c] === null) grid[r][c] = alpha[Math.floor(Math.random() * alpha.length)]; //
}

function displayGrid() { //
    if (!gridContainer) return; //
    gridContainer.innerHTML = ''; gridContainer.style.setProperty('--grid-size', gridSize); //
    for (let r = 0; r < gridSize; r++) { //
        for (let c = 0; c < gridSize; c++) { //
            const cell = document.createElement('div'); //
            cell.className = 'grid-cell'; //
            cell.dataset.row = r; cell.dataset.col = c; //
            cell.textContent = grid[r][c]; //
            gridContainer.appendChild(cell); //
        } //
    } //
}

function displayWordList() { //
    if (!wordListElement) return; //
    wordListElement.innerHTML = ''; //
    wordsToFind.forEach(w => { //
        const li = document.createElement('li'); //
        li.textContent = w; li.id = `word-item-${w}`; //
        if (foundWords.has(w)) li.classList.add('found-word'); //
        wordListElement.appendChild(li); //
    }); //
}

// ==========================================================================
// Interactive Validation Engines
// ==========================================================================
function areCellsAdjacent(cell1, cell2) { //
    if (!cell1 || !cell2) return false; //
    const rDiff = Math.abs(cell1.row - cell2.row), cDiff = Math.abs(cell1.col - cell2.col); //
    return rDiff <= 1 && cDiff <= 1 && !(rDiff === 0 && cDiff === 0); //
}

function playAudio(soundPath) { //
    if (!soundPath) return; //
    try {
        const audio = new Audio(soundPath); //
        audio.currentTime = 0; //
        audio.play().catch(() => console.warn("Audio timeline deferred until direct viewport tap loop.")); //
    } catch (error) { console.error(error); } //
}

function triggerGardenGrowth() { //
    if (!gardenVisualizationElement) return; //
    gardenVisualizationElement.classList.remove('growth-stage-1', 'growth-stage-2', 'growth-stage-3', 'growth-stage-4'); //
    
    if (foundWordCount >= 8) gardenVisualizationElement.classList.add('growth-stage-4'); //
    else if (foundWordCount >= 6) gardenVisualizationElement.classList.add('growth-stage-3'); //
    else if (foundWordCount >= 4) gardenVisualizationElement.classList.add('growth-stage-2'); //
    else if (foundWordCount >= 2) gardenVisualizationElement.classList.add('growth-stage-1'); //
}

function getMindfulnessPrompt(word) { //
    const prompts = { SERENE: 'Embrace the serenity...', CALM: 'Find a moment of calm...', GARDEN: 'Picture a peaceful garden...', STONE: 'Feel the strength...', WATER: 'Imagine flowing water...', BAMBOO: 'Be flexible like bamboo...', ZEN: 'Seek Zen...', PEACE: 'Reflect on peace...' }; //
    return prompts[word] || `Reflect on "${word}"...`; //
}

function showMindfulnessMoment(word) { //
    if (!mindfulnessPopupElement) return; //
    const prompt = getMindfulnessPrompt(word); //
    mindfulnessPopupElement.innerHTML = `<p>${prompt}</p>`; //
    mindfulnessPopupElement.classList.remove('win-message'); //
    if (mindfulnessPopupElement.hideTimeout) clearTimeout(mindfulnessPopupElement.hideTimeout); //
    mindfulnessPopupElement.classList.add('show'); //
    mindfulnessPopupElement.hideTimeout = setTimeout(() => { mindfulnessPopupElement.classList.remove('show'); }, 4000); //
}

function checkWinCondition() { return foundWords.size === wordsToFind.length; } //

function displayWinMessage() { //
    if (!mindfulnessPopupElement) return; //
    if (mindfulnessPopupElement.hideTimeout) clearTimeout(mindfulnessPopupElement.hideTimeout); //
    mindfulnessPopupElement.innerHTML = `<div class="win-message"><h3>Harmony Found.</h3><p>The garden settles into elegant peace.</p><button id="new-puzzle-btn">Next Landscape</button></div>`; //
    mindfulnessPopupElement.classList.add('show', 'win-message'); //
    const btn = document.getElementById('new-puzzle-btn'); //
    if (btn) btn.onclick = initGame; //
}

function validateSelection() {
    if (selection.length < 2) {
        selection.forEach(cell => { if (cell?.element && !cell.element.classList.contains('found')) cell.element.classList.remove('selecting'); }); //
        selection = []; return;
    }
    const selectedWord = selection.map(cell => cell.element.textContent).join(''); //
    const reverseSelectedWord = selectedWord.split('').reverse().join(''); //
    let wordFound = null; //

    if (wordsToFind.includes(selectedWord) && !foundWords.has(selectedWord)) wordFound = selectedWord; //
    else if (wordsToFind.includes(reverseSelectedWord) && !foundWords.has(reverseSelectedWord)) wordFound = reverseSelectedWord; //

    if (wordFound) {
        foundWordCount++; //
        foundWords.add(wordFound); //
        const wordListItem = document.getElementById(`word-item-${wordFound}`); //
        if (wordListItem) wordListItem.classList.add('found-word'); //
        
        const theme = wordThemes[wordFound] || wordThemes.DEFAULT; //

        selection.forEach(cell => { 
            cell.element.classList.add('found', theme.styleClass); 
            cell.element.classList.remove('selecting'); //
        });

        playAudio(theme.sound); //
        triggerGardenGrowth(); //
        showMindfulnessMoment(wordFound); //

        if (checkWinCondition()) setTimeout(displayWinMessage, 700); //
    } else {
        selection.forEach(cell => { if (cell?.element && !cell.element.classList.contains('found')) cell.element.classList.remove('selecting'); }); //
    }
    selection = []; //
}

function addGridListeners() { //
    if (!gridContainer || gridContainer.hasAttribute('data-listeners-added')) return; //
    
    function handleStart(target) { //
        if (target?.classList.contains('grid-cell')) { //
            isSelecting = true; selection = []; //
            const r = parseInt(target.dataset.row), c = parseInt(target.dataset.col); //
            const cell = { row: r, col: c, element: target }; //
            selection.push(cell); //
            if (!cell.element.classList.contains('found')) cell.element.classList.add('selecting'); //
        } //
    }
    
    function handleMove(target) { //
        if (!isSelecting || !target?.classList.contains('grid-cell')) return; //
        const r = parseInt(target.dataset.row), c = parseInt(target.dataset.col); //
        const current = { row: r, col: c, element: target }; //
        const last = selection.length > 0 ? selection[selection.length - 1] : null; //
        if (last && last.row === r && last.col === c) return; //
        
        const idx = selection.findIndex(cell => cell.row === r && cell.col === c); //
        if (idx !== -1 && idx < selection.length - 1) { //
            const removed = selection.splice(idx + 1); //
            removed.forEach(cell => { if (!cell.element.classList.contains('found')) cell.element.classList.remove('selecting'); }); //
            return; //
        }
        
        if (idx === -1) { //
            let valid = false; //
            if (!last) valid = false; //
            else if (selection.length === 1) { //
                if (areCellsAdjacent(last, current)) valid = true; //
            } else { //
                const first = selection[0], second = selection[1]; //
                const reqRStep = second.row - first.row, reqCStep = second.col - first.col; //
                const curRStep = current.row - last.row, curCStep = current.col - last.col; //
                if (curRStep === reqRStep && curCStep === reqCStep && areCellsAdjacent(last, current)) valid = true; //
            } //
            if (valid) { //
                selection.push(current); //
                if (!current.element.classList.contains('found')) current.element.classList.add('selecting'); //
            } //
        } //
    }
    
    function handleEnd() { if (isSelecting) { validateSelection(); isSelecting = false; } } //

    gridContainer.addEventListener('mousedown', e => { e.preventDefault(); handleStart(e.target); }); //
    gridContainer.addEventListener('mouseover', e => { handleMove(e.target); }); //
    document.addEventListener('mouseup', () => { handleEnd(); }); //
    
    gridContainer.addEventListener('touchstart', e => { //
        e.preventDefault(); if (e.touches.length > 0) { //
            const t = e.touches[0]; handleStart(document.elementFromPoint(t.clientX, t.clientY)); //
        } //
    }, { passive: false }); //
    
    gridContainer.addEventListener('touchmove', e => { //
        e.preventDefault(); if (e.touches.length > 0) { //
            const t = e.touches[0]; handleMove(document.elementFromPoint(t.clientX, t.clientY)); //
        } //
    }, { passive: false }); //
    
    document.addEventListener('touchend', () => { handleEnd(); }); //
    document.addEventListener('touchcancel', () => { handleEnd(); }); //
    gridContainer.setAttribute('data-listeners-added', 'true'); //
}

// ==========================================================================
// Volumetric Fireflies Simulation Engine (Drift Tracking Fixed)
// ==========================================================================
class Firefly {
    constructor() {
        this.reset();
        this.y = Math.random() * canvas.height; //
    }
    reset() {
        this.x = Math.random() * canvas.width; //
        this.y = canvas.height + 15; //
        this.size = Math.random() * 0.9 + 0.4; //
        this.speedY = Math.random() * 0.22 + 0.08; //
        // FIX: Perfectly balanced speed offsets prevent unilateral screen clustering bugs
        this.speedX = (Math.random() - 0.5) * 0.24; 
        this.alpha = 0; //
        this.fadeSpeed = Math.random() * 0.01 + 0.003; //
        this.isFadingIn = true; //
        this.angle = Math.random() * Math.PI; //
        this.frequency = Math.random() * 0.01 + 0.003; //
    }
    update() {
        this.y -= this.speedY; //
        this.angle += this.frequency; //
        this.x += this.speedX + Math.sin(this.angle) * 0.12; //

        if (this.isFadingIn) {
            this.alpha += this.fadeSpeed; //
            if (this.alpha >= 0.8) this.isFadingIn = false; //
        } else {
            if (this.y < canvas.height * 0.12) {
                this.alpha -= this.fadeSpeed; //
            }
        }

        // Keep bounds checking responsive to viewport-locked structures
        if (this.y < -15 || this.x < -15 || this.x > canvas.width + 15 || this.alpha <= 0) {
            this.reset(); //
        }
    }
    draw() {
        ctx.save(); //
        ctx.globalAlpha = this.alpha; //
        
        let gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3.2); //
        
        // Read properties dynamically depending on modifying daylight classes
        const isDayMode = document.body.classList.contains('day-mode'); 
        
        if (!isDayMode) {
            gradient.addColorStop(0, '#ffffff'); //
            gradient.addColorStop(0.2, '#f6ffb3'); //
            gradient.addColorStop(0.5, 'rgba(163, 230, 53, 0.5)'); //
            gradient.addColorStop(1, 'rgba(163, 230, 53, 0)'); //
        } else {
            gradient.addColorStop(0, '#ffffff'); //
            gradient.addColorStop(0.2, '#fff3cc'); //
            gradient.addColorStop(0.5, 'rgba(230, 126, 34, 0.4)'); //
            gradient.addColorStop(1, 'rgba(230, 126, 34, 0)'); //
        }
        
        ctx.fillStyle = gradient; //
        ctx.beginPath(); //
        ctx.arc(this.x, this.y, this.size * 3.2, 0, Math.PI * 2); //
        ctx.fill(); //
        ctx.restore(); //
    }
}

function initFireflies() {
    canvas = document.getElementById('fireflies-canvas'); //
    ctx = canvas.getContext('2d'); //
    resizeCanvas(); //
    firefliesArray = []; //
    for (let i = 0; i < 40; i++) { //
        firefliesArray.push(new Firefly()); //
    }
}

function resizeCanvas() {
    if (!canvas) return; //
    canvas.width = window.innerWidth; //
    canvas.height = window.innerHeight; //
}

function animateFireflies() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); //
    firefliesArray.forEach(f => {
        f.update(); //
        f.draw(); //
    });
    fireflyAnimationId = requestAnimationFrame(animateFireflies); //
}

window.addEventListener('resize', resizeCanvas); //

// ==========================================================================
// Theme Initialization System
// ==========================================================================
function toggleAmbientTheme() {
    // Toggles the custom day override wrapper since night rules are baseline
    document.body.classList.toggle('day-mode'); 
}

ambientToggle.addEventListener('click', toggleAmbientTheme); //

function initGame() {
    console.log("--- Initializing New Game ---"); //
    resetGameState(); //
    initializeGrid(gridSize); //
    placeWords(wordsToFind); //
    fillEmptyCells(); //
    displayGrid(); //
    displayWordList(); //
    addGridListeners(); //
    triggerGardenGrowth(); //
    initFireflies(); //
    
    if (!fireflyAnimationId) animateFireflies(); //
    console.log("--- Game Ready ---"); //
}

document.addEventListener('DOMContentLoaded', initGame); //