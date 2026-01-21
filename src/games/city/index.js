import { GameInterface } from "../../core/GameInterface.js";
import { CityScene } from "./CityScene.js";

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

    activateMode(this.scene?.mode || "place");
  }

  unbindUI() {
    if (!this.uiHandlers.length) return;
    this.uiHandlers.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
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
    this.container = null;
  }
}
