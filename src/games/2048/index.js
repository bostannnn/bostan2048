import { GameInterface } from '../../core/GameInterface.js';
import { GameManager } from './components/GameManager.js';
import { KeyboardInputManager } from './components/KeyboardInputManager.js';
import { PixiActuator } from './components/PixiActuator.js';
import { LocalStorageManager } from './components/LocalStorageManager.js';
import { PixiBoardRenderer } from './components/PixiBoardRenderer.js';
import { EffectManager } from './components/EffectManager.js';

const ECONOMY_GAME_ID = "2048";
const GAME_OVER_QUOTES = [ /* Keep your existing quotes if you want, omitted for brevity */ ];
const LEVEL_UNLOCK_SCORE = 2048;
const LEVELS = [
    {
        id: 1,
        name: "Level 1",
        title: "City Escape",
        assetPath: "assets/levels/level-1",
        previewImage: "assets/levels/level-1/2048.jpg"
    },
    {
        id: 2,
        name: "Level 2",
        title: "Forest Trail",
        assetPath: "assets/levels/level-2",
        previewImage: "assets/levels/level-2/2048.jpg"
    },
    {
        id: 3,
        name: "Level 3",
        title: "Desert Voyage",
        assetPath: "assets/levels/level-3",
        previewImage: "assets/levels/level-3/2048.jpg"
    }
];
const LEVEL_IDS = LEVELS.map((level) => level.id);
const DEFAULT_LEVEL = LEVELS[0].id;

export class Photo2048 extends GameInterface {
    constructor() {
        super("2048");
        this.gameInstance = null;
        this.levelLoadToken = 0;
        this.loadedLevelId = null;
        this.customImages = {};
        this.customImageAvailability = {};
        this.currencyUnsubscribe = null;
        this.boardRenderer = null;
        this.actuator = null;
        this.confirmHandler = null;
        this.restartPending = false;
        this.currentLevel = DEFAULT_LEVEL;
        this.storageManager = null;
    }

    async mount(container) {
        super.mount(container);
        this.container.innerHTML = this.getTemplate();
        this.setupUI();
        this.updateLevelBadge();

        // 1. Initialize the Renderer
        this.initBoardRenderer();

        // 2. CRITICAL FIX: Wait for PixiJS to be ready before starting logic
        if (this.boardRenderer) {
            await this.boardRenderer.ready;
        }

        // Expose images to window so HTMLActuator can find them (legacy compat)
        window.CustomImages = this.customImages;
        window.customImageAvailability = this.customImageAvailability;
        this.bindCurrencyDisplay();

        this.applyLevelAssets(this.currentLevel);

        // 3. Now it is safe to start the game
        this.start();
    }

    applyLevelAssets(levelId) {
        const config = this.getLevelConfig(levelId);
        const assetPath = config?.assetPath || this.getLevelConfig(DEFAULT_LEVEL)?.assetPath;
        if (!assetPath) return;
        if (this.loadedLevelId === levelId) return;

        this.loadedLevelId = levelId;
        this.levelLoadToken += 1;
        const token = this.levelLoadToken;
        this.customImages = {};
        this.customImageAvailability = {};
        window.customImageAvailability = this.customImageAvailability;

        // Only preload assets we ship
        const values = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
        values.forEach(val => {
            this.customImages[val] = `${assetPath}/${val}.jpg`;
            this.customImageAvailability[val] = false;
            const img = new Image();
            img.onload = () => {
                if (token !== this.levelLoadToken) return;
                this.customImageAvailability[val] = true;
                if (this.boardRenderer) {
                    this.boardRenderer.setTileTexture(val, img);
                }
                if (this.gameInstance && this.gameInstance.actuator) {
                     this.gameInstance.actuate();
                }
            };
            img.onerror = () => {
                if (token !== this.levelLoadToken) return;
                this.customImageAvailability[val] = false;
            };
            img.src = this.customImages[val];
        });
        window.CustomImages = this.customImages;
        if (this.boardRenderer) {
            this.boardRenderer.setThemeAssets(this.customImages, this.customImageAvailability);
        }
    }

