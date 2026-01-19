import { Grid } from './Grid.js';
import { Tile } from './Tile.js';

export class GameManager {
  constructor(size, InputManager, Actuator, StorageManager, callbacks = {}) {
    this.size = size;
    this.inputManager = new InputManager();
    this.storageManager = new StorageManager();
    
    this.actuator = Actuator instanceof Function ? new Actuator() : Actuator; 
    
    this.callbacks = callbacks;
    this.resultRecorded = false;
    this.undoState = null;
    this.turnCount = 0;
    this.undoCount = 0;

    this.startTiles = 2;

    this.inputManager.on("move", this.move.bind(this));
    this.inputManager.on("restart", this.restart.bind(this));
    this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
    this.inputManager.on("undo", this.undo.bind(this));

    this.setup();
  }

  destroy() {
    // Clean up input listeners to prevent double-firing events after restart
    if (this.inputManager && this.inputManager.destroy) {
        this.inputManager.destroy();
    }
  }

  restart() {
    if (this.callbacks.onRestart) {
        this.callbacks.onRestart();
    } else {
        this.reset();
    }
  }
  
  reset() {
    this.storageManager.clearGameState();
    this.storageManager.clearUndoState();
    this.actuator.continueGame(); 
    this.setup();
  }

  keepPlaying() {
    this.keepPlaying = true;
    this.actuator.continueGame(); 
  }

  isGameTerminated() {
    return this.over || (this.won && !this.keepPlaying);
  }

  setup() {
    var previousState = this.storageManager.getGameState();
    var storedUndoState = this.storageManager.getUndoState();
    const hasState = !!previousState;
    const gridHasTiles = (state) => {
      if (!state?.grid?.cells) return false;
      return state.grid.cells.some(col => col.some(cell => !!cell));
    };

    if (previousState && gridHasTiles(previousState)) {
      this.grid = new Grid(previousState.grid.size, previousState.grid.cells);
      this.score = previousState.score;
      this.over = previousState.over;
      this.won = previousState.won;
      this.keepPlaying = previousState.keepPlaying;
      this.resultRecorded = !!previousState.resultRecorded;
      this.undoState = storedUndoState;
      this.turnCount = previousState.turnCount || 0;
      this.undoCount = previousState.undoCount || 0;
    } else {
      this.storageManager.clearGameState();
      this.grid = new Grid(this.size);
      this.score = 0;
      this.over = false;
      this.won = false;
      this.keepPlaying = false;
      this.resultRecorded = false;
      this.undoState = null;
      this.turnCount = 0;
      this.undoCount = 0;
      this.storageManager.clearUndoState();
      this.addStartTiles();
    }

    if (this.callbacks.onEconomyRun) {
        this.callbacks.onEconomyRun(hasState);
    }

    this.actuate();
  }

  addStartTiles() {
    for (var i = 0; i < this.startTiles; i++) {
      this.addRandomTile();
    }
  }

  addRandomTile() {
    if (this.grid.cellsAvailable()) {
      var value = Math.random() < 0.9 ? 2 : 4;
      var tile = new Tile(this.grid.randomAvailableCell(), value);

      this.grid.insertTile(tile);
    }
  }

  actuate() {
    const shouldRecordResult = !this.resultRecorded && this.over;

    if (shouldRecordResult) {
      this.resultRecorded = true;
    }

    if (this.storageManager.getBestScore() < this.score) {
      this.storageManager.setBestScore(this.score);
    }

    if (this.over) {
      this.storageManager.clearGameState();
    } else {
      this.storageManager.setGameState(this.serialize());
    }

    if (this.callbacks.onScore) {
        this.callbacks.onScore(this.score);
    }

    this.actuator.actuate(this.grid, {
      score: this.score,
      over: this.over,
      won: this.won,
      bestScore: this.storageManager.getBestScore(),
      terminated: this.isGameTerminated(),
    });

    if (shouldRecordResult && this.callbacks.onGameEnd) {
      this.callbacks.onGameEnd(this.score, this.grid, this.getStats());
    }

    this.updateUndoAvailability();
  }

  serialize() {
    return {
      grid: this.grid.serialize(),
      score: this.score,
      over: this.over,
      won: this.won,
      keepPlaying: this.keepPlaying,
      resultRecorded: this.resultRecorded,
      turnCount: this.turnCount,
      undoCount: this.undoCount,
    };
  }

