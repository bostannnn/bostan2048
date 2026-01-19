import { Photo2048 } from './src/games/2048/index.js';
import { CityScene } from './city/src/CityScene.js';
import { LeaderboardManager } from './src/core/LeaderboardManager.js';
import * as PIXI from 'pixi.js';
window.PIXI = PIXI;
import '/core.js';

(function () {
  "use strict";

  console.log("App Initialized v3");

  const views = {};
  const navButtons = [];
  let citySceneInstance = null;
  const state = {
    match3Score: 0,
    shopCatalog: null,
    shopItemsById: {},
    cityItems: []
  };
  const leaderboardManager = new LeaderboardManager({
    gameId: "2048",
    storageKey: "photo2048HighScores",
    limit: 20,
    firebaseManager: window.FirebaseManager
  });
  const playerNameKey = "arcadeCityPlayerName";
  let pendingScore = null;

  const games = {
      '2048': new Photo2048()
  };

  function showView(viewId) {
    document.body.dataset.view = viewId;
    Object.keys(views).forEach((id) => {
      views[id].classList.toggle("hidden", id !== viewId);
    });
    navButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.view === viewId);
    });
    
    // Game Lifecycle Management
    if (games[viewId]) {
        try {
            if (!games[viewId].container) {
                console.log(`Mounting game: ${viewId}`);
                games[viewId].mount(views[viewId]);
            } else {
                console.log(`Resuming game: ${viewId}`);
                games[viewId].resume();
            }
        } catch (err) {
            console.error(`Failed to mount/resume game ${viewId}:`, err);
        }
    } else {
        // Pause other games if they are running?
        Object.values(games).forEach(game => game.pause());
    }

    if (viewId === "city" && citySceneInstance && citySceneInstance.onShow) {
      citySceneInstance.onShow();
    }
  }

  function setupNav() {
    document.querySelectorAll("[data-view]").forEach((button) => {
      navButtons.push(button);
      button.addEventListener("click", () => {
        showView(button.dataset.view);
      });
    });
  }

  function setupViews() {
    ["2048", "city", "games", "shop"].forEach((id) => {
      const el = document.getElementById(`view-${id}`);
      if (el) {
        views[id] = el;
      }
    });
  }

  function setupGameLaunchers() {
    document.querySelectorAll("[data-launch]").forEach((button) => {
      button.addEventListener("click", () => {
        const viewId = button.dataset.launch;
        if (viewId) {
          showView(viewId);
        }
      });
    });
  }

  function setupMatch3Stub() {
    const scoreEl = document.getElementById("match3-score");
    const addButton = document.querySelector("[data-match3-add]");
    const resetButton = document.querySelector("[data-match3-reset]");
    if (!scoreEl || !addButton || !resetButton) return;

    const updateScore = (next) => {
      state.match3Score = Math.max(0, Math.floor(next));
      scoreEl.textContent = state.match3Score.toLocaleString();
      if (window.EconomyManager) {
        window.EconomyManager.awardFromScore("match3", state.match3Score);
      }
    };

    addButton.addEventListener("click", () => {
      updateScore(state.match3Score + 200);
    });

    resetButton.addEventListener("click", () => {
      updateScore(0);
    });
  }

  function setupPicrossStub() {
    const button = document.querySelector("[data-picross-complete]");
    if (!button) return;
    button.addEventListener("click", () => {
      if (window.EconomyManager) {
        window.EconomyManager.awardCompletion("picross", { size: "10x10" });
      }
    });
  }

  function showShopStatus(message, tone) {
    const status = document.getElementById("shop-status");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("hidden", !message);
    status.classList.toggle("ok", tone === "ok");
    status.classList.toggle("error", tone === "error");
  }

  function formatPrice(price) {
    return Number(price).toLocaleString();
  }

  function refreshShopCards() {
    const coins = window.EconomyManager ? window.EconomyManager.getCoins() : 0;
    document.querySelectorAll(".shop-item").forEach((card) => {
      const itemId = card.dataset.itemId;
      const item = state.shopItemsById[itemId];
      const button = card.querySelector("button");
      const owned = card.querySelector(".shop-owned span");
      if (owned && window.EconomyManager) {
        owned.textContent = window.EconomyManager.getItemCount(itemId).toLocaleString();
      }
      if (button && item) {
        const price = Math.floor(item.price || 0);
        button.disabled = price > coins;
      }
    });
  }

  function renderShopCategory(category) {
    const list = document.getElementById("shop-list");
    if (!list) return;

    const section = document.createElement("div");
    section.className = "shop-category";

    const header = document.createElement("div");
    header.className = "shop-category-header";
    header.innerHTML = `<h3>${category.label}</h3>`;
    section.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "shop-grid";

    category.items.forEach((item) => {
      state.shopItemsById[item.id] = item;
      const card = document.createElement("div");
      card.className = "shop-item";
      card.dataset.itemId = item.id;

      const title = document.createElement("div");
      title.className = "shop-title";
      title.textContent = item.name;

      const meta = document.createElement("div");
      meta.className = "shop-meta";
      meta.textContent = item.type;

      const owned = document.createElement("div");
      owned.className = "shop-owned";
      owned.innerHTML = "Owned: <span>0</span>";

      const button = document.createElement("button");
      button.className = "ui-button small";
      button.textContent = `Buy ${formatPrice(item.price)}`;
      button.addEventListener("click", () => {
        if (!window.EconomyManager) return;
        const result = window.EconomyManager.purchaseItem(item);
        if (result.ok) {
          showShopStatus(`${item.name} added to inventory.`, "ok");
        } else {
          showShopStatus("Not enough coins.", "error");
        }
        refreshShopCards();
      });

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(owned);
      card.appendChild(button);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    list.appendChild(section);
  }

  function renderShop(catalog) {
    const list = document.getElementById("shop-list");
    if (!list) return;
    list.innerHTML = "";
    state.shopItemsById = {};
    (catalog.categories || []).forEach((category) => {
      renderShopCategory(category);
    });
    refreshShopCards();
  }

  function loadShopCatalog() {
    return fetch("./shop.json")
      .then((response) => response.json())
      .then((data) => {
        state.shopCatalog = data;
        state.cityItems = (data.categories || []).find((category) => category.id === "city")?.items || [];
        renderShop(data);
        return data;
      })
      .catch(() => {
        showShopStatus("Shop catalog failed to load.", "error");
      });
  }

  function setupCityScene() {
    const root = document.getElementById("city-root");
    const palette = document.getElementById("city-palette");
    const hint = document.getElementById("city-hint");
    
    // Legacy support for global CityScene if not modularized yet
    const CitySceneClass = CityScene; 
    
    if (!root || !palette || !CitySceneClass) return null;

    const scene = new CitySceneClass({
      root,
      palette,
      hint,
      gridSize: 64,
      storageKey: "arcadeCityLayout"
    });

    const modeButtons = document.querySelectorAll("[data-city-mode]");
    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        modeButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        scene.setMode(button.dataset.cityMode);
      });
    });

    const clearButton = document.getElementById("city-clear");
    if (clearButton) {
      clearButton.addEventListener("click", () => {
        scene.clearLayout();
      });
    }

    const regenerateButton = document.getElementById("city-regenerate");
    if (regenerateButton) {
      regenerateButton.addEventListener("click", () => {
        if (scene.regenerateStarterCity) {
          scene.regenerateStarterCity();
        }
      });
    }

    const rotateButtons = document.querySelectorAll("[data-city-rotate]");
    rotateButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const direction = button.dataset.cityRotate;
        scene.rotateSelection(direction === "left" ? -90 : 90);
      });
    });

    citySceneInstance = scene;
    return scene;
  }

  function bindEconomyEvents(cityScene) {
    if (!window.AppBus || !window.EconomyManager) return;
    window.AppBus.on("economy:changed", () => {
      refreshShopCards();
    });
    window.AppBus.on("economy:inventory", () => {
      refreshShopCards();
      if (cityScene) {
        cityScene.setInventory(window.EconomyManager.getInventory());
      }
    });
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
  let openLeaderboardRef = null;

  function setupSettingsOverlay() {
    const overlay = document.getElementById("settings-overlay");
    const openButtons = document.querySelectorAll("#settings-button");
    const closeButton = document.getElementById("close-settings");
    const pwaRefresh = document.getElementById("pwa-refresh");
    const devGameOver = document.getElementById("dev-game-over");
    const devAdd2048 = document.getElementById("dev-add-2048");
    if (!overlay) return;

    const close = () => overlay.classList.add("hidden");
    const open = () => overlay.classList.remove("hidden");

    if (openButtons.length) {
      openButtons.forEach((btn) => btn.addEventListener("click", open));
    }
    // Fallback delegation for dynamically created settings buttons
    document.addEventListener("click", (event) => {
      const target = event.target.closest && event.target.closest("#settings-button");
      if (target) {
        event.preventDefault();
        open();
      }
    });

    if (closeButton) closeButton.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    if (pwaRefresh) {
      pwaRefresh.addEventListener("click", () => {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistration().then((reg) => {
            if (reg) {
              reg.update().finally(() => location.reload());
            } else {
              location.reload();
            }
          });
        } else {
          location.reload();
        }
      });
    }

    // Dev utilities now live in Settings
    if (devGameOver) {
      devGameOver.addEventListener("click", () => {
        const game = games["2048"];
        game?.forceGameOver?.();
      });
    }
    if (devAdd2048) {
      devAdd2048.addEventListener("click", () => {
        const game = games["2048"];
        game?.add2048Tile?.();
      });
    }
  }

  function setupLeaderboard() {
    const overlay = document.getElementById("leaderboard");
    const titleEl = document.getElementById("leaderboard-title");
    const closeBtn = document.getElementById("close-leaderboard");
    const saveBtn = document.getElementById("save-score");
    const nameInput = document.getElementById("player-name");
    const entry = document.getElementById("leaderboard-entry");
    const pendingLabel = document.getElementById("leaderboard-pending");
    const hint = document.getElementById("leaderboard-hint");
    const status = document.getElementById("leaderboard-status");
    const tryAgainBtn = document.getElementById("leaderboard-try-again");
    let currentMode = "default";

    if (!overlay) return;

    const defaultName = localStorage.getItem(playerNameKey);
    if (defaultName && nameInput) {
      nameInput.value = defaultName;
    }

    function restartGame() {
      const restartBtn = document.querySelector("#view-2048 .restart-button");
      if (restartBtn) restartBtn.click();
      closeLeaderboard();
    }

    function setStatus(message, tone) {
      if (!status) return;
      status.textContent = message || "";
      status.classList.toggle("hidden", !message);
      status.classList.toggle("ok", tone === "ok");
      status.classList.toggle("error", tone === "error");
    }

    function toggleEntry(show) {
      if (!entry) return;
      entry.classList.toggle("hidden", !show);
      if (show && nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    }

    async function renderLeaderboard() {
      const list = document.getElementById("high-score-list");
      if (!list) return;
      const maxRows = 10;
      const { local, remote } = await leaderboardManager.fetchScores(maxRows);
      const hasFirebase = !!(window.FirebaseManager && window.FirebaseManager.enabled);
      const indexRequired = !!(window.FirebaseManager && window.FirebaseManager.indexRequired);
      const hasRemote = Array.isArray(remote) && remote.length > 0;
      const rows = (hasFirebase && hasRemote ? remote : local).slice(0, maxRows);

      list.innerHTML = rows.length ? "" : "<li class='ui-list-item'>No scores yet</li>";

      const medals = ["🥇", "🥈", "🥉"];
      rows.forEach((entryItem, i) => {
        const li = document.createElement("li");
        li.className = "ui-list-item leader-card";
        const medal = medals[i] || "";
        const medalClass = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
        li.innerHTML = `
          <div class="lb-left">
            <div class="lb-rank ${medalClass}">${medal || i + 1}</div>
            <div class="lb-player">
              <div class="lb-name">${entryItem.name || "Player"}</div>
              <div class="lb-date ui-caption">${dateFormatter.format(new Date(entryItem.date || Date.now()))}</div>
            </div>
          </div>
          <div class="lb-right">
            <div class="lb-score">${Number(entryItem.score || 0).toLocaleString()}</div>
            <div class="lb-stat-stack">
              <div class="lb-stat">
                <span class="lb-stat-label">Undos</span>
                <span class="lb-stat-value">${Number(entryItem.undos || 0).toLocaleString()}</span>
              </div>
              <div class="lb-stat">
                <span class="lb-stat-label">Turns</span>
                <span class="lb-stat-value">${Number(entryItem.turns || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        `;
        list.appendChild(li);
      });
    }

    async function openLeaderboard(options = {}) {
      currentMode = options.mode || "default";
      overlay.classList.remove("hidden");
      if (hint) {
        hint.textContent = "";
        hint.classList.add("hidden");
      }
      if (options.score !== undefined) {
        pendingScore = { score: Number(options.score) || 0, turns: Number(options.turns) || 0, undos: Number(options.undos) || 0, date: Date.now() };
      }
      const shouldShowEntry = options.showEntryForm ?? (pendingScore && leaderboardManager.isHighScore(pendingScore.score));
      if (shouldShowEntry && pendingLabel && pendingScore) {
        pendingLabel.textContent = pendingScore.score.toLocaleString();
      }
      if (closeBtn) {
        const isGameEnd = currentMode === "gameover" || currentMode === "win";
        // If the game ended, HIDE the button. Otherwise, SHOW it.
        closeBtn.style.display = isGameEnd ? "none" : "flex";
      }
      toggleEntry(!!shouldShowEntry);
      setStatus("", null);
      if (titleEl) {
        titleEl.textContent = currentMode === "gameover" ? "Game Over" : currentMode === "win" ? "You win!" : "Leaderboard";
      }
      if (tryAgainBtn) {
        tryAgainBtn.classList.toggle("hidden", !(currentMode === "gameover" || currentMode === "win"));
      }
      await renderLeaderboard();
    }

    async function handleSave(event) {
      event?.preventDefault();
      if (!pendingScore) return;
      const storedName = localStorage.getItem(playerNameKey);
      const name = (nameInput?.value || storedName || "Player").trim() || "Player";
      if (nameInput) nameInput.value = name;
      localStorage.setItem(playerNameKey, name);

      if (saveBtn) saveBtn.disabled = true;
      setStatus("Saving score...", null);

      try {
        const result = await leaderboardManager.submitScore(name, pendingScore.score, {
          turns: pendingScore.turns || 0,
          undos: pendingScore.undos || 0,
        });
        pendingScore = null;
        toggleEntry(false);
        if (result.remote.ok) {
          setStatus("Saved to Firebase + local.", "ok");
        } else if (result.localRank) {
          setStatus("Saved locally. Connect Firebase to sync online.", "ok");
        } else {
          setStatus("Score recorded locally.", "ok");
        }
        await renderLeaderboard();
      } catch (error) {
        setStatus("Could not save score. Try again.", "error");
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    }

    function closeLeaderboard() {
      overlay.classList.add("hidden");
      setStatus("", null);
      currentMode = "default";
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", closeLeaderboard);
    }

    if (tryAgainBtn) {
      tryAgainBtn.addEventListener("click", restartGame);
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", handleSave);
    }
    if (nameInput) {
      nameInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          handleSave(event);
        }
      });
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeLeaderboard();
      }
    });

    window.openLeaderboard = (options) => openLeaderboard(options);
    openLeaderboardRef = openLeaderboard;
  }

  function setupGameOverListener() {
    const view = document.getElementById("view-2048");
    if (!view) return;

    view.addEventListener("game:over", (event) => {
      const score = Number(event?.detail?.score) || 0;
      const turns = Number(event?.detail?.stats?.turns) || 0;
      const undos = Number(event?.detail?.stats?.undos) || 0;
      pendingScore = { score, turns, undos, date: Date.now() };
      const qualifies = true; // Always allow name entry on game over
      if (openLeaderboardRef) {
        openLeaderboardRef({ showEntryForm: qualifies, score, turns, undos, mode: "gameover" });
      }
    });
  }

  function setupConfirmOverlay() {
    const overlay = document.getElementById("confirm-overlay");
    const titleEl = document.getElementById("confirm-title");
    const messageEl = document.getElementById("confirm-message");
    const yesBtn = document.getElementById("confirm-yes");
    const noBtn = document.getElementById("confirm-no");
    if (!overlay || !yesBtn || !noBtn) return null;

    let onConfirm = null;
    let onCancel = null;

    const close = (confirmed) => {
      overlay.classList.add("hidden");
      const confirmCb = onConfirm;
      const cancelCb = onCancel;
      onConfirm = null;
      onCancel = null;
      if (confirmed) {
        confirmCb?.();
      } else {
        cancelCb?.();
      }
    };

    const open = (options = {}) => {
      if (!overlay.classList.contains("hidden")) return;
      if (titleEl) titleEl.textContent = options.title || "Confirm";
      if (messageEl) messageEl.textContent = options.message || "";
      yesBtn.textContent = options.confirmText || "Yes";
      noBtn.textContent = options.cancelText || "No";
      onConfirm = typeof options.onConfirm === "function" ? options.onConfirm : null;
      onCancel = typeof options.onCancel === "function" ? options.onCancel : null;
      overlay.classList.remove("hidden");
    };

    yesBtn.addEventListener("click", () => close(true));
    noBtn.addEventListener("click", () => close(false));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });

    return open;
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.firebaseConfig && window.FirebaseManager && !window.FirebaseManager.enabled) {
      window.FirebaseManager.configure(window.firebaseConfig);
    }
    setupLeaderboard();
    setupSettingsOverlay();
    setupViews();
    const openConfirm = setupConfirmOverlay();
    setupGameOverListener();
    setupNav();
    setupGameLaunchers();
    setupMatch3Stub();
    setupPicrossStub();

    if (openConfirm) {
      const game = games["2048"];
      game?.setConfirmHandler?.(openConfirm);
    }

    const cityScene = setupCityScene();
    if (cityScene) {
      cityScene.setInventory(window.EconomyManager ? window.EconomyManager.getInventory() : { items: {} });
    }

    loadShopCatalog().then(() => {
      if (cityScene) {
        cityScene.setCatalog(state.cityItems);
      }
    });

    bindEconomyEvents(cityScene);
    
    // Auto-launch 2048 if active view is 2048 (default)
    const startView = document.querySelector(".nav-button.active")?.dataset.view || "2048";
    showView(startView);
  });
})();
