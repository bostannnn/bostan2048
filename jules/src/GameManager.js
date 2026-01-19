import { Application } from 'pixi.js';
import { AssetLoader } from './AssetLoader.js';
import { CityScene } from './CityScene.js';
import { Game2048 } from './games/2048/Game2048.js';

export class GameManager {
    constructor() {
        this.app = new Application();
        this.assetLoader = new AssetLoader();
        this.currentMinigame = null;
    }

    async init() {
        await this.app.init({ background: '#1099bb', resizeTo: window });
        document.body.appendChild(this.app.canvas);
        
        await this.assetLoader.init();
        await this.assetLoader.loadBundle('2048-classic');
        
        this.cityScene = new CityScene(this.app, this);
        
        // Setup Minigames
        this.minigames = {
            '2048': new Game2048(this.app, this)
        };
        
        // Start in City
        this.cityScene.resume();
    }
    
    // Called by CityScene or UI
    showPlayOverlay() {
        const overlay = document.getElementById('play-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }
    
    startGame() {
        const overlay = document.getElementById('play-overlay');
        if (overlay) overlay.classList.add('hidden');
        
        this.cityScene.pause();
        this.currentMinigame = this.minigames['2048'];
        this.currentMinigame.start();
    }
    
    onMinigameEnd(score) {
        console.log(`Minigame ended with score: ${score}`);
        this.currentMinigame = null;
        this.cityScene.resume();
    }
}
