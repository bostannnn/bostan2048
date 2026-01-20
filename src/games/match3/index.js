import { GameInterface } from "../../core/GameInterface.js";
import { Match3Engine } from "./components/Match3Engine.js";
import { Match3Renderer } from "./components/Match3Renderer.js";
import { Match3StorageManager } from "./components/Match3StorageManager.js";

const SCORE_PER_TILE = 100;

const MATCH3_ASSETS = {
  background: "assets/match3/kenney_puzzle-pack/sample.jpg",
  preview: "assets/match3/kenney_puzzle-pack/preview.jpg",
  gems: [
    "assets/match3/kenney_puzzle-pack/png/element_blue_square_glossy.png",
    "assets/match3/kenney_puzzle-pack/png/element_green_square_glossy.png",
    "assets/match3/kenney_puzzle-pack/png/element_red_square_glossy.png",
    "assets/match3/kenney_puzzle-pack/png/element_yellow_square_glossy.png",
    "assets/match3/kenney_puzzle-pack/png/element_purple_square.png",
    "assets/match3/kenney_puzzle-pack/png/element_grey_square_glossy.png",
    "assets/match3/kenney_puzzle-pack/png/element_blue_diamond_glossy.png",
  ],
  specials: {
    "line-h": "assets/match3/kenney_puzzle-pack/png/selectorA.png",
    "line-v": "assets/match3/kenney_puzzle-pack/png/selectorB.png",
    bomb: "assets/match3/kenney_puzzle-pack/png/particleStar.png",
    color: "assets/match3/kenney_puzzle-pack/png/particleCartoonStar.png",
    line: "assets/match3/kenney_puzzle-pack/png/selectorA.png",
  },
};

const LEVELS = [
  { id: 1, name: "Level 1", title: "Garden Gate", board: 8, colors: 5, target: 6000, moves: 25 },
  { id: 2, name: "Level 2", title: "Lantern Path", board: 8, colors: 5, target: 9000, moves: 22 },
  { id: 3, name: "Level 3", title: "Golden Grove", board: 8, colors: 5, target: 12000, moves: 20 },
  { id: 4, name: "Level 4", title: "Crystal Ridge", board: 8, colors: 6, target: 15000, moves: 20 },
  { id: 5, name: "Level 5", title: "Aurora Field", board: 8, colors: 6, target: 18000, moves: 18 },
  { id: 6, name: "Level 6", title: "Nova Falls", board: 8, colors: 6, target: 21000, moves: 18 },
  { id: 7, name: "Level 7", title: "Sky Terrace", board: 9, colors: 6, target: 24000, moves: 20 },
  { id: 8, name: "Level 8", title: "Silver Bay", board: 9, colors: 6, target: 28000, moves: 20 },
  { id: 9, name: "Level 9", title: "Sunburst", board: 9, colors: 7, target: 32000, moves: 19 },
  { id: 10, name: "Level 10", title: "Starfall", board: 9, colors: 7, target: 36000, moves: 18 },
].map((level) => ({
  ...level,
  previewImage: MATCH3_ASSETS.preview,
}));

const LEVEL_IDS = LEVELS.map((level) => level.id);
const DEFAULT_LEVEL = LEVELS[0].id;

export class Match3Game extends GameInterface {
  constructor() {
    super("match3");
    this.currentLevel = DEFAULT_LEVEL;
    this.engine = null;
    this.renderer = null;
    this.storage = null;
    this.score = 0;
    this.movesRemaining = 0;
    this.turnsUsed = 0;
    this.bestScore = 0;
    this.inputLocked = false;
    this.selectedCell = null;
    this.confirmHandler = null;
    this.pointerDown = false;
  }

  async mount(container) {
    super.mount(container);
    this.container.innerHTML = this.getTemplate();
    this.boardEl = this.container.querySelector("#match3-board");
    this.levelBadge = this.container.querySelector("#match3-level-badge");
    this.scoreEl = this.container.querySelector("#match3-score");
    this.movesEl = this.container.querySelector("#match3-moves");
    this.targetEl = this.container.querySelector("#match3-target");
    this.bestEl = this.container.querySelector("#match3-best");

    this.initRenderer();
    if (this.renderer) {
      await this.renderer.ready;
    }

    this.setupUI();
    this.loadLevel(this.currentLevel, { useSaved: true });
  }

