export class PixiActuator {
  constructor(container, boardRenderer) {
    this.container = container;
    this.boardRenderer = boardRenderer;
    this.scoreContainer = container.querySelector(".score-container");
    this.bestContainer = container.querySelector(".best-container");
    this.messageContainer = container.querySelector(".game-message");
    this.gameContainer = container.querySelector(".game-container");
    this.undoButton = container.querySelector("#undo-button");
    this.keepPlayingButton = container.querySelector(".keep-playing-button");
    this.retryButton = container.querySelector(".retry-button");

    this.score = 0;
    this.undoEffectTimeout = null;
  }

  actuate(grid, metadata) {
    if (this.boardRenderer) {
      this.boardRenderer.update(grid);
    }

    this.updateScore(metadata.score);
    this.updateBestScore(metadata.bestScore);

    if (metadata.terminated) {
      if (metadata.over) {
        this.message(false);
      } else if (metadata.won) {
        this.message(true);
      }
    }
  }

  continueGame() {
    this.clearMessage();
  }

  updateScore(score) {
    const difference = score - this.score;
    this.score = score;

    const valueEl = this.scoreContainer.querySelector(".score-value");
    if (valueEl) {
      valueEl.textContent = this.score;
    } else {
      this.scoreContainer.textContent = this.score;
    }

    if (difference > 0) {
      const addition = document.createElement("div");
      addition.classList.add("score-addition");
      addition.textContent = "+" + difference;
      this.scoreContainer.appendChild(addition);

      // Clean up the element after the animation completes to prevent DOM piling
      addition.addEventListener('animationend', () => {
        if (addition.parentNode) {
            addition.parentNode.removeChild(addition);
        }
      });
    }
  }

  updateBestScore(bestScore) {
    const valueEl = this.bestContainer.querySelector(".score-value");
    if (valueEl) {
      valueEl.textContent = bestScore;
    } else {
      this.bestContainer.textContent = bestScore;
    }
  }

  setElementVisible(el, isVisible) {
    if (!el) return;
    el.classList.toggle("hidden", !isVisible);
  }

  message(won) {
    if (!won) return;
    const type = won ? "game-won" : "game-over";
    const message = won ? "You win!" : "Wasted";

    this.messageContainer.classList.remove("hidden");
    this.messageContainer.classList.remove(won ? "game-over" : "game-won");
    this.messageContainer.classList.add(type);
    this.messageContainer.getElementsByTagName("p")[0].textContent = message;

    this.setElementVisible(this.keepPlayingButton, !!won);
    this.setElementVisible(this.retryButton, true);
  }

  clearMessage() {
    this.messageContainer.classList.remove("game-won");
    this.messageContainer.classList.remove("game-over");
    this.messageContainer.classList.remove("hidden");
    this.setElementVisible(this.keepPlayingButton, true);
    this.setElementVisible(this.retryButton, true);
  }

  setUndoAvailable(isAvailable) {
    if (!this.undoButton) return;
    this.undoButton.disabled = !isAvailable;
  }

  playUndoEffect() {
    if (this.gameContainer) {
      this.gameContainer.classList.remove("undo-flash");
      void this.gameContainer.offsetWidth;
      this.gameContainer.classList.add("undo-flash");
      if (this.undoEffectTimeout) {
        window.clearTimeout(this.undoEffectTimeout);
      }
      this.undoEffectTimeout = window.setTimeout(() => {
        if (this.gameContainer) {
          this.gameContainer.classList.remove("undo-flash");
        }
        this.undoEffectTimeout = null;
      }, 280);
    }

    if (window.effectManager && window.effectManager.rewind) {
      if (this.gameContainer && this.gameContainer.offsetWidth < 420) {
        return;
      }
      window.effectManager.rewind();
    }
  }

  showGameOverQuote() {
    // No-op for Pixi renderer
  }
}