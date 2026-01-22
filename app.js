import { Photo2048 } from './src/games/2048/index.js';
import { Match3Game } from './src/games/match3/index.js';
import { CityGame } from './src/games/city/index.js';
import { LeaderboardManager } from './src/core/LeaderboardManager.js';
import { characterManager } from './src/core/CharacterManager.js';
import { showCharacterCreator } from './src/components/CharacterCreator.js';
import { FEATURES, isFeatureEnabled, getFeatureFlagInfo, setFeatureFlag, resetFeatureFlags } from './src/config/features.js';
import * as PIXI from 'pixi.js';
window.PIXI = PIXI;
import '/core.js';

(function () {
  "use strict";

  console.log("App Initialized v4 - Feature Flags Enabled");

  const views = {};
  const navButtons = [];
  const state = {
    shopCatalog: null,
    shopItemsById: {},
    cityItems: []
  };
  const leaderboardManagers = new Map();
  const playerNameKey = "arcadeCityPlayerName";
  let pendingScore = null;

  // Only instantiate enabled games
  const games = {};
  if (FEATURES.game2048) games['2048'] = new Photo2048();
  if (FEATURES.gameMatch3) games['match3'] = new Match3Game();
  if (FEATURES.gameCity) games['city'] = new CityGame();

  let activeGameId = "2048";

  function getLeaderboardConfig(gameId) {
    if (gameId === "2048") {
      return {
        gameId: "2048",
        storageKey: "photo2048HighScores",
      };
    }
    if (gameId === "match3") {
      return {
        gameId: "match3",
        storageKey: "match3HighScores",
      };
    }
    return {
      gameId: gameId,
      storageKey: `${gameId}HighScores`,
    };
  }

  function getLeaderboardManager(gameId) {
    if (!leaderboardManagers.has(gameId)) {
      const config = getLeaderboardConfig(gameId);
      leaderboardManagers.set(
        gameId,
        new LeaderboardManager({
          gameId: config.gameId,
          storageKey: config.storageKey,
          limit: 20,
          firebaseManager: window.FirebaseManager
        })
      );
    }
    return leaderboardManagers.get(gameId);
  }

  function showView(viewId) {
    document.body.dataset.view = viewId;
    Object.keys(views).forEach((id) => {
      views[id].classList.toggle("hidden", id !== viewId);
    });
    navButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.view === viewId);
    });
    
    // Game Lifecycle Management
    Object.entries(games).forEach(([id, game]) => {
      if (id !== viewId) {
        game.pause();
      }
    });

    if (games[viewId]) {
      activeGameId = viewId;
      try {
        let action = null;
        if (!games[viewId].container) {
          console.log(`Mounting game: ${viewId}`);
          action = games[viewId].mount(views[viewId]);
        } else {
          console.log(`Resuming game: ${viewId}`);
          action = games[viewId].resume();
        }
        if (action && typeof action.then === "function") {
          action.catch((err) => {
            console.error(`Failed to mount/resume game ${viewId}:`, err);
          });
        }
      } catch (err) {
        console.error(`Failed to mount/resume game ${viewId}:`, err);
      }
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
    ["character", "2048", "match3", "city", "shop"].forEach((id) => {
      const el = document.getElementById(`view-${id}`);
      if (el) {
        views[id] = el;
      }
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
        // Collect all city-related items from multiple categories
        const cityCategories = ["nature", "roads", "buildings", "decor", "city"];
        state.cityItems = (data.categories || [])
          .filter((category) => cityCategories.includes(category.id))
          .flatMap((category) => category.items || []);
        renderShop(data);
        return data;
      })
      .catch(() => {
        showShopStatus("Shop catalog failed to load.", "error");
      });
  }

  function bindEconomyEvents() {
    if (!window.AppBus || !window.EconomyManager) return;
    window.AppBus.on("economy:changed", () => {
      refreshShopCards();
    });
    window.AppBus.on("economy:inventory", () => {
      refreshShopCards();
      games.city?.setInventory?.(window.EconomyManager.getInventory());
    });
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
  let openLeaderboardRef = null;
  let closeLeaderboardRef = null;

  function setupSettingsOverlay() {
    const overlay = document.getElementById("settings-overlay");
    const openButtons = document.querySelectorAll("[data-settings-trigger]");
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
      const target = event.target.closest && event.target.closest("[data-settings-trigger]");
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
    
    // Feature flags UI (only if devTools enabled)
    setupFeatureFlagsUI();
  }
  
  function setupFeatureFlagsUI() {
    const section = document.getElementById("feature-flags-section");
    const list = document.getElementById("feature-flags-list");
    const resetBtn = document.getElementById("reset-feature-flags");
    const devToolsSection = document.getElementById("dev-tools-section");
    
    if (!FEATURES.devTools) {
      // Hide dev tools section entirely
      if (devToolsSection) devToolsSection.style.display = 'none';
      return;
    }
    
    // Show feature flags section
    if (section) section.style.display = '';
    
    if (!list) return;
    
    // Render feature flag toggles
    const flags = getFeatureFlagInfo();
    list.innerHTML = flags.map(flag => `
      <div class="feature-flag-item">
        <span class="feature-flag-label ${flag.isOverridden ? 'overridden' : ''}">${flag.label}</span>
        <label class="ui-toggle">
          <input type="checkbox" data-feature="${flag.key}" ${flag.currentValue ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
    `).join('');
    
    // Handle toggle changes
    list.addEventListener('change', (e) => {
      const checkbox = e.target;
      if (checkbox.dataset.feature) {
        setFeatureFlag(checkbox.dataset.feature, checkbox.checked);
        // Update label style
        const label = checkbox.closest('.feature-flag-item')?.querySelector('.feature-flag-label');
        const flagInfo = getFeatureFlagInfo().find(f => f.key === checkbox.dataset.feature);
        if (label && flagInfo) {
          label.classList.toggle('overridden', flagInfo.isOverridden);
        }
        // Prompt to refresh
        if (confirm('Refresh now to apply changes?')) {
          location.reload();
        }
      }
    });
    
    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetFeatureFlags();
        // Re-render toggles
        const updatedFlags = getFeatureFlagInfo();
        list.querySelectorAll('input[data-feature]').forEach(checkbox => {
          const flag = updatedFlags.find(f => f.key === checkbox.dataset.feature);
          if (flag) {
            checkbox.checked = flag.currentValue;
            const label = checkbox.closest('.feature-flag-item')?.querySelector('.feature-flag-label');
            if (label) label.classList.remove('overridden');
          }
        });
        alert('Feature flags reset to defaults. Refresh to apply.');
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
    const summaryEl = document.getElementById("leaderboard-summary");
    const status = document.getElementById("leaderboard-status");
    const tryAgainBtn = document.getElementById("leaderboard-try-again");
    let currentMode = "default";
    let leaderboardGameId = null;

    if (!overlay) return;

    const defaultName = localStorage.getItem(playerNameKey);
    if (defaultName && nameInput) {
      nameInput.value = defaultName;
    }

    function restartGame() {
      const gameId = leaderboardGameId || activeGameId;
      const game = games[gameId];
      game?.requestRestart?.({ confirm: false });
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
      const activeGame = leaderboardGameId || activeGameId;
      const manager = getLeaderboardManager(activeGame);
      const { local, remote } = await manager.fetchScores(maxRows);
      const hasFirebase = !!(window.FirebaseManager && window.FirebaseManager.enabled);
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
      leaderboardGameId = options.gameId || activeGameId;
      if (hint) {
        hint.textContent = "";
        hint.classList.add("hidden");
      }
      if (summaryEl) {
        if (options.summary) {
          const summary = options.summary;
          summaryEl.textContent = `Moves: ${Number(summary.movesUsed || 0).toLocaleString()} | Max Combo: x${Number(summary.maxComboMultiplier || 1).toFixed(2)} | Best Streak: ${Number(summary.maxStreak || 0).toLocaleString()} | Shuffles: ${Number(summary.shuffles || 0).toLocaleString()}`;
          summaryEl.classList.remove("hidden");
        } else {
          summaryEl.textContent = "";
          summaryEl.classList.add("hidden");
        }
      }
      if (options.score !== undefined) {
        pendingScore = {
          gameId: leaderboardGameId,
          score: Number(options.score) || 0,
          turns: Number(options.turns) || 0,
          undos: Number(options.undos) || 0,
          date: Date.now()
        };
      }
      const manager = getLeaderboardManager(leaderboardGameId);
      const shouldShowEntry = options.showEntryForm ?? (pendingScore && manager.isHighScore(pendingScore.score));
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
        const scoreGameId = pendingScore.gameId || activeGameId;
        const manager = getLeaderboardManager(scoreGameId);
        const result = await manager.submitScore(name, pendingScore.score, {
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
      leaderboardGameId = null;
      if (summaryEl) {
        summaryEl.textContent = "";
        summaryEl.classList.add("hidden");
      }
    }

    closeLeaderboardRef = closeLeaderboard;

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
    ["2048", "match3"].forEach((gameId) => {
      const view = document.getElementById(`view-${gameId}`);
      if (!view) return;

      view.addEventListener("game:over", (event) => {
        const score = Number(event?.detail?.score) || 0;
        const turns = Number(event?.detail?.stats?.turns) || 0;
        const undos = Number(event?.detail?.stats?.undos) || 0;
        const mode = event?.detail?.mode || "gameover";
        const summary = event?.detail?.summary || null;
        pendingScore = { gameId, score, turns, undos, date: Date.now() };
        const qualifies = true;
        if (openLeaderboardRef) {
          openLeaderboardRef({ showEntryForm: qualifies, score, turns, undos, mode, gameId, summary });
        }
      });
    });
  }

  function setupCharacterView() {
    const editBtn = document.getElementById("edit-character-btn");
    const wardrobeBtn = document.getElementById("open-wardrobe-btn");
    
    if (editBtn) {
      editBtn.addEventListener("click", async () => {
        const { showCharacterCreator } = await import('./src/components/CharacterCreator.js');
        showCharacterCreator({ container: document.body, editMode: true });
      });
    }
    
    if (wardrobeBtn) {
      wardrobeBtn.addEventListener("click", async () => {
        const { showWardrobe } = await import('./src/components/Wardrobe.js');
        showWardrobe({ container: document.body });
      });
    }
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
    
    // Apply feature flags to DOM
    applyFeatureFlags();
    
    setupLeaderboard();
    setupSettingsOverlay();
    setupViews();
    const openConfirm = setupConfirmOverlay();
    setupGameOverListener();
    
    if (FEATURES.navbar) {
      setupNav();
    }
    
    setupPicrossStub();
    
    if (FEATURES.characterCreator) {
      setupCharacterView();
    }

    if (openConfirm) {
      Object.values(games).forEach((game) => {
        game?.setConfirmHandler?.(openConfirm);
      });
    }

    if (FEATURES.gameCity && window.EconomyManager) {
      games.city?.setInventory?.(window.EconomyManager.getInventory());
    }

    if (FEATURES.shop) {
      loadShopCatalog().then(() => {
        if (FEATURES.gameCity) {
          games.city?.setCatalog?.(state.cityItems);
        }
      });
    }

    bindEconomyEvents();
    
    // Expose showView globally for other modules
    window.showView = showView;
    
    // Initialize app with feature flags
    async function initializeApp() {
      // Show character creator if enabled and first time user
      if (FEATURES.characterCreator && !characterManager.hasCharacter()) {
        await showCharacterCreator({ container: document.body });
      }
      
      // Start with 2048 (default game)
      showView("2048");
    }
    
    initializeApp();
  });
  
  /**
   * Apply feature flags to hide/show DOM elements
   */
  function applyFeatureFlags() {
    // Hide navbar if disabled
    const navbar = document.querySelector('.bottom-nav');
    if (navbar && !FEATURES.navbar) {
      navbar.style.display = 'none';
    }
    
    // Hide views for disabled features
    const viewMappings = {
      'view-character': FEATURES.characterCreator,
      'view-match3': FEATURES.gameMatch3,
      'view-city': FEATURES.gameCity,
      'view-shop': FEATURES.shop,
    };
    
    Object.entries(viewMappings).forEach(([viewId, enabled]) => {
      const view = document.getElementById(viewId);
      if (view && !enabled) {
        view.remove(); // Remove from DOM entirely
      }
    });
    
    // Hide nav buttons for disabled features
    document.querySelectorAll('.nav-button[data-view]').forEach(btn => {
      const view = btn.dataset.view;
      const featureMap = {
        'character': FEATURES.characterCreator,
        '2048': FEATURES.game2048,
        'match3': FEATURES.gameMatch3,
        'city': FEATURES.gameCity,
        'shop': FEATURES.shop,
      };
      if (featureMap[view] === false) {
        btn.remove();
      }
    });
    
    // Hide dev tools if not enabled
    if (!FEATURES.devTools) {
      const devToolsRow = document.querySelector('.settings-row-column');
      if (devToolsRow) {
        devToolsRow.style.display = 'none';
      }
    }
    
    console.log('Feature flags applied:', FEATURES);
  }
})();