  initRenderer() {
    if (this.renderer || !this.boardEl) return;
    this.renderer = new Match3Renderer(this.boardEl, {
      rows: 8,
      cols: 8,
      gemPaths: MATCH3_ASSETS.gems,
      specialPaths: MATCH3_ASSETS.specials,
      backgroundPath: MATCH3_ASSETS.background,
    });
  }

  setupUI() {
    const restartButton = this.container.querySelector("#match3-restart");
    const leaderboardButton = this.container.querySelector("#show-leaderboard");

    if (restartButton) {
      restartButton.addEventListener("click", (event) => {
        event.preventDefault();
        this.requestRestart();
      });
    }

    if (leaderboardButton) {
      leaderboardButton.addEventListener("click", (event) => {
        event.preventDefault();
        window.openLeaderboard?.({
          gameId: this.gameId,
          level: this.currentLevel,
        });
      });
    }

    if (this.boardEl) {
      this.boardEl.style.touchAction = "none";
      this.boardEl.addEventListener("pointerdown", this.handlePointerDown);
      this.boardEl.addEventListener("pointerup", this.handlePointerUp);
      this.boardEl.addEventListener("pointerleave", this.handlePointerCancel);
      this.boardEl.addEventListener("pointercancel", this.handlePointerCancel);
    }
  }

  handlePointerDown = (event) => {
    if (this.inputLocked) return;
    const cell = this.getCellFromEvent(event);
    if (!cell) return;
    this.pointerDown = true;
    this.setSelectedCell(cell);
  };

  handlePointerUp = async (event) => {
    if (!this.pointerDown) return;
    this.pointerDown = false;
    if (this.inputLocked) return;

    const cell = this.getCellFromEvent(event);
    if (!cell || !this.selectedCell) return;

    const sameCell = cell.row === this.selectedCell.row && cell.col === this.selectedCell.col;
    if (sameCell) {
      this.setSelectedCell(null);
      return;
    }

    if (!this.engine?.isAdjacent(cell, this.selectedCell)) {
      this.setSelectedCell(cell);
      return;
    }

    await this.trySwap(this.selectedCell, cell);
    this.setSelectedCell(null);
  };

  handlePointerCancel = () => {
    this.pointerDown = false;
    this.setSelectedCell(null);
  };

  setSelectedCell(cell) {
    this.selectedCell = cell;
    if (this.renderer) {
      this.renderer.setSelection(cell);
    }
  }

  getCellFromEvent(event) {
    if (!this.boardEl || !this.renderer) return null;
    const rect = this.boardEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const { offsetX, offsetY, spacing, tileSize, boardWidth, boardHeight } = this.renderer.metrics;
    if (x < offsetX || y < offsetY) return null;
    if (x > offsetX + boardWidth || y > offsetY + boardHeight) return null;

    const localX = x - offsetX - spacing;
    const localY = y - offsetY - spacing;
    if (localX < 0 || localY < 0) return null;

    const cellSpan = tileSize + spacing;
    const col = Math.floor(localX / cellSpan);
    const row = Math.floor(localY / cellSpan);
    if (row < 0 || col < 0 || row >= this.engine.rows || col >= this.engine.cols) return null;

    const offsetCellX = localX - col * cellSpan;
    const offsetCellY = localY - row * cellSpan;
    if (offsetCellX > tileSize || offsetCellY > tileSize) return null;

    return { row, col };
  }

