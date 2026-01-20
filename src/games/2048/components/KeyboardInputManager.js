export class KeyboardInputManager {
  constructor() {
    this.events = {};

    // Use pointer events for unified handling
    this.eventTouchstart = "pointerdown";
    this.eventTouchmove = "pointermove";
    this.eventTouchend = "pointerup";

    // Bind methods to 'this' so they can be added/removed correctly
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchCancel = this.handleTouchCancel.bind(this);
    this.restart = this.restart.bind(this);
    this.undo = this.undo.bind(this);
    this.keepPlaying = this.keepPlaying.bind(this);

    // State for Swipe detection
    this.touchStartClientX = 0;
    this.touchStartClientY = 0;
    this.hasSwiped = false;
    this.gameContainer = null;
    this.lastPointerUpTime = 0;

    this.listen();
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event, data) {
    var callbacks = this.events[event];
    if (callbacks) {
      callbacks.forEach(function (callback) {
        callback(data);
      });
    }
  }

  listen() {
    // 1. Keydown Events
    document.addEventListener("keydown", this.handleKeyDown);

    // 2. Button Events
    this.bindButtonPress(".restart-button", this.restart);
    this.bindButtonPress(".undo-button", this.undo);
    this.bindButtonPress(".keep-playing-button", this.keepPlaying);

    // 3. Swipe Events
    this.gameContainer = document.querySelector(".game-stage") || document.getElementsByClassName("game-container")[0];
    
    if (!this.gameContainer) return;

    const listenerOpts = { passive: false };

    // Ensure the container accepts touch/pointer events
    this.gameContainer.style.touchAction = "none";
    this.gameContainer.style.pointerEvents = "auto";

    this.gameContainer.addEventListener(this.eventTouchstart, this.handleTouchStart, listenerOpts);
    this.gameContainer.addEventListener(this.eventTouchmove, this.handleTouchMove, listenerOpts);
    this.gameContainer.addEventListener(this.eventTouchend, this.handleTouchEnd, listenerOpts);
    this.gameContainer.addEventListener("touchcancel", this.handleTouchCancel, listenerOpts);
  }

  destroy() {
    // Remove Keydown
    document.removeEventListener("keydown", this.handleKeyDown);

    // Remove Buttons (Selectors might reference new DOM elements if mounted again, but good practice)
    this.unbindButtonPress(".restart-button", this.restart);
    this.unbindButtonPress(".undo-button", this.undo);
    this.unbindButtonPress(".keep-playing-button", this.keepPlaying);

    // Remove Swipe Events
    if (this.gameContainer) {
      const listenerOpts = { passive: false };
      this.gameContainer.removeEventListener(this.eventTouchstart, this.handleTouchStart, listenerOpts);
      this.gameContainer.removeEventListener(this.eventTouchmove, this.handleTouchMove, listenerOpts);
      this.gameContainer.removeEventListener(this.eventTouchend, this.handleTouchEnd, listenerOpts);
      this.gameContainer.removeEventListener("touchcancel", this.handleTouchCancel, listenerOpts);
      this.gameContainer = null;
    }
    
    this.events = {};
  }

  // --- Event Handlers ---

  handleKeyDown(event) {
    const map = {
      38: 0, // Up
      39: 1, // Right
      40: 2, // Down
      37: 3, // Left
      75: 0, // Vim up
      76: 1, // Vim right
      74: 2, // Vim down
      72: 3, // Vim left
      87: 0, // W
      68: 1, // D
      83: 2, // S
      65: 3, // A
    };

    if (this.isTypingTarget(event.target) || this.isOverlayActive()) {
      return;
    }

    var modifiers = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    var mapped = map[event.which];

    if (!modifiers) {
      if (mapped !== undefined) {
        event.preventDefault();
        this.emit("move", mapped);
      }
    }

    if (!modifiers && event.which === 85) {
      event.preventDefault();
      this.emit("undo");
    }

    // R key restarts the game
    if (!modifiers && event.which === 82) {
      this.restart(event);
    }
  }

  handleTouchStart(event) {
    if (event.pointerType === "touch" && event.isPrimary === false) return;

    this.touchStartClientX = event.clientX;
    this.touchStartClientY = event.clientY;
    this.hasSwiped = false;
    // Do not strictly prevent default here, sometimes needed for scrolling? 
    // But for games usually yes.
    event.preventDefault(); 
  }

  handleTouchMove(event) {
    event.preventDefault();

    if (this.hasSwiped) return;
    if (event.pointerType === "touch" && event.isPrimary === false) return;

    var touchEndClientX = event.clientX;
    var touchEndClientY = event.clientY;

    var dx = touchEndClientX - this.touchStartClientX;
    var dy = touchEndClientY - this.touchStartClientY;
    var absDx = Math.abs(dx);
    var absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 6) {
      // (right : left) : (down : up)
      this.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
      this.hasSwiped = true;
    }
  }

  handleTouchEnd(event) {
    if (event.pointerType === "touch" && event.isPrimary === false) return;
    if (this.hasSwiped) return;

    // Optional: Logic for tap vs swipe end could go here
    // For now we rely on move to trigger the swipe
  }

  handleTouchCancel(event) {
    this.hasSwiped = false;
  }

  // --- Helpers ---

  isTypingTarget(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    var tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  isOverlayActive() {
    var leaderboard = document.getElementById("leaderboard");
    if (leaderboard && !leaderboard.classList.contains("hidden")) return true;
    var levelSelect = document.getElementById("level-select");
    if (levelSelect && !levelSelect.classList.contains("hidden")) return true;
    var confirmOverlay = document.getElementById("confirm-overlay");
    if (confirmOverlay && !confirmOverlay.classList.contains("hidden")) return true;
    var settings = document.getElementById("settings-overlay");
    if (settings && !settings.classList.contains("hidden")) return true;
    var themeSelector = document.getElementById("theme-selector");
    if (themeSelector && !themeSelector.classList.contains("hidden")) return true;
    return false;
  }

  restart(event) {
    if (this.shouldIgnoreClick(event)) return;
    if (event) event.preventDefault();
    this.emit("restart");
  }

  undo(event) {
    if (this.shouldIgnoreClick(event)) return;
    if (event) event.preventDefault();
    this.emit("undo");
  }

  keepPlaying(event) {
    if (this.shouldIgnoreClick(event)) return;
    if (event) event.preventDefault();
    this.emit("keepPlaying");
  }

  bindButtonPress(selector, fn) {
    var button = document.querySelector(selector);
    if (!button) return;
    button.addEventListener("click", fn);
    button.addEventListener(this.eventTouchend, fn);
  }
  
  unbindButtonPress(selector, fn) {
    var button = document.querySelector(selector);
    if (!button) return;
    button.removeEventListener("click", fn);
    button.removeEventListener(this.eventTouchend, fn);
  }

  shouldIgnoreClick(event) {
    if (!event) return false;
    if (event.type === this.eventTouchend) {
      this.lastPointerUpTime = Date.now();
      return false;
    }
    if (event.type === "click") {
      return Date.now() - this.lastPointerUpTime < 400;
    }
    return false;
  }
}
