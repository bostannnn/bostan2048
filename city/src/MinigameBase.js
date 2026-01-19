export class MinigameBase {
    constructor(gameId) {
      this.gameId = gameId;
      this.active = false;
    }

    init() {
      this.active = true;
    }

    pause() {
      this.active = false;
    }

    resume() {
      this.active = true;
    }

    destroy() {
      this.active = false;
    }
  }
