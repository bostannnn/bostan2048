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
    sparkle: "assets/match3/kenney_puzzle-pack/png/particleSmallStar.png",
    burst: "assets/match3/kenney_puzzle-pack/png/particleStar.png",
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
    this.pointerId = null;
    this.dragStart = null;
    this.dragSwapTriggered = false;
    this.lastHoverCell = null;
    this.currentStreak = 0;
    this.maxStreak = 0;
    this.maxComboMultiplier = 1;
    this.totalShuffles = 0;
    this.hintTimer = null;
    this.idleHintDelay = 7000;
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
      this.boardEl.addEventListener("pointermove", this.handlePointerMove);
      this.boardEl.addEventListener("pointerup", this.handlePointerUp);
      this.boardEl.addEventListener("pointerleave", this.handlePointerCancel);
      this.boardEl.addEventListener("pointercancel", this.handlePointerCancel);
    }
  }

  handlePointerDown = (event) => {
    if (this.inputLocked) return;
    const cell = this.getCellFromEvent(event);
    if (!cell) return;
    this.resetIdleHint();
    this.pointerDown = true;
    this.pointerId = event.pointerId ?? null;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.dragSwapTriggered = false;
    this.lastHoverCell = cell;
    if (this.boardEl && event.pointerId !== undefined) {
      this.boardEl.setPointerCapture?.(event.pointerId);
    }
    this.setSelectedCell(cell);
  };

  handlePointerMove = (event) => {
    if (!this.pointerDown || this.inputLocked || !this.selectedCell || !this.renderer) return;
    this.resetIdleHint();
    const cell = this.getCellFromEvent(event);
    if (cell) {
      this.lastHoverCell = cell;
    }
    if (this.dragSwapTriggered) return;

    const dx = event.clientX - (this.dragStart?.x ?? event.clientX);
    const dy = event.clientY - (this.dragStart?.y ?? event.clientY);
    const target = this.getDragTarget(dx, dy, this.selectedCell);
    if (!target) return;
    this.dragSwapTriggered = true;
    this.pointerDown = false;
    void this.trySwap(this.selectedCell, target);
    this.setSelectedCell(null);
    this.releasePointerCapture(event);
    this.dragStart = null;
    this.lastHoverCell = null;
  };

  handlePointerUp = async (event) => {
    if (!this.pointerDown) return;
    this.pointerDown = false;
    this.releasePointerCapture(event);
    if (this.inputLocked) return;
    this.resetIdleHint();

    if (!this.selectedCell) return;
    const cell = this.getCellFromEvent(event) || this.lastHoverCell;
    const finalize = () => {
      this.dragStart = null;
      this.lastHoverCell = null;
    };

    const dx = event.clientX - (this.dragStart?.x ?? event.clientX);
    const dy = event.clientY - (this.dragStart?.y ?? event.clientY);
    const dragTarget = this.getDragTarget(dx, dy, this.selectedCell);
    if (dragTarget) {
      await this.trySwap(this.selectedCell, dragTarget);
      this.setSelectedCell(null);
      finalize();
      return;
    }

    if (!cell) {
      this.setSelectedCell(null);
      finalize();
      return;
    }

    const sameCell = cell.row === this.selectedCell.row && cell.col === this.selectedCell.col;
    if (sameCell) {
      this.setSelectedCell(null);
      finalize();
      return;
    }

    if (!this.engine?.isAdjacent(cell, this.selectedCell)) {
      this.setSelectedCell(cell);
      finalize();
      return;
    }

    await this.trySwap(this.selectedCell, cell);
    this.setSelectedCell(null);
    finalize();
  };

  handlePointerCancel = () => {
    this.pointerDown = false;
    this.releasePointerCapture();
    this.setSelectedCell(null);
    this.dragStart = null;
    this.lastHoverCell = null;
    this.dragSwapTriggered = false;
    this.resetIdleHint();
  };

  releasePointerCapture(event) {
    if (!this.boardEl) return;
    const pointerId = event?.pointerId ?? this.pointerId;
    if (pointerId === null || pointerId === undefined) return;
    try {
      this.boardEl.releasePointerCapture?.(pointerId);
    } catch (error) {
      // Ignore if capture was not set.
    }
    this.pointerId = null;
  }

  setSelectedCell(cell) {
    this.selectedCell = cell;
    if (this.renderer) {
      this.renderer.setSelection(cell);
      this.renderer.clearHint();
    }
  }

  getCellFromEvent(event) {
    if (!this.boardEl || !this.renderer || !this.engine) return null;
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
    this.resetIdleHint();
    this.renderer.clearHint();
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
        const cascades = Math.max(1, result.cascades || 1);
        const comboMultiplier = 1 + Math.min(0.6, Math.max(0, cascades - 1) * 0.12);
        const cascadeDamp = 1 / (1 + Math.max(0, cascades - 1) * 0.2);
        this.currentStreak += 1;
        this.maxStreak = Math.max(this.maxStreak, this.currentStreak);
        this.maxComboMultiplier = Math.max(this.maxComboMultiplier, comboMultiplier);
        const baseScore = result.cleared * SCORE_PER_TILE + (result.bonus || 0);
        const streakBonus = Math.max(0, this.currentStreak - 1) * 120;
        const gained = Math.round(baseScore * comboMultiplier * cascadeDamp + streakBonus);
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
        if (cascades > 1) {
          const intensity = Math.min(0.35, 0.18 + (cascades - 1) * 0.06);
          this.renderer.flashBoard(0xffd36a, intensity);
        }
        const finished = this.checkGameOver();
        if (!finished && this.movesRemaining > 0) {
          this.ensurePlayableBoard();
        }
      } else {
        this.currentStreak = 0;
        await this.renderer.animateSwap(tileA, tileB, to, from);
        this.render();
        await this.renderer.animateReject(tileA, tileB);
        if (navigator.vibrate) {
          navigator.vibrate(20);
        }
      }
    } finally {
      this.inputLocked = false;
      this.scheduleIdleHint();
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
    const target = level.target;

    this.engine = new Match3Engine({
      rows: level.board,
      cols: level.board,
      types: level.colors,
    });

    const saved = useSaved ? this.storage.getGameState() : null;
    let loadedFromSave = false;
    if (saved && saved.grid && saved.score !== undefined) {
      const grid = saved.grid;
      const gridValid = grid.rows === level.board && grid.cols === level.board && Array.isArray(grid.tiles);
      const levelMatches = saved.levelId === undefined || saved.levelId === levelId;
      const targetMatches = saved.target === undefined || saved.target === target;
      const movesRemaining = saved.movesRemaining ?? level.moves;
      const score = Number(saved.score) || 0;
      const runStillActive = movesRemaining > 0 && score < target;

      if (gridValid && levelMatches && targetMatches && runStillActive) {
        const loaded = this.engine.loadState(grid);
        if (loaded) {
          this.score = score;
          this.movesRemaining = movesRemaining;
          this.turnsUsed = saved.turnsUsed || 0;
          this.currentStreak = saved.currentStreak || 0;
          this.maxStreak = saved.maxStreak || 0;
          this.maxComboMultiplier = saved.maxComboMultiplier || 1;
          this.totalShuffles = saved.totalShuffles || 0;
          loadedFromSave = true;
        }
      }
    }

    if (!loadedFromSave) {
      this.storage.clearGameState();
      this.score = 0;
      this.movesRemaining = level.moves;
      this.turnsUsed = 0;
      this.currentStreak = 0;
      this.maxStreak = 0;
      this.maxComboMultiplier = 1;
      this.totalShuffles = 0;
    }

    if (this.renderer) {
      this.renderer.setGridSize(level.board, level.board);
    }
    this.inputLocked = false;
    this.setSelectedCell(null);
    this.syncHud();
    this.render();
    this.ensurePlayableBoard({ silent: true });
    this.scheduleIdleHint();
  }

  saveState() {
    if (!this.storage || !this.engine) return;
    const level = this.getLevelConfig(this.currentLevel);
    this.storage.setGameState({
      levelId: this.currentLevel,
      target: level?.target ?? null,
      grid: this.engine.toState(),
      score: this.score,
      movesRemaining: this.movesRemaining,
      turnsUsed: this.turnsUsed,
      currentStreak: this.currentStreak,
      maxStreak: this.maxStreak,
      maxComboMultiplier: this.maxComboMultiplier,
      totalShuffles: this.totalShuffles,
    });
  }

  checkGameOver() {
    const level = this.getLevelConfig(this.currentLevel);
    if (!level) return false;
    if (this.score >= level.target) {
      this.finishLevel(true);
      return true;
    } else if (this.movesRemaining <= 0) {
      this.finishLevel(false);
      return true;
    }
    return false;
  }

  finishLevel(isWin) {
    this.inputLocked = true;
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
    this.renderer?.clearHint();
    const level = this.getLevelConfig(this.currentLevel);
    if (isWin && this.storage) {
      const nextBest = Math.max(this.bestScore, this.score, level?.target ?? 0);
      this.storage.setBestScore(nextBest);
      this.bestScore = nextBest;
    } else if (this.score > this.bestScore && this.storage) {
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
      summary: {
        movesUsed: this.turnsUsed,
        movesRemaining: this.movesRemaining,
        maxComboMultiplier: Number(this.maxComboMultiplier.toFixed(2)),
        maxStreak: this.maxStreak,
        shuffles: this.totalShuffles,
      },
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
    if (bestScore >= prev.target) return true;
    if (levelId - 1 === this.currentLevel) {
      return this.score >= prev.target;
    }
    return false;
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

  getDragTarget(dx, dy, origin) {
    if (!this.renderer || !this.engine || !origin) return null;
    const distance = Math.hypot(dx, dy);
    const threshold = Math.max(10, this.renderer.metrics.tileSize * 0.22);
    if (distance < threshold) return null;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const target = {
      row: origin.row + (horizontal ? 0 : dy > 0 ? 1 : -1),
      col: origin.col + (horizontal ? (dx > 0 ? 1 : -1) : 0),
    };
    if (target.row < 0 || target.col < 0 || target.row >= this.engine.rows || target.col >= this.engine.cols) {
      return null;
    }
    return target;
  }

  ensurePlayableBoard({ silent } = {}) {
    if (!this.engine) return false;
    if (this.engine.hasValidMove()) return false;
    const shuffled = this.engine.shuffle();
    if (shuffled) {
      this.totalShuffles += 1;
      this.currentStreak = 0;
      this.render();
      if (!silent) {
        this.renderer?.flashBoard(0xffffff, 0.22);
      }
      this.saveState();
    }
    return shuffled;
  }

  scheduleIdleHint() {
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
    }
    this.hintTimer = setTimeout(() => {
      if (this.pointerDown || this.inputLocked || !this.engine || !this.renderer) {
        this.scheduleIdleHint();
        return;
      }
      const hint = this.engine.findValidSwap();
      if (!hint) {
        const shuffled = this.ensurePlayableBoard();
        if (shuffled) {
          this.scheduleIdleHint();
        }
        return;
      }
      this.renderer.showHint([hint.from, hint.to]);
    }, this.idleHintDelay);
  }

  resetIdleHint() {
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
    }
    if (this.renderer) {
      this.renderer.clearHint();
    }
    this.scheduleIdleHint();
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
              <span class="score-label">⭐ Score</span>
              <span id="match3-score" class="score-value">0</span>
            </div>
            <div class="score-container glass-pill" data-label="Target">
              <span class="score-label">🎯 Target</span>
              <span id="match3-target" class="score-value">0</span>
            </div>
            <div class="score-container glass-pill" data-label="Moves">
              <span class="score-label">👣 Moves</span>
              <span id="match3-moves" class="score-value">0</span>
            </div>
            <div class="score-container glass-pill" data-label="Best">
              <span class="score-label">🏆 Best</span>
              <span id="match3-best" class="score-value">0</span>
            </div>
            <button class="ui-button secondary small icon-only settings-inline" data-settings-trigger="true" aria-label="Settings" title="Settings">⚙️</button>
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
    this.scheduleIdleHint();
  }

  pause() {
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
    this.renderer?.clearHint();
  }

  destroy() {
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
    if (this.boardEl) {
      this.boardEl.removeEventListener("pointerdown", this.handlePointerDown);
      this.boardEl.removeEventListener("pointermove", this.handlePointerMove);
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
