import { Container } from 'pixi.js';

export class MinigameBase {
    constructor(app, gameManager) {
        this.app = app;
        this.gameManager = gameManager;
        this.container = new Container();
        this.container.visible = false;
        this.app.stage.addChild(this.container);
    }

    // Called when the game starts
    async start() {
        this.container.visible = true;
        // To be implemented by subclasses
    }

    // Called when the game ends
    end(score) {
        this.container.visible = false;
        this.gameManager.onMinigameEnd(score);
    }

    destroy() {
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true });
    }
}