  async trySwap(from, to) {
    if (!this.engine || !this.renderer) return;
    this.inputLocked = true;
    const tileA = this.engine.getTile(from);
    const tileB = this.engine.getTile(to);
    if (!tileA || !tileB) {
      this.inputLocked = false;
      return;
    }
    try {
      await this.renderer.animateSwap(tileA, tileB, from, to);
      const result = this.engine.resolveSwap(from, to);
      if (result.matched) {
        const gained = result.cleared * SCORE_PER_TILE + (result.bonus || 0);
        this.score += gained;
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          this.storage?.setBestScore?.(this.bestScore);
        }
        this.movesRemaining = Math.max(0, this.movesRemaining - 1);
        this.turnsUsed += 1;
        if (window.EconomyManager) {
          window.EconomyManager.awardFromScore(this.gameId, this.score);
        }
        this.syncHud();
        this.saveState();
        this.render();
        this.checkGameOver();
      } else {
        await this.renderer.animateSwap(tileA, tileB, to, from);
        this.render();
      }
    } finally {
      this.inputLocked = false;
    }
  }

  render() {
    if (!this.renderer || !this.engine) return;
    this.renderer.setLastGrid(this.engine.grid);
    this.renderer.render(this.engine.grid);
  }

  loadLevel(levelId, { useSaved } = {}) {
    const level = this.getLevelConfig(levelId);
    if (!level) return;
    this.currentLevel = levelId;
    this.storage = new Match3StorageManager(levelId);
    this.bestScore = this.storage.getBestScore();

    this.engine = new Match3Engine({
      rows: level.board,
      cols: level.board,
      types: level.colors,
    });

    const saved = useSaved ? this.storage.getGameState() : null;
    if (saved && saved.grid && saved.score !== undefined) {
      const loaded = this.engine.loadState(saved.grid);
      if (loaded) {
        this.score = saved.score || 0;
        this.movesRemaining = saved.movesRemaining ?? level.moves;
        this.turnsUsed = saved.turnsUsed || 0;
      }
    } else {
      this.score = 0;
      this.movesRemaining = level.moves;
      this.turnsUsed = 0;
    }

    if (this.renderer) {
      this.renderer.setGridSize(level.board, level.board);
    }
    this.inputLocked = false;
    this.setSelectedCell(null);
    this.syncHud();
    this.render();
  }

  saveState() {
    if (!this.storage || !this.engine) return;
    this.storage.setGameState({
      grid: this.engine.toState(),
      score: this.score,
      movesRemaining: this.movesRemaining,
      turnsUsed: this.turnsUsed,
    });
  }

  checkGameOver() {
    const level = this.getLevelConfig(this.currentLevel);
    if (!level) return;
    if (this.score >= level.target) {
      this.finishLevel(true);
    } else if (this.movesRemaining <= 0) {
      this.finishLevel(false);
    }
  }

  finishLevel(isWin) {
    this.inputLocked = true;
    if (this.score > this.bestScore && this.storage) {
      this.storage.setBestScore(this.score);
      this.bestScore = this.score;
    }
    if (this.storage) {
      this.storage.clearGameState();
    }
    const detail = {
      score: this.score,
      stats: { turns: this.turnsUsed, undos: 0 },
      mode: isWin ? "win" : "gameover",
      level: this.currentLevel,
      gameId: this.gameId,
    };
    const evt = new CustomEvent("game:over", { detail, bubbles: true });
    this.container.dispatchEvent(evt);
  }

  requestRestart(options = {}) {
    const shouldConfirm = options.confirm !== false;
    const performRestart = () => {
      this.loadLevel(this.currentLevel, { useSaved: false });
    };
    if (shouldConfirm && this.confirmHandler) {
      this.confirmHandler({
        title: "Restart level?",
        message: "Your current run will be lost.",
        confirmText: "Yes",
        cancelText: "No",
        onConfirm: performRestart,
      });
      return;
    }
    performRestart();
  }

  setConfirmHandler(handler) {
    this.confirmHandler = handler;
  }

  getCurrentLevel() {
    return this.currentLevel;
  }

  getLevelConfig(levelId) {
    return LEVELS.find((level) => level.id === levelId) || LEVELS[0];
  }

  getLevelName(levelId) {
    return this.getLevelConfig(levelId)?.name || `Level ${levelId}`;
  }

  getLevelTitle(levelId) {
    const config = this.getLevelConfig(levelId);
    if (!config) return `Level ${levelId}`;
    return config.title ? `${config.name}: ${config.title}` : config.name;
  }

  getBestScore(levelId) {
    const storage = new Match3StorageManager(levelId);
    return storage.getBestScore();
  }

  isLevelUnlocked(levelId) {
    if (levelId === DEFAULT_LEVEL) return true;
    const prev = this.getLevelConfig(levelId - 1);
    if (!prev) return false;
    const bestScore = this.getBestScore(levelId - 1);
    return bestScore >= prev.target;
  }

  getLevelSummary() {
    return LEVEL_IDS.map((levelId) => {
      const bestScore = this.getBestScore(levelId);
      const unlocked = this.isLevelUnlocked(levelId);
      const isCurrent = levelId === this.currentLevel;
      const status = !unlocked ? "locked" : isCurrent ? "current" : "unlocked";
      const config = this.getLevelConfig(levelId);
      return {
        id: levelId,
        name: this.getLevelName(levelId),
        title: config?.title || "",
        displayTitle: this.getLevelTitle(levelId),
        previewImage: config?.previewImage || "",
        bestScore,
        unlocked,
        isCurrent,
        status,
      };
    });
  }

  getLevelSelectMeta() {
    return {
      subtitle: "Hit the target score to unlock the next level.",
      comingSoon: null,
    };
  }

  setLevel(levelId) {
    if (!LEVEL_IDS.includes(levelId)) return false;
    if (!this.isLevelUnlocked(levelId)) return false;
    if (levelId === this.currentLevel) return false;
    this.loadLevel(levelId, { useSaved: true });
    return true;
  }

  syncHud() {
    if (this.levelBadge) {
      this.levelBadge.textContent = this.getLevelName(this.currentLevel);
    }
    if (this.scoreEl) {
      this.scoreEl.textContent = this.score.toLocaleString();
    }
    if (this.movesEl) {
      this.movesEl.textContent = this.movesRemaining.toLocaleString();
    }
    const level = this.getLevelConfig(this.currentLevel);
    if (this.targetEl && level) {
      this.targetEl.textContent = level.target.toLocaleString();
    }
    if (this.bestEl) {
      this.bestEl.textContent = this.bestScore.toLocaleString();
    }
  }

  getTemplate() {
    return `
      <div class="match3-container">
        <div class="match3-header glass-panel">
          <div class="title-stack">
            <h1>Match-3</h1>
            <span id="match3-level-badge" class="glass-pill level-badge">Level 1</span>
          </div>
          <div class="scores match3-scores">
            <div class="score-container glass-pill" data-label="Score">
              <span class="score-label">Score</span>
              <span id="match3-score" class="score-value">0</span>
            </div>
            <div class="score-container glass-pill" data-label="Target">
              <span class="score-label">Target</span>
              <span id="match3-target" class="score-value">0</span>
            </div>
            <div class="score-container glass-pill" data-label="Moves">
              <span class="score-label">Moves</span>
              <span id="match3-moves" class="score-value">0</span>
            </div>
            <div class="score-container glass-pill" data-label="Best">
              <span class="score-label">Best</span>
              <span id="match3-best" class="score-value">0</span>
            </div>
            <button id="settings-button" class="ui-button secondary small settings-inline" aria-label="Settings">Settings</button>
          </div>
          <div class="header-buttons">
            <button id="show-leaderboard" class="ui-button secondary small header-left" aria-label="Leaderboard">Scores</button>
            <button id="match3-restart" class="ui-button secondary">Restart</button>
            <span class="header-spacer"></span>
            <button id="level-select-button" class="ui-button secondary">Levels</button>
          </div>
        </div>
        <div class="match3-stage">
          <div id="match3-board" class="match3-board"></div>
        </div>
      </div>
    `;
  }

  resume() {
    this.syncHud();
    if (this.renderer) {
      this.renderer.resize();
    }
    this.render();
  }

  pause() {}

  destroy() {
    if (this.boardEl) {
      this.boardEl.removeEventListener("pointerdown", this.handlePointerDown);
      this.boardEl.removeEventListener("pointerup", this.handlePointerUp);
      this.boardEl.removeEventListener("pointerleave", this.handlePointerCancel);
      this.boardEl.removeEventListener("pointercancel", this.handlePointerCancel);
    }
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    super.destroy();
  }
}