    start() {
        // Ensure EffectManager is available globally
        if (!window.effectManager) {
            window.effectManager = new EffectManager(".game-container");
        } else {
            window.effectManager.resize();
        }
        window.effectManager?.start?.();

        const actuator = new PixiActuator(this.container, this.boardRenderer);
        this.actuator = actuator;

        // Clean up previous instance to remove event listeners
        if (this.gameInstance && this.gameInstance.destroy) {
            this.gameInstance.destroy();
        }

        this.storageManager = new LocalStorageManager({
            namespace: this.getLevelNamespace(this.currentLevel),
            migrateLegacy: this.currentLevel === DEFAULT_LEVEL
        });

        this.gameInstance = new GameManager(4, KeyboardInputManager, actuator, this.storageManager, {
            onRestart: () => {
                this.requestRestart();
            },
            onEconomyRun: (hasState) => {
                if (!window.EconomyManager) return;
                if (hasState) {
                    window.EconomyManager.ensureRun(ECONOMY_GAME_ID);
                } else {
                    window.EconomyManager.startRun(ECONOMY_GAME_ID);
                }
            },
            onScore: (score) => {
                if (!window.EconomyManager) return;
                window.EconomyManager.awardFromScore(ECONOMY_GAME_ID, score);
            },
            onGameEnd: (score, grid, stats = {}) => {
                const evt = new CustomEvent("game:over", { detail: { score, grid, stats }, bubbles: true });
                this.container.dispatchEvent(evt);
            }
        });
    }

    resume() {
        this.updateLevelBadge();
        if (window.effectManager && window.effectManager.resize) {
            window.effectManager.resize();
        }
        window.effectManager?.start?.();
        if (this.boardRenderer) {
            this.boardRenderer.resize();
        }
        if (this.gameInstance && this.gameInstance.actuate) {
            this.gameInstance.actuate();
        }
    }

    pause() {
        window.effectManager?.stop?.();
    }

    destroy() {
        if (this.currencyUnsubscribe) {
            this.currencyUnsubscribe();
            this.currencyUnsubscribe = null;
        }
        if (this.boardRenderer) {
            this.boardRenderer.destroy();
            this.boardRenderer = null;
        }
        this.loadedLevelId = null;
        
        // Critical: cleanup input listeners
        if (this.gameInstance && this.gameInstance.destroy) {
            this.gameInstance.destroy();
        }
        this.gameInstance = null;
        
        this.actuator = null;
        super.destroy();
    }

    initBoardRenderer() {
        if (this.boardRenderer) return;
        const host = this.container?.querySelector(".game-container");
        if (!host) return;
        this.boardRenderer = new PixiBoardRenderer(host, {
            size: 4,
            imagePaths: this.customImages,
            imageAvailability: this.customImageAvailability
        });
    }

    restartLevel() {
        this.applyLevelAssets(this.currentLevel);
        if (this.gameInstance) {
            this.gameInstance.reset();
        }
    }

    setConfirmHandler(handler) {
        this.confirmHandler = handler;
    }

