export class LocalStorageManager {
  constructor(options = {}) {
    const namespace = options.namespace ? `${options.namespace}:` : "";
    this.bestScoreKey = `${namespace}bestScore`;
    this.gameStateKey = `${namespace}gameState`;
    this.undoStateKey = `${namespace}undoState`;
    this.legacyKeys = {
      bestScore: "bestScore",
      gameState: "gameState",
      undoState: "undoState",
    };
    var supported = this.localStorageSupported();
    this.storage = supported ? window.localStorage : window.fakeStorage;

    if (options.migrateLegacy && namespace) {
      this.migrateLegacyKeys();
    }
  }

  localStorageSupported() {
    var testKey = "test";
    var storage = window.localStorage;

    try {
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  getBestScore() {
    return this.storage.getItem(this.bestScoreKey) || 0;
  }

  setBestScore(score) {
    this.storage.setItem(this.bestScoreKey, score);
  }

  getGameState() {
    var stateJSON = this.storage.getItem(this.gameStateKey);
    return stateJSON ? JSON.parse(stateJSON) : null;
  }

  setGameState(gameState) {
    // 1. Clear any pending save (resets the 500ms timer)
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // 2. Wait 500ms. If no new moves happen, THEN save to disk.
    this.saveTimeout = setTimeout(() => {
      this.storage.setItem(this.gameStateKey, JSON.stringify(gameState));
    }, 500);
  }

  clearGameState() {
    // 1. Cancel the pending save! 
    // Otherwise, the timer from your last move might fire AFTER game over, 
    // reviving the dead game.
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    // 2. Delete the save
    this.storage.removeItem(this.gameStateKey);
  }

  getUndoState() {
    var stateJSON = this.storage.getItem(this.undoStateKey);
    if (!stateJSON) return null;
    try {
      return JSON.parse(stateJSON);
    } catch (error) {
      return null;
    }
  }

  setUndoState(undoState) {
    if (!undoState) {
      this.storage.removeItem(this.undoStateKey);
      return;
    }
    this.storage.setItem(this.undoStateKey, JSON.stringify(undoState));
  }

  clearUndoState() {
    this.storage.removeItem(this.undoStateKey);
  }

  migrateLegacyKeys() {
    const mappings = [
      [this.legacyKeys.bestScore, this.bestScoreKey],
      [this.legacyKeys.gameState, this.gameStateKey],
      [this.legacyKeys.undoState, this.undoStateKey],
    ];
    mappings.forEach(([fromKey, toKey]) => {
      if (this.storage.getItem(toKey)) return;
      const legacyValue = this.storage.getItem(fromKey);
      if (legacyValue !== null && legacyValue !== undefined) {
        this.storage.setItem(toKey, legacyValue);
      }
    });
  }
}

window.fakeStorage = {
  _data: {},

  setItem: function (id, val) {
    return (this._data[id] = String(val));
  },

  getItem: function (id) {
    return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
  },

  removeItem: function (id) {
    return delete this._data[id];
  },

  clear: function () {
    return (this._data = {});
  },
};
