import { GameInterface } from "../../core/GameInterface.js";
import { CityScene } from "./CityScene.js";
import { showPlayMenu } from "../../components/PlayMenu.js";
import { showWardrobe } from "../../components/Wardrobe.js";

export class CityGame extends GameInterface {
  constructor() {
    super("city");
    this.scene = null;
    this.catalog = [];
    this.catalogLoaded = false;
    this.inventory = { items: {} };
    this.uiHandlers = [];
    this.uiBound = false;
  }

  mount(container) {
    super.mount(container);
    if (!this.container) return;

    const root = this.container.querySelector("#city-root");
    const palette = this.container.querySelector("#city-palette");
    const hint = this.container.querySelector("#city-hint");
    if (!root || !palette) return;

    if (!this.scene) {
      this.scene = new CityScene({
        root,
        palette,
        hint,
        gridSize: 64,
        storageKey: "arcadeCityLayout",
      });
    }

    this.bindUI();
    this.scene.setInventory(this.inventory);
    if (this.catalogLoaded) {
      this.scene.setCatalog(this.catalog);
    }
    this.scene.setInputEnabled(true);
    this.scene.initPromise?.then(() => {
      this.scene?.onShow?.();
    });
  }

  bindUI() {
    if (this.uiBound || !this.container) return;
    this.uiBound = true;

    const modeButtons = Array.from(this.container.querySelectorAll("[data-city-mode]"));
    const editPanel = this.container.querySelector("#city-edit-panel");
    const editBtn = this.container.querySelector("#city-edit-btn");
    const playBtn = this.container.querySelector("#city-play-btn");
    const editCloseBtn = this.container.querySelector("#city-edit-close");
    const floatingActions = this.container.querySelector(".city-floating-actions");
    
    const activateMode = (mode) => {
      modeButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.cityMode === mode);
      });
      this.scene?.setMode(mode);
    };

    modeButtons.forEach((button) => {
      const handler = () => activateMode(button.dataset.cityMode);
      button.addEventListener("click", handler);
      this.uiHandlers.push({ element: button, event: "click", handler });
    });

    // Edit button - opens edit panel
    if (editBtn && editPanel) {
      const handler = () => {
        editPanel.classList.remove("hidden");
        if (floatingActions) floatingActions.classList.add("hidden");
        activateMode("place");
      };
      editBtn.addEventListener("click", handler);
      this.uiHandlers.push({ element: editBtn, event: "click", handler });
    }

    // Close edit panel
    if (editCloseBtn && editPanel) {
      const handler = () => {
        editPanel.classList.add("hidden");
        if (floatingActions) floatingActions.classList.remove("hidden");
        activateMode("walk");
      };
      editCloseBtn.addEventListener("click", handler);
      this.uiHandlers.push({ element: editCloseBtn, event: "click", handler });
    }

    // Play button - opens play menu with game selection
    if (playBtn) {
      const handler = () => {
        showPlayMenu({
          container: document.body,
          onSelectGame: (gameId) => {
            // Navigate to the selected game
            if (window.showView) {
              window.showView(gameId);
            }
          }
        });
      };
      playBtn.addEventListener("click", handler);
      this.uiHandlers.push({ element: playBtn, event: "click", handler });
    }

    // Shop button - opens shop view
    const shopBtn = this.container.querySelector("#city-shop-btn");
    if (shopBtn) {
      const handler = () => {
        if (window.showView) {
          window.showView("shop");
        }
      };
      shopBtn.addEventListener("click", handler);
      this.uiHandlers.push({ element: shopBtn, event: "click", handler });
    }

    // Wardrobe button - opens wardrobe overlay
    const wardrobeBtn = this.container.querySelector("#city-wardrobe-btn");
    if (wardrobeBtn) {
      const handler = () => {
        showWardrobe({
          container: document.body,
          onClose: () => {
            // Character sprite will update automatically via subscription
          }
        });
      };
      wardrobeBtn.addEventListener("click", handler);
      this.uiHandlers.push({ element: wardrobeBtn, event: "click", handler });
    }

    const clearButton = this.container.querySelector("#city-clear");
    if (clearButton) {
      const handler = () => this.scene?.clearLayout();
      clearButton.addEventListener("click", handler);
      this.uiHandlers.push({ element: clearButton, event: "click", handler });
    }

    const regenerateButton = this.container.querySelector("#city-regenerate");
    if (regenerateButton) {
      const handler = () => this.scene?.regenerateStarterCity?.();
      regenerateButton.addEventListener("click", handler);
      this.uiHandlers.push({ element: regenerateButton, event: "click", handler });
    }

    const rotateButtons = Array.from(this.container.querySelectorAll("[data-city-rotate]"));
    rotateButtons.forEach((button) => {
      const handler = () => {
        const direction = button.dataset.cityRotate;
        this.scene?.rotateSelection(direction === "left" ? -90 : 90);
      };
      button.addEventListener("click", handler);
      this.uiHandlers.push({ element: button, event: "click", handler });
    });

    // Update coins display
    this.updateCoinsDisplay();
    if (window.AppBus) {
      const coinsHandler = () => this.updateCoinsDisplay();
      window.AppBus.on("economy:changed", coinsHandler);
      this.uiHandlers.push({ element: window.AppBus, event: "economy:changed", handler: coinsHandler, custom: true });
    }

    // Default to walk mode
    activateMode("walk");
  }

  updateCoinsDisplay() {
    const coinsEl = this.container?.querySelector("#city-coins");
    if (coinsEl && window.EconomyManager) {
      coinsEl.textContent = window.EconomyManager.getCoins().toLocaleString();
    }
  }

  unbindUI() {
    if (!this.uiHandlers.length) return;
    this.uiHandlers.forEach(({ element, event, handler, custom }) => {
      if (custom && element?.off) {
        element.off(event, handler);
      } else if (element?.removeEventListener) {
        element.removeEventListener(event, handler);
      }
    });
    this.uiHandlers = [];
    this.uiBound = false;
  }

  setCatalog(items) {
    this.catalog = Array.isArray(items) ? items : [];
    this.catalogLoaded = true;
    if (this.scene) {
      this.scene.setCatalog(this.catalog);
    }
  }

  setInventory(inventory) {
    this.inventory = inventory || { items: {} };
    if (this.scene) {
      this.scene.setInventory(this.inventory);
    }
  }

  resume() {
    if (this.scene?.app?.ticker?.start) {
      this.scene.app.ticker.start();
    }
    this.scene?.setInputEnabled(true);
    this.scene?.initPromise?.then(() => {
      this.scene?.onShow?.();
    });
  }

  pause() {
    this.scene?.setInputEnabled(false);
    if (this.scene?.app?.ticker?.stop) {
      this.scene.app.ticker.stop();
    }
  }

  destroy() {
    this.unbindUI();
    if (this.scene) {
      this.scene.destroy();
      this.scene = null;
    }
    super.destroy();
  }
}
