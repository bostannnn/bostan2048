/**
 * PlayMenu - Overlay showing available games to play
 */

export class PlayMenu {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onSelectGame = options.onSelectGame || (() => {});
    this.overlay = null;
  }

  show() {
    this.createOverlay();
    requestAnimationFrame(() => {
      this.overlay.classList.add("visible");
    });
  }

  hide() {
    if (!this.overlay) return;
    this.overlay.classList.remove("visible");
    setTimeout(() => {
      this.overlay?.remove();
      this.overlay = null;
    }, 300);
  }

  createOverlay() {
    if (this.overlay) return;

    this.overlay = document.createElement("div");
    this.overlay.className = "play-menu-overlay";
    this.overlay.innerHTML = `
      <div class="play-menu">
        <div class="play-menu-header">
          <h2>Play</h2>
          <button class="play-menu-close" type="button">&times;</button>
        </div>
        
        <div class="play-menu-games">
          <button class="play-menu-game" data-game="2048" type="button">
            <div class="play-menu-game-icon">🎴</div>
            <div class="play-menu-game-info">
              <div class="play-menu-game-title">2048</div>
              <div class="play-menu-game-desc">Merge tiles to reach 2048!</div>
            </div>
            <div class="play-menu-game-arrow">→</div>
          </button>
          
          <button class="play-menu-game" data-game="match3" type="button">
            <div class="play-menu-game-icon">💎</div>
            <div class="play-menu-game-info">
              <div class="play-menu-game-title">Match-3</div>
              <div class="play-menu-game-desc">Match gems to score!</div>
            </div>
            <div class="play-menu-game-arrow">→</div>
          </button>
          
          <button class="play-menu-game locked" data-game="picross" type="button" disabled>
            <div class="play-menu-game-icon">🧩</div>
            <div class="play-menu-game-info">
              <div class="play-menu-game-title">Nonograms</div>
              <div class="play-menu-game-desc">Coming Soon</div>
            </div>
            <div class="play-menu-game-lock">🔒</div>
          </button>
        </div>
      </div>
    `;

    // Bind events
    this.overlay.querySelector(".play-menu-close").addEventListener("click", () => this.hide());
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.overlay.querySelectorAll(".play-menu-game:not(.locked)").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gameId = btn.dataset.game;
        this.hide();
        this.onSelectGame(gameId);
      });
    });

    this.container.appendChild(this.overlay);
  }
}

// Singleton for global access
let playMenuInstance = null;

export function showPlayMenu(options = {}) {
  if (playMenuInstance) {
    playMenuInstance.hide();
  }
  playMenuInstance = new PlayMenu(options);
  playMenuInstance.show();
  return playMenuInstance;
}

export function hidePlayMenu() {
  playMenuInstance?.hide();
  playMenuInstance = null;
}