    requestRestart(options = {}) {
        const shouldConfirm = options.confirm !== false;
        if (!shouldConfirm) {
            this.restartPending = false;
            this.restartLevel();
            return;
        }
        if (this.restartPending) return;
        const performRestart = () => {
            this.restartPending = false;
            this.restartLevel();
        };
        const cancelRestart = () => {
            this.restartPending = false;
        };

        if (this.confirmHandler) {
            this.restartPending = true;
            this.confirmHandler({
                title: "Start new game?",
                message: "Your current run will be lost.",
                confirmText: "Yes",
                cancelText: "No",
                onConfirm: performRestart,
                onCancel: cancelRestart
            });
            return;
        }

        performRestart();
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

    getLevelNamespace(levelId) {
        return `photo2048:level-${levelId}`;
    }

    isLevelUnlocked(levelId) {
        if (levelId === DEFAULT_LEVEL) return true;
        const previousBest = this.getBestScore(levelId - 1);
        return previousBest >= LEVEL_UNLOCK_SCORE;
    }

    getBestScore(levelId) {
        const storage = new LocalStorageManager({
            namespace: this.getLevelNamespace(levelId),
            migrateLegacy: levelId === DEFAULT_LEVEL
        });
        return Number(storage.getBestScore()) || 0;
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
                assetPath: config?.assetPath || "",
                previewImage: config?.previewImage || "",
                bestScore,
                unlocked,
                isCurrent,
                status
            };
        });
    }

    getLevelSelectMeta() {
        return {
            subtitle: "Reach 2048 to unlock the next level.",
            comingSoon: {
                label: "Level 4",
                title: "Coming Soon",
                meta: "New levels coming soon."
            }
        };
    }

    setLevel(levelId) {
        if (!LEVEL_IDS.includes(levelId)) return false;
        if (!this.isLevelUnlocked(levelId)) return false;
        if (levelId === this.currentLevel) return false;
        this.currentLevel = levelId;
        this.applyLevelAssets(levelId);
        this.updateLevelBadge();
        this.start();
        return true;
    }

    updateLevelBadge() {
        const badge = this.container?.querySelector("#level-badge");
        if (!badge) return;
        badge.textContent = this.getLevelName(this.currentLevel);
    }

    getTemplate() {
        return `
        <div class="container">
            <header class="glass-panel">
                <div class="title-stack">
                    <h1>2048</h1>
                    <span id="level-badge" class="glass-pill level-badge">Level 1</span>
                </div>
                <div class="scores">
                    <div class="score-container glass-pill" data-label="Score">
                        <span class="score-label">⭐ Score</span>
                        <span class="score-value">0</span>
                    </div>
                    <div class="best-container glass-pill" data-label="Best">
                        <span class="score-label">🏆 Best</span>
                        <span class="score-value">0</span>
                    </div>
                    
                    <div class="currency-container glass-pill" id="currency-balance" data-label="Coins">
                        <span class="score-label">🪙 Coins</span>
                        <span class="score-value">0</span>
                    </div>
                    <button class="ui-button secondary small icon-only settings-inline" data-settings-trigger="true" aria-label="Settings" title="Settings">⚙️</button>
                </div>
                <div class="header-buttons">
                    <button id="show-leaderboard" class="ui-button secondary small header-left" aria-label="Leaderboard">Scores</button>
                    <button id="undo-button" class="ui-button secondary undo-button" disabled>↩️ Undo</button>
                    <span class="header-spacer"></span>
                    <button id="level-select-button" class="ui-button secondary">Levels</button>
                </div>
            </header>

            <div class="game-stage">
                <div class="game-container">
                    </div>

                <div class="game-message">
                    <p></p>
                    <div class="lower">
                        <a class="keep-playing-button ui-button small secondary">Keep playing</a>
                        <a class="retry-button ui-button small gold">Try again</a>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    setupUI() {
        const showButton = this.container.querySelector("#show-leaderboard");

        if (showButton) {
            showButton.addEventListener("click", (event) => {
                event.preventDefault();
                if (window.openLeaderboard) {
                    window.openLeaderboard();
                }
            });
        }

        const retryButton = this.container.querySelector(".retry-button");
        if (retryButton) {
            retryButton.addEventListener("click", (event) => {
                event.preventDefault();
                const stats = this.gameInstance?.getStats ? this.gameInstance.getStats() : {};
                const score = this.gameInstance?.score || 0;
                const payload = {
                    mode: "win",
                    score,
                    turns: Number(stats.turns) || 0,
                    undos: Number(stats.undos) || 0,
                    showEntryForm: true
                };
                const messageEl = this.container.querySelector(".game-message");
                if (messageEl) messageEl.classList.add("hidden");
                if (window.openLeaderboard) {
                    window.openLeaderboard(payload);
                }
            });
        }
    }

    bindCurrencyDisplay() {
        const display = this.container.querySelector("#currency-balance");
        if (!display || !window.EconomyManager) return;
        const update = (coins) => {
            const value = Number.isFinite(coins) ? coins : window.EconomyManager.getCoins();
            const valueEl = display.querySelector(".score-value");
            if (valueEl) {
                valueEl.textContent = Number(value).toLocaleString();
            } else {
                display.textContent = Number(value).toLocaleString();
            }
        };
        update();
        if (window.AppBus && window.AppBus.on) {
            this.currencyUnsubscribe = window.AppBus.on("economy:changed", ({ coins }) => update(coins));
        }
    }
}
