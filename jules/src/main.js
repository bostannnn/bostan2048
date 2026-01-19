import { GameManager } from './GameManager.js';

const game = new GameManager();
game.init();

// Expose game for UI interaction
window.game = game;

// Bind Play Button
const playBtn = document.getElementById('play-btn');
if (playBtn) {
    playBtn.addEventListener('click', () => {
        game.startGame();
    });
}
