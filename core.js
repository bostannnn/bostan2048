(function () {
  "use strict";

  const EconomyConfig = {
    games: {
      "2048": { scorePerCoin: 10 },
      "match3": { scorePerCoin: 200 },
      "picross": { completionCoins: 5 }
    }
  };

  class EventBus {
    constructor() {
      this.listeners = new Map();
    }

    on(eventName, handler) {
      if (!this.listeners.has(eventName)) {
        this.listeners.set(eventName, new Set());
      }
      const handlers = this.listeners.get(eventName);
      handlers.add(handler);
      return () => this.off(eventName, handler);
    }

    off(eventName, handler) {
      const handlers = this.listeners.get(eventName);
      if (!handlers) return;
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventName);
      }
    }

    emit(eventName, payload) {
      const handlers = this.listeners.get(eventName);
      if (!handlers) return;
      handlers.forEach((handler) => handler(payload));
    }
  }

  class EconomyManager {
    constructor(bus, options = {}) {
      this.bus = bus;
      this.coinKey = options.coinKey || "arcadeCityCoins";
      this.progressKey = options.progressKey || "arcadeCityRunProgress";
      this.inventoryKey = options.inventoryKey || "arcadeCityInventory";
      this.config = options.config || EconomyConfig;
      this.coins = this.loadNumber(this.coinKey, 0);
      this.progress = this.loadJson(this.progressKey, {});
      this.inventory = this.loadJson(this.inventoryKey, { items: {} });
      if (!this.inventory || typeof this.inventory !== "object") {
        this.inventory = { items: {} };
      }
      if (!this.inventory.items || typeof this.inventory.items !== "object") {
        this.inventory.items = {};
      }
    }

    loadNumber(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        const value = Number(raw);
        return Number.isFinite(value) ? value : fallback;
      } catch (error) {
        return fallback;
      }
    }

    saveNumber(key, value) {
      try {
        localStorage.setItem(key, String(value));
      } catch (error) {
        // Ignore storage errors in private mode.
      }
    }

    loadJson(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : fallback;
      } catch (error) {
        return fallback;
      }
    }

    saveJson(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        // Ignore storage errors in private mode.
      }
    }

    getCoins() {
      return this.coins;
    }

    getInventory() {
      return JSON.parse(JSON.stringify(this.inventory));
    }

    getItemCount(itemId) {
      if (!itemId) return 0;
      const items = this.inventory.items || {};
      return Number(items[itemId]) || 0;
    }

    setCoins(value, meta) {
      const next = Math.max(0, Math.floor(value));
      const delta = next - this.coins;
      if (delta === 0) return;
      this.coins = next;
      this.saveNumber(this.coinKey, this.coins);
      if (this.bus) {
        this.bus.emit("economy:changed", { coins: this.coins, delta, meta });
      }
    }

    spendCoins(amount, meta) {
      const delta = Math.floor(amount);
      if (!Number.isFinite(delta) || delta <= 0) return false;
      if (this.coins < delta) return false;
      this.setCoins(this.coins - delta, meta);
      return true;
    }

    addCoins(amount, meta) {
      const delta = Math.floor(amount);
      if (!Number.isFinite(delta) || delta <= 0) return;
      this.setCoins(this.coins + delta, meta);
    }

    addItem(itemId, count = 1, meta) {
      if (!itemId) return;
      const amount = Math.floor(count);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const items = this.inventory.items || {};
      items[itemId] = (Number(items[itemId]) || 0) + amount;
      this.inventory.items = items;
      this.saveJson(this.inventoryKey, this.inventory);
      if (this.bus) {
        this.bus.emit("economy:inventory", { itemId, count: amount, total: items[itemId], meta });
      }
    }

    removeItem(itemId, count = 1, meta) {
      if (!itemId) return false;
      const amount = Math.floor(count);
      if (!Number.isFinite(amount) || amount <= 0) return false;
      const items = this.inventory.items || {};
      const current = Number(items[itemId]) || 0;
      if (current < amount) return false;
      const next = current - amount;
      if (next > 0) {
        items[itemId] = next;
      } else {
        delete items[itemId];
      }
      this.inventory.items = items;
      this.saveJson(this.inventoryKey, this.inventory);
      if (this.bus) {
        this.bus.emit("economy:inventory", { itemId, count: -amount, total: next, meta });
      }
      return true;
    }

    purchaseItem(item) {
      if (!item || !item.id) return { ok: false, reason: "invalid-item" };
      const price = Math.floor(item.price);
      if (!Number.isFinite(price) || price <= 0) return { ok: false, reason: "invalid-price" };
      const canSpend = this.spendCoins(price, { reason: "purchase", itemId: item.id });
      if (!canSpend) return { ok: false, reason: "insufficient-coins" };
      this.addItem(item.id, 1, { reason: "purchase", itemId: item.id });
      return { ok: true };
    }

    ensureRun(gameId) {
      if (!gameId) return null;
      const entry = this.progress[gameId];
      if (entry && entry.runId) {
        return entry.runId;
      }
      return this.startRun(gameId);
    }

    startRun(gameId) {
      if (!gameId) return null;
      const runId = this.generateRunId();
      this.progress[gameId] = { runId, score: 0 };
      this.saveJson(this.progressKey, this.progress);
      if (this.bus) {
        this.bus.emit("economy:run", { gameId, runId });
      }
      return runId;
    }

    awardFromScore(gameId, score) {
      if (!gameId) return;
      const rule = this.getGameRule(gameId);
      if (!rule || !rule.scorePerCoin) return;
      const entry = this.progress[gameId] || { runId: this.generateRunId(), score: 0 };
      const nextScore = Math.max(entry.score || 0, Math.floor(score || 0));
      if (nextScore <= (entry.score || 0)) {
        this.progress[gameId] = entry;
        return;
      }
      const prevCoins = Math.floor((entry.score || 0) / rule.scorePerCoin);
      const nextCoins = Math.floor(nextScore / rule.scorePerCoin);
      const delta = nextCoins - prevCoins;
      entry.score = nextScore;
      this.progress[gameId] = entry;
      this.saveJson(this.progressKey, this.progress);
      if (delta > 0) {
        this.addCoins(delta, { source: gameId, reason: "score", score: nextScore });
      }
    }

    awardCompletion(gameId, meta) {
      if (!gameId) return;
      const rule = this.getGameRule(gameId);
      if (!rule || !Number.isFinite(rule.completionCoins) || rule.completionCoins <= 0) {
        return;
      }
      this.addCoins(rule.completionCoins, { source: gameId, reason: "completion", meta });
    }

    getGameRule(gameId) {
      const config = this.config || {};
      const gameRules = config.games || {};
      const rule = gameRules[gameId];
      return rule || null;
    }

    generateRunId() {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
  }

  const appBus = new EventBus();
  const economyManager = new EconomyManager(appBus, { config: EconomyConfig });

  function bindCurrencyDisplay() {
    const display = document.getElementById("currency-balance");
    if (!display) return;
    const update = (coins) => {
      const value = Number.isFinite(coins) ? coins : 0;
      const valueEl = display.querySelector(".score-value");
      if (valueEl) {
        valueEl.textContent = value.toLocaleString();
      } else {
        display.textContent = value.toLocaleString();
      }
    };
    update(economyManager.getCoins());
    appBus.on("economy:changed", (payload) => update(payload.coins));
  }

  document.addEventListener("DOMContentLoaded", bindCurrencyDisplay);

  window.AppBus = appBus;
  window.EconomyManager = economyManager;
})();
