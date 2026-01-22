import { GameInterface } from '../../core/GameInterface.js';
import { GameManager } from './components/GameManager.js';
import { KeyboardInputManager } from './components/KeyboardInputManager.js';
import { PixiActuator } from './components/PixiActuator.js';
import { LocalStorageManager } from './components/LocalStorageManager.js';
import { PixiBoardRenderer } from './components/PixiBoardRenderer.js';
import { EffectManager } from './components/EffectManager.js';

const ECONOMY_GAME_ID = "2048";
const GAME_OVER_QUOTES = [ /* Keep your existing quotes if you want, omitted for brevity */ ];
const ASSET_PATH = "assets/levels/level-1";

export class Photo2048 extends GameInterface {
    constructor() {
        super("2048");
        this.gameInstance = null;
        this.assetsLoaded = false;
        this.customImages = {};
        this.customImageAvailability = {};
        this.currencyUnsubscribe = null;
        this.boardRenderer = null;
        this.actuator = null;
        this.confirmHandler = null;
        this.restartPending = false;
        this.storageManager = null;
        
        // Resolve base URL for assets (handles GitHub Pages subpath deployment)
        const envBase = import.meta.env?.BASE_URL || '/';
        this.assetBase = envBase.endsWith('/') ? envBase : `${envBase}/`;
    }

    /**
     * Resolves an asset path against the base URL for production deployments.
     * @param {string} path - Relative asset path (e.g., "assets/levels/level-1/2.jpg")
     * @returns {string} - Full URL path
     */
    resolveAsset(path) {
        if (!path) return path;
        // Already absolute or data URL
        if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
            return path;
        }
        // Remove leading slash if present to avoid double slashes
        const cleanPath = path.replace(/^\/+/, '');
        return `${this.assetBase}${cleanPath}`;
    }

    async mount(container) {
        super.mount(container);
        this.container.innerHTML = this.getTemplate();
        this.setupUI();

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

        this.loadAssets();

        // 3. Now it is safe to start the game
        this.start();
    }

    loadAssets() {
        if (this.assetsLoaded) return;
        this.assetsLoaded = true;
        
        this.customImages = {};
        this.customImageAvailability = {};
        window.customImageAvailability = this.customImageAvailability;

        // Only preload assets we ship
        const values = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
        values.forEach(val => {
            // Resolve against base URL for production deployments (e.g., GitHub Pages)
            this.customImages[val] = this.resolveAsset(`${ASSET_PATH}/${val}.jpg`);
            this.customImageAvailability[val] = false;
            const img = new Image();
            img.onload = () => {
                this.customImageAvailability[val] = true;
                if (this.boardRenderer) {
                    this.boardRenderer.setTileTexture(val, img);
                }
                if (this.gameInstance && this.gameInstance.actuator) {
                     this.gameInstance.actuate();
                }
            };
            img.onerror = () => {
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
            namespace: "photo2048",
            migrateLegacy: true
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
        this.assetsLoaded = false;
        
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

    restart() {
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
            this.restart();
            return;
        }
        if (this.restartPending) return;
        const performRestart = () => {
            this.restartPending = false;
            this.restart();
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

    /**
     * Dev tool: Force the game into a game-over state.
     */
    forceGameOver() {
        if (!this.gameInstance) return;
        this.gameInstance.over = true;
        this.gameInstance.actuate();
    }

    /**
     * Dev tool: Add a 2048 tile to a random empty cell.
     */
    async add2048Tile() {
        if (!this.gameInstance || !this.gameInstance.grid) return;
        const { Tile } = await import('./components/Tile.js');
        const cell = this.gameInstance.grid.randomAvailableCell();
        if (!cell) return;
        const tile = new Tile(cell, 2048);
        this.gameInstance.grid.insertTile(tile);
        this.gameInstance.won = true;
        this.gameInstance.actuate();
    }

    getTemplate() {
        return `
        <div class="container">
            <header class="glass-panel">
                <div class="header-top-row">
                    <h1>2048</h1>
                    <button class="ui-button secondary small icon-only settings-inline" data-settings-trigger="true" aria-label="Settings" title="Settings">⚙️</button>
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
                </div>
                <div class="header-buttons">
                    <button id="show-leaderboard" class="ui-button secondary small header-left" aria-label="Leaderboard">Scores</button>
                    <button id="undo-button" class="ui-button secondary undo-button" disabled>↩️ Undo</button>
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
