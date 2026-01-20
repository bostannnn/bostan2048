import assert from "node:assert/strict";
import { GameManager } from "../src/games/2048/components/GameManager.js";
import { Grid } from "../src/games/2048/components/Grid.js";
import { Tile } from "../src/games/2048/components/Tile.js";
import { LeaderboardManager } from "../src/core/LeaderboardManager.js";
import { Match3Engine } from "../src/games/match3/components/Match3Engine.js";

class TestInputManager {
  constructor() {
    this.handlers = {};
  }

  on(event, handler) {
    this.handlers[event] = handler;
  }

  emit(event, payload) {
    const handler = this.handlers[event];
    if (handler) handler(payload);
  }

  destroy() {}
}

class TestActuator {
  actuate() {}
  continueGame() {}
  setUndoAvailable() {}
  playUndoEffect() {}
}

class TestStorageManager {
  constructor() {
    this.data = {};
  }

  getBestScore() {
    return this.data.bestScore || 0;
  }

  setBestScore(score) {
    this.data.bestScore = score;
  }

  getGameState() {
    return this.data.gameState || null;
  }

  setGameState(state) {
    this.data.gameState = state;
  }

  clearGameState() {
    delete this.data.gameState;
  }

  getUndoState() {
    return this.data.undoState || null;
  }

  setUndoState(state) {
    this.data.undoState = state || null;
  }

  clearUndoState() {
    delete this.data.undoState;
  }
}

function createGame() {
  const game = new GameManager(4, TestInputManager, new TestActuator(), TestStorageManager, {});
  game.addRandomTile = () => {};
  return game;
}

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test("GameManager starts with two tiles", () => {
  const game = createGame();
  const tiles = game.grid.cells.flat().filter(Boolean);
  assert.equal(tiles.length, 2);
});

test("GameManager moves a tile to the right edge", () => {
  const game = createGame();
  game.grid = new Grid(4);
  game.grid.insertTile(new Tile({ x: 0, y: 0 }, 2));
  game.score = 0;

  game.move(1);
  const tile = game.grid.cellContent({ x: 3, y: 0 });
  assert.ok(tile);
  assert.equal(tile.value, 2);
});

test("GameManager merges tiles and updates score", () => {
  const game = createGame();
  game.grid = new Grid(4);
  game.grid.insertTile(new Tile({ x: 0, y: 0 }, 2));
  game.grid.insertTile(new Tile({ x: 1, y: 0 }, 2));
  game.score = 0;

  game.move(1);
  const tile = game.grid.cellContent({ x: 3, y: 0 });
  assert.ok(tile);
  assert.equal(tile.value, 4);
  assert.equal(game.score, 4);
});

test("GameManager undo restores the previous state", () => {
  const game = createGame();
  game.grid = new Grid(4);
  game.grid.insertTile(new Tile({ x: 0, y: 0 }, 2));
  game.score = 0;

  game.move(1);
  game.undo();

  const tile = game.grid.cellContent({ x: 0, y: 0 });
  assert.ok(tile);
  assert.equal(tile.value, 2);
  assert.equal(game.undoState, null);
});

test("LeaderboardManager stores and sorts local scores", async () => {
  globalThis.localStorage = {
    _data: new Map(),
    getItem(key) {
      return this._data.has(key) ? this._data.get(key) : null;
    },
    setItem(key, value) {
      this._data.set(key, String(value));
    },
    removeItem(key) {
      this._data.delete(key);
    },
  };

  const manager = new LeaderboardManager({
    gameId: "test-game",
    storageKey: "test-scores",
    limit: 2,
  });

  await manager.submitScore("A", 100, { turns: 10, undos: 1 });
  await manager.submitScore("B", 200, { turns: 12, undos: 2 });

  const { local, remote } = await manager.fetchScores(2);
  assert.equal(local.length, 2);
  assert.equal(local[0].score, 200);
  assert.equal(local[1].score, 100);
  assert.equal(remote.length, 0);
  assert.equal(manager.isHighScore(50), false);
  assert.equal(manager.isHighScore(150), true);
});

test("Match3Engine detects a horizontal match", () => {
  const engine = new Match3Engine({ rows: 3, cols: 3, types: 3, rng: () => 0.1 });
  engine.loadState({
    rows: 3,
    cols: 3,
    tiles: [
      [{ type: 1 }, { type: 1 }, { type: 1 }],
      [{ type: 0 }, { type: 2 }, { type: 0 }],
      [{ type: 2 }, { type: 0 }, { type: 2 }],
    ],
  });
  const { matches } = engine.findMatches();
  assert.equal(matches.length, 1);
  assert.equal(matches[0].positions.length, 3);
});

test("Match3Engine swap resolves a match", () => {
  const engine = new Match3Engine({ rows: 3, cols: 3, types: 3, rng: () => 0.2 });
  engine.loadState({
    rows: 3,
    cols: 3,
    tiles: [
      [{ type: 0 }, { type: 1 }, { type: 2 }],
      [{ type: 1 }, { type: 2 }, { type: 0 }],
      [{ type: 0 }, { type: 1 }, { type: 2 }],
    ],
  });
  const result = engine.resolveSwap({ row: 1, col: 1 }, { row: 1, col: 2 });
  assert.equal(result.matched, true);
  assert.ok(result.cleared >= 3);
});

async function run() {
  let passed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed += 1;
    } catch (error) {
      console.error(`[FAIL] ${name}`);
      throw error;
    }
  }
  console.log(`All ${passed} tests passed.`);
}

await run();
