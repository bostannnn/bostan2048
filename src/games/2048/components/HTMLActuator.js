export class HTMLActuator {
  constructor(container) {
    this.container = container;
    this.tileContainer = container.querySelector(".tile-container");
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
    var self = this;

    window.requestAnimationFrame(function () {
      self.clearContainer(self.tileContainer);

      grid.cells.forEach(function (column) {
        column.forEach(function (cell) {
          if (cell) {
            self.addTile(cell);
          }
        });
      });

      self.updateScore(metadata.score);
      self.updateBestScore(metadata.bestScore);

      if (metadata.terminated) {
        if (metadata.over) {
          self.message(false); // You lose
        } else if (metadata.won) {
          self.message(true); // You win!
        }
      }
    });
  }

  continueGame() {
    this.clearMessage();
  }

  clearContainer(container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  addTile(tile) {
    var self = this;

    var wrapper = document.createElement("div");
    var inner = document.createElement("div");
    var position = tile.previousPosition || { x: tile.x, y: tile.y };
    var positionClass = this.positionClass(position);

    // We can't use classList because it somehow glitches when replacing classes
    var classes = ["tile", "tile-" + tile.value, positionClass];

    if (tile.value > 2048) classes.push("tile-super");

    this.applyClasses(wrapper, classes);

    inner.classList.add("tile-inner");
    inner.textContent = tile.value; 
    
    const CustomImages = window.CustomImages || {};
    const customImageAvailability = window.customImageAvailability || {};

    // Set custom background image if available
    if (CustomImages[tile.value] && customImageAvailability[tile.value]) {
      inner.style.backgroundImage = `url('${CustomImages[tile.value]}')`;
      inner.classList.add("has-image");
      inner.textContent = ""; // Clear text if image is used
    }

    if (tile.previousPosition) {
      // Make sure that the tile gets rendered in the previous position first
      // We use a small timeout to ensure the browser has time to paint the initial state
      // or double RAF to ensure next frame.
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function() {
          classes[2] = self.positionClass({ x: tile.x, y: tile.y });
          self.applyClasses(wrapper, classes); // Update the position
        });
      });
    } else if (tile.mergedFrom) {
      classes.push("tile-merged");
      
      // Add specific merged classes for high values to trigger cool animations
      if (tile.value >= 64) {
        classes.push("tile-merged-effect");
        classes.push("tile-merged-" + tile.value);
      }

      this.applyClasses(wrapper, classes);

      // Render the tiles that merged
      tile.mergedFrom.forEach(function (merged) {
        self.addTile(merged);
      });
    } else {
      classes.push("tile-new");
      this.applyClasses(wrapper, classes);
    }

    wrapper.appendChild(inner);

    // Add the inner part to the wrapper
    this.tileContainer.appendChild(wrapper);

    if (tile.mergedFrom && window.effectManager) {
      window.requestAnimationFrame(() => {
        window.effectManager.explode(wrapper, tile.value);
      });
    }
  }

  applyClasses(element, classes) {
    element.setAttribute("class", classes.join(" "));
  }

  normalizePosition(position) {
    return { x: position.x + 1, y: position.y + 1 };
  }

  positionClass(position) {
    position = this.normalizePosition(position);
    return "tile-position-" + position.x + "-" + position.y;
  }

  updateScore(score) {
    var difference = score - this.score;
    this.score = score;

    const valueEl = this.scoreContainer.querySelector(".score-value");
    if (valueEl) {
      valueEl.textContent = this.score;
    } else {
      this.scoreContainer.textContent = this.score;
    }

    if (difference > 0) {
      var addition = document.createElement("div");
      addition.classList.add("score-addition");
      addition.textContent = "+" + difference;

      this.scoreContainer.appendChild(addition);

      addition.addEventListener("animationend", () => {
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
    var type = won ? "game-won" : "game-over";
    var message = won ? "You win!" : "Game over!";

    this.messageContainer.classList.remove("hidden");
    this.messageContainer.classList.remove(won ? "game-over" : "game-won");
    this.messageContainer.classList.add(type);
    this.messageContainer.getElementsByTagName("p")[0].textContent = message;

    this.setElementVisible(this.keepPlayingButton, !!won);
    this.setElementVisible(this.retryButton, true);

    // For losses, rely on leaderboard overlay; hide this panel to avoid stacking
    if (!won) {
      this.messageContainer.classList.add("hidden");
    }
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
      // Lighter rewind for mobile; skip heavy particles if container is small
      if (this.gameContainer && this.gameContainer.offsetWidth < 420) {
        return;
      }
      window.effectManager.rewind();
    }
  }
}
