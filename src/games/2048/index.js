import { GameInterface } from '../../core/GameInterface.js';
import { GameManager } from './components/GameManager.js';
import { KeyboardInputManager } from './components/KeyboardInputManager.js';
import { PixiActuator } from './components/PixiActuator.js';
import { LocalStorageManager } from './components/LocalStorageManager.js';
import { PixiBoardRenderer } from './components/PixiBoardRenderer.js';
import { EffectManager } from './components/EffectManager.js';

const ECONOMY_GAME_ID = "2048";
const GAME_OVER_QUOTES = [ /* Keep your existing quotes if you want, omitted for brevity */ ];

export class Photo2048 extends GameInterface {
    constructor() {
        super("2048");
        this.gameInstance = null;
        this.selectedTheme = 'classic';
        this.themeLoadToken = 0;
        this.customImages = {};
        this.customImageAvailability = {};
        this.currencyUnsubscribe = null;
        this.boardRenderer = null;
        this.actuator = null;
        this.confirmHandler = null;
        this.restartPending = false;
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
        
        this.applyTheme(this.selectedTheme);
        
        // 3. Now it is safe to start the game
        this.start();
    }

    applyTheme(theme) {
        this.selectedTheme = theme;
        this.themeLoadToken += 1;
        const token = this.themeLoadToken;
        this.customImageAvailability = {};
        window.customImageAvailability = this.customImageAvailability;

        document.body.classList.remove('classic', 'nature', 'darkmode'); 
        if (theme !== 'classic') {
            document.body.classList.add(theme);
        }
        
        // Only preload assets we ship
        const values = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
        values.forEach(val => {
            this.customImages[val] = `assets/${theme}/${val}.jpg`;
            this.customImageAvailability[val] = false;
            const img = new Image();
            img.onload = () => {
                if (token !== this.themeLoadToken) return;
                this.customImageAvailability[val] = true;
                if (this.boardRenderer) {
                    this.boardRenderer.setTileTexture(val, img);
                }
                if (this.gameInstance && this.gameInstance.actuator) {
                     this.gameInstance.actuate();
                }
            };
            img.onerror = () => {
                if (token !== this.themeLoadToken) return;
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

        const actuator = new PixiActuator(this.container, this.boardRenderer);
        this.actuator = actuator;

        // Clean up previous instance to remove event listeners
        if (this.gameInstance && this.gameInstance.destroy) {
            this.gameInstance.destroy();
        }

        this.gameInstance = new GameManager(4, KeyboardInputManager, actuator, LocalStorageManager, {
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
        if (this.boardRenderer) {
            this.boardRenderer.resize();
        }
        if (this.gameInstance && this.gameInstance.actuate) {
            this.gameInstance.actuate();
        }
    }

    pause() {
        // No active loop to pause yet
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

    showThemeSelector() {
        this.applyTheme(this.selectedTheme); 
        if (this.gameInstance) {
            this.gameInstance.reset();
        }
    }

    setConfirmHandler(handler) {
        this.confirmHandler = handler;
    }

    requestRestart() {
        if (this.restartPending) return;
        const performRestart = () => {
            this.restartPending = false;
            this.showThemeSelector();
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

    getTemplate() {
        return `
        <div class="container">
            <header class="glass-panel">
                <h1>2048</h1>
                <div class="scores">
                    <div class="score-container glass-pill" data-label="Score">
                        <span class="score-label">Score</span>
                        <span class="score-value">0</span>
                    </div>
                    <div class="best-container glass-pill" data-label="Best">
                        <span class="score-label">Best</span>
                        <span class="score-value">0</span>
                    </div>
                    <button id="settings-button" class="ui-button mini secondary settings-inline" aria-label="Settings">⚙</button>
                    
                    <div class="currency-container glass-pill" id="currency-balance" data-label="Coins">
                        <span class="score-label">Coins</span>
                        <span class="score-value">0</span>
                    </div>
                </div>
                <div class="header-buttons">
                    <button id="show-leaderboard" class="ui-button mini secondary header-left">🏆</button>
                    <button id="undo-button" class="ui-button secondary undo-button" disabled>↩️ Undo</button>
                    <span class="header-spacer"></span>
                    <button class="restart-button ui-button gold">New Game</button>
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
            display.textContent = Number(value).toLocaleString();
        };
        update();
        if (window.AppBus && window.AppBus.on) {
            this.currencyUnsubscribe = window.AppBus.on("economy:changed", ({ coins }) => update(coins));
        }
    }
}