  setUndoState(state) {
    this.undoState = state || null;
    if (this.storageManager && this.storageManager.setUndoState) {
      this.storageManager.setUndoState(this.undoState);
    }
    this.updateUndoAvailability();
  }

  updateUndoAvailability() {
    if (this.actuator && this.actuator.setUndoAvailable) {
      this.actuator.setUndoAvailable(!!this.undoState);
    }
  }

  restoreState(state) {
    if (!state || !state.grid) return;

    this.grid = new Grid(state.grid.size, state.grid.cells);
    this.score = state.score;
    this.over = state.over;
    this.won = state.won;
    this.keepPlaying = state.keepPlaying;
    this.resultRecorded = !!state.resultRecorded;
    this.turnCount = state.turnCount || 0;
    this.undoCount = state.undoCount || 0;

    this.grid.eachCell((x, y, tile) => {
      if (tile) {
        tile.mergedFrom = null;
        tile.previousPosition = { x, y };
      }
    });

    this.actuator.continueGame();
    this.actuate();
  }

  undo() {
    if (!this.undoState) return;
    const previous = this.undoState;
    this.setUndoState(null);
    this.undoCount += 1;
    this.restoreState(previous);
    if (this.actuator && this.actuator.playUndoEffect) {
      this.actuator.playUndoEffect();
    }
  }

  prepareTiles() {
    this.grid.eachCell(function (x, y, tile) {
      if (tile) {
        tile.mergedFrom = null;
        tile.savePosition();
      }
    });
  }

  moveTile(tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
  }

  move(direction) {
    var self = this;

    if (this.isGameTerminated()) return;

    var previousState = this.serialize();

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    this.prepareTiles();

    traversals.x.forEach(function (x) {
      traversals.y.forEach(function (y) {
        cell = { x: x, y: y };
        tile = self.grid.cellContent(cell);

        if (tile) {
          var positions = self.findFarthestPosition(cell, vector);
          var next = self.grid.cellContent(positions.next);

          if (next && next.value === tile.value && !next.mergedFrom) {
            var merged = new Tile(positions.next, tile.value * 2);
            merged.mergedFrom = [tile, next];

            self.grid.insertTile(merged);
            self.grid.removeTile(tile);

            tile.updatePosition(positions.next);

            self.score += merged.value;

            if (merged.value === 2048) {
              self.won = true;
            }
          } else {
            self.moveTile(tile, positions.farthest);
          }

          if (!self.positionsEqual(cell, tile)) {
            moved = true;
          }
        }
      });
    });

    if (moved) {
      this.setUndoState(previousState);
      this.addRandomTile();
      this.turnCount += 1;

      if (!this.movesAvailable()) {
        this.over = true;
      }

      this.actuate();
    }
  }

  getVector(direction) {
    var map = {
      0: { x: 0, y: -1 }, // Up
      1: { x: 1, y: 0 }, // Right
      2: { x: 0, y: 1 }, // Down
      3: { x: -1, y: 0 }, // Left
    };

    return map[direction];
  }

  buildTraversals(vector) {
    var traversals = { x: [], y: [] };

    for (var pos = 0; pos < this.size; pos++) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }

    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
  }

  findFarthestPosition(cell, vector) {
    var previous;

    do {
      previous = cell;
      cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell));

      return {
        farthest: previous,
        next: cell,
      };
    }

    getStats() {
      return {
        turns: this.turnCount,
        undos: this.undoCount,
      };
    }

  movesAvailable() {
    return this.grid.cellsAvailable() || this.tileMatchesAvailable();
  }

  tileMatchesAvailable() {
    var self = this;
    var tile;

    for (var x = 0; x < this.size; x++) {
      for (var y = 0; y < this.size; y++) {
        tile = this.grid.cellContent({ x: x, y: y });

        if (tile) {
          for (var direction = 0; direction < 4; direction++) {
            var vector = self.getVector(direction);
            var cell = { x: x + vector.x, y: y + vector.y };

            var other = self.grid.cellContent(cell);

            if (other && other.value === tile.value) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  positionsEqual(first, second) {
    return first.x === second.x && first.y === second.y;
  }
}