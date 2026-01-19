export class GameInterface {
    constructor(gameId) {
        this.gameId = gameId;
        this.container = null;
    }

    /**
     * Mounts the game into the provided DOM element.
     * @param {HTMLElement} container 
     */
    mount(container) {
        this.container = container;
    }

    /**
     * Starts the game loop or logic.
     */
    start() {}

    /**
     * Pauses the game (e.g., when switching tabs or views).
     */
    pause() {}

    /**
     * Resumes the game.
     */
    resume() {}

    /**
     * Cleans up resources, event listeners, and DOM elements.
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container = null;
        }
    }
}
