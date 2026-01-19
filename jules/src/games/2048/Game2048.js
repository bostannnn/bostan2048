import { MinigameBase } from '../../MinigameBase.js';
import { Game2048Logic } from './Logic.js';
import { PixiRenderer } from './PixiRenderer.js';
import { Text, Graphics } from 'pixi.js';

export class Game2048 extends MinigameBase {
    constructor(app, gameManager) {
        super(app, gameManager);
        this.logic = new Game2048Logic();
        this.renderer = new PixiRenderer(this.container, this.logic);
        
        // Add back button
        this.createUI();
    }
    
    createUI() {
        const backBtn = new Graphics();
        backBtn.roundRect(0, 0, 100, 40, 5);
        backBtn.fill(0x8f7a66);
        backBtn.position.set(20, 20);
        backBtn.eventMode = 'static';
        backBtn.cursor = 'pointer';
        
        const label = new Text({ text: "Back", style: { fontSize: 20, fill: 0xFFFFFF } });
        label.anchor.set(0.5);
        label.position.set(50, 20);
        backBtn.addChild(label);
        
        backBtn.on('pointertap', () => {
             this.end(this.logic.score);
        });
        
        this.container.addChild(backBtn);
        
        this.scoreText = new Text({ text: "Score: 0", style: { fontSize: 24, fill: 0x776e65 } });
        this.scoreText.position.set(window.innerWidth / 2, 50);
        this.scoreText.anchor.set(0.5, 0);
        this.container.addChild(this.scoreText);
    }

    async start() {
        await super.start();
        this.logic.setup();
        this.renderer.drawBackground();
        this.renderer.update(this.logic.grid);
        this.updateScore();
        
        this.bindInput();
        
        // Resize listener
        window.addEventListener('resize', this.onResize.bind(this));
    }
    
    onResize() {
        this.renderer.resize();
        if (this.scoreText) {
             this.scoreText.position.set(window.innerWidth / 2, 50);
        }
    }
    
    bindInput() {
        this._keyDownHandler = this.onKeyDown.bind(this);
        window.addEventListener('keydown', this._keyDownHandler);
    }
    
    unbindInput() {
        window.removeEventListener('keydown', this._keyDownHandler);
        window.removeEventListener('resize', this.onResize.bind(this));
    }

    onKeyDown(event) {
        const map = {
            38: 0, // Up
            39: 1, // Right
            40: 2, // Down
            37: 3, // Left
            87: 0, // W
            68: 1, // D
            83: 2, // S
            65: 3  // A
        };
        const modifiers = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
        const mapped = map[event.which];

        if (!modifiers && mapped !== undefined) {
            event.preventDefault();
            const moved = this.logic.move(mapped);
            if (moved) {
                this.renderer.update(this.logic.grid);
                this.updateScore();
                
                if (this.logic.isGameTerminated()) {
                    setTimeout(() => {
                        alert(this.logic.won ? "You Won!" : "Game Over! Score: " + this.logic.score);
                        this.end(this.logic.score);
                    }, 500);
                }
            }
        }
    }
    
    updateScore() {
        if (this.scoreText) {
            this.scoreText.text = `Score: ${this.logic.score}`;
        }
    }
    
    end(score) {
        this.unbindInput();
        super.end(score);
    }
}
