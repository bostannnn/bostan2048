import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";
import { CharacterSprite } from "../../core/CharacterSprite.js";
import { characterManager } from "../../core/CharacterManager.js";

export class CityScene {
    constructor(options) {
      this.root = options.root;
      this.palette = options.palette;
      this.hint = options.hint || null;
      this.gridSize = options.gridSize || 64;
      this.storageKey = options.storageKey || "arcadeCityLayout";
      this.mode = "place";
      this.catalog = [];
      this.catalogById = {};
      this.inventory = { items: {} };
      this.selectedItemId = null;
      this.rotation = 0;
      const envBase = import.meta.env?.BASE_URL || "/";
      const normalizedEnvBase = envBase.endsWith("/") ? envBase : `${envBase}/`;
      const runtimeBase = typeof document !== "undefined" ? new URL(".", document.baseURI).href : "";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      this.assetBase = runtimeBase || `${origin}${normalizedEnvBase}`;

      this.layout = { gridSize: this.gridSize, tiles: [] };
      this.tileMap = new Map();
      this.occupiedMap = new Map();
      this.groundMap = [];

      this.app = null;
      this.mapContainer = null;
      this.groundContainer = null;
      this.gridContainer = null;
      this.objectContainer = null;
      this.textures = {
        ground: {},
        building: {}
      };
      this.groundSprites = new Map();

      this.tileWidth = 64;
      this.tileHeight = 32;
      this.mapWidth = 0;
      this.mapHeight = 0;
      this.mapOriginX = 0;
      this.mapOriginY = 0;
      this.scale = this.gridSize >= 40 ? 0.5 : 1;
      this.minScale = 0.35;
      this.maxScale = 1.6;
      this.pan = { x: 0, y: 0 };
      this.drag = null;
      this.dragMoved = false;
      this.pointers = new Map();
      this.initialPinchDist = null;
      this.initialScale = 1;
      this.hasPanned = false;
      this.inputEnabled = true;
      this.boundHandlers = null;
      this.view = null;
      this.destroyed = false;
      this.visibleRange = null;
      this.cullRaf = null;
      this.seedValue = null;
      this.grassVariants = ["grass", "grass_01", "grass_02", "grass_03"];

      this.hoverCell = null;
      this.ghostSprite = null;

      // Character
      this.characterSprite = null;
      this.characterContainer = null;

      // Kenney Isometric City assets (CC0 license)
      // Note: This is primarily a ROAD-BUILDING kit with trees on grass patches
      const kenneyPath = "assets/kenney_isometric-city/PNG";
      const kenneyDetails = "assets/kenney_isometric-city/Details";
      
      this.assets = {
        ground: {
          // Original grass variants
          grass: "assets/city/grass.png",
          grass_01: "assets/city/grass_01.png",
          grass_02: "assets/city/grass_02.png",
          grass_03: "assets/city/grass_03.png",
          // Roads
          road: "assets/city/road.png",
          road_center: "assets/city/road_center.png",
          road_corner: "assets/city/road_corner.png",
          // Water
          water: "assets/city/water.png",
          plaza: "assets/city/plaza.png"
        },
        building: {
          // Original custom buildings (these are the actual buildings!)
          house: "assets/city/house.png",
          shop: "assets/city/shop_small.png",
          fountain: "assets/city/fountain.png",
          building_small: "assets/city/building_small.png",
          building_medium: "assets/city/building_medium.png",
          building_large: "assets/city/building_large.png",
          // Kenney trees on grass patches (these look nice!)
          kenney_tree_single: `${kenneyPath}/cityTiles_067.png`,
          kenney_tree_grass: `${kenneyPath}/cityTiles_075.png`,
          kenney_tree_park: `${kenneyPath}/cityTiles_083.png`,
          kenney_trees_double: `${kenneyPath}/cityTiles_036.png`,
          kenney_trees_road: `${kenneyPath}/cityTiles_044.png`,
          // Kenney detail decorations
          kenney_tree_detail: `${kenneyDetails}/cityDetails_010.png`,
          kenney_bench: `${kenneyDetails}/cityDetails_008.png`,
          kenney_lamppost: `${kenneyDetails}/cityDetails_000.png`
        }
      };

      this.loadLayout();
      this.initPromise = this.buildApp()
        .then(() => this.loadAssets())
        .then(() => {
          this.updateMetrics();
          this.buildGroundMap();
          this.renderGround();
          this.renderGridOverlay();
          this.renderPlacements();
          this.renderPalette();
          this.spawnCharacter();
          this.setHint("Walk mode: tap to move your character.");
          this.mode = "walk"; // Default to walk mode
          this.bindInput();
          this.centerMap();
        });

      this.handleResize = () => {
        this.updateMetrics();
        this.renderGround();
        this.renderGridOverlay();
        this.renderPlacements();
        if (!this.hasPanned) {
          this.centerMap();
        } else {
          this.applyPan();
        }
      };
      window.addEventListener("resize", this.handleResize);
    }

    buildApp() {
      if (!Application) {
        console.warn("PIXI is not available. CityScene cannot render.");
        return Promise.resolve();
      }
      if (!this.root) {
        console.warn("CityScene root not available.");
        return Promise.resolve();
      }
      this.root.innerHTML = "";
      this.app = new Application();

      return this.app.init({
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: this.root
      }).then(() => {
        const canvas = this.app.canvas || this.app.view;
        if (!canvas) {
          console.warn("CityScene canvas not available.");
          return;
        }
        canvas.classList.add("city-canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.touchAction = "none";
        this.root.appendChild(canvas);
        this.view = canvas;

        this.mapContainer = new Container();
        this.mapContainer.sortableChildren = true;
        this.groundContainer = new Container();
        this.gridContainer = new Container();
        this.objectContainer = new Container();
        this.objectContainer.sortableChildren = true;

        this.mapContainer.addChild(this.groundContainer);
        this.mapContainer.addChild(this.gridContainer);
        this.mapContainer.addChild(this.objectContainer);
        
        // Character container (above objects for visibility)
        this.characterContainer = new Container();
        this.characterContainer.sortableChildren = true;
        this.mapContainer.addChild(this.characterContainer);
        
        this.app.stage.addChild(this.mapContainer);
      });
    }

    loadTexture(path) {
      if (!path) return Promise.resolve(null);
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.onload = () => resolve(Texture.from(img));
        img.onerror = () => {
          console.warn("City asset failed to load:", path);
          resolve(null);
        };
        img.src = path;
      });
    }

    async loadAssets() {
      if (!Texture) return;
      const groundEntries = Object.entries(this.assets.ground);
      const buildingEntries = Object.entries(this.assets.building);
      const groundTextures = await Promise.all(
        groundEntries.map(([, url]) => this.loadTexture(this.resolveAsset(url)))
      );
      const buildingTextures = await Promise.all(
        buildingEntries.map(([, url]) => this.loadTexture(this.resolveAsset(url)))
      );
      groundEntries.forEach(([key], index) => {
        const texture = groundTextures[index];
        if (texture) {
          this.textures.ground[key] = texture;
        }
      });
      buildingEntries.forEach(([key], index) => {
        const texture = buildingTextures[index];
        if (texture) {
          this.textures.building[key] = texture;
        }
      });
    }

    setCatalog(items) {
      this.catalog = Array.isArray(items) ? items : [];
      this.catalogById = {};
      this.catalog.forEach((item) => {
        if (item && item.id) {
          this.catalogById[item.id] = item;
        }
      });
      if (!this.selectedItemId && this.catalog.length > 0) {
        this.selectedItemId = this.catalog[0].id;
      }
      this.seedStarterLayout();
      this.renderPalette();
      this.renderPlacements();
    }

    setInventory(inventory) {
      this.inventory = inventory || { items: {} };
      this.renderPalette();
    }

    setMode(mode) {
      if (mode === "erase") {
        this.mode = "erase";
        this.setHint("Erase mode: tap a building to remove it.");
      } else if (mode === "walk") {
        this.mode = "walk";
        this.setHint("Walk mode: tap to move your character.");
      } else {
        this.mode = "place";
        this.setHint("Place mode: choose a building and tap the map.");
      }
      this.clearGhost();
    }

    rotateSelection(delta) {
      const next = ((this.rotation + delta) % 360 + 360) % 360;
      this.rotation = next;
      this.clearGhost();
      this.setHint(`Rotation ${this.rotation} degrees.`);
    }

    setHint(message) {
      if (!this.hint) return;
      this.hint.textContent = message;
    }

    getItemCount(itemId) {
      const items = this.inventory.items || {};
      return Number(items[itemId]) || 0;
    }

    getFootprint(item) {
      const footprint = item && item.footprint ? item.footprint : { w: 1, h: 1 };
      return {
        w: Math.max(1, Math.floor(footprint.w || 1)),
        h: Math.max(1, Math.floor(footprint.h || 1))
      };
    }

    getRotatedFootprint(footprint, rotation) {
      if ((rotation / 90) % 2 !== 0) {
        return { w: footprint.h, h: footprint.w };
      }
      return { w: footprint.w, h: footprint.h };
    }

    loadLayout() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tiles)) {
          this.layout = parsed;
          this.gridSize = parsed.gridSize || this.gridSize;
          this.tileMap = new Map(parsed.tiles.map((tile) => [this.key(tile.x, tile.y), tile]));
          if (Array.isArray(parsed.ground)) {
            this.groundMap = parsed.ground;
          }
        }
      } catch (error) {
        // Ignore corrupted data.
      }
    }

    saveLayout() {
      this.layout.tiles = Array.from(this.tileMap.values());
      this.layout.gridSize = this.gridSize;
      this.layout.ground = this.groundMap;
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.layout));
      } catch (error) {
        // Ignore storage errors.
      }
    }

    clearLayout() {
      if (this.tileMap.size === 0) return;
      this.clearGhost();
      this.tileMap.forEach((tile) => {
        if (window.EconomyManager) {
          window.EconomyManager.addItem(tile.id, 1, { reason: "clear" });
        }
      });
      this.tileMap.clear();
      this.saveLayout();
      this.renderPlacements();
      this.setHint("City cleared. Items returned to inventory.");
    }

    setInputEnabled(enabled) {
      const next = Boolean(enabled);
      if (this.inputEnabled === next) return;
      this.inputEnabled = next;
      if (!next) {
        this.resetInputState();
        this.clearGhost();
      }
    }

    resetInputState() {
      const view = this.view || this.app?.canvas || this.app?.view;
      if (view) {
        this.pointers.forEach((_, pointerId) => {
          try {
            view.releasePointerCapture?.(pointerId);
          } catch (error) {
            // Ignore.
          }
        });
      }
      this.pointers.clear();
      this.drag = null;
      this.dragMoved = false;
      this.initialPinchDist = null;
      this.root?.classList.remove("dragging");
    }

    updateMetrics() {
      const style = getComputedStyle(this.root);
      const widthValue = parseFloat(style.getPropertyValue("--city-tile-width"));
      this.tileWidth = Number.isFinite(widthValue) && widthValue > 0 ? widthValue : 64;
      this.tileHeight = this.tileWidth / 2;
      this.mapWidth = this.gridSize * this.tileWidth;
      this.mapHeight = this.gridSize * this.tileHeight;
      this.mapOriginX = this.mapWidth / 2;
      this.mapOriginY = this.tileHeight / 2;
    }

    centerMap() {
      if (!this.root || !this.mapContainer) return;
      const rect = this.root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      this.pan.x = (rect.width - this.mapWidth * this.scale) / 2;
      this.pan.y = (rect.height - this.mapHeight * this.scale) / 2;
      this.applyPan();
    }

    applyPan() {
      if (!this.mapContainer) return;
      this.mapContainer.x = this.pan.x;
      this.mapContainer.y = this.pan.y;
      this.mapContainer.scale.set(this.scale);
      this.scheduleGroundRender();
    }

    clampScale(nextScale) {
      return Math.max(this.minScale, Math.min(this.maxScale, nextScale));
    }

    applyZoom(nextScale, center) {
      const clamped = this.clampScale(nextScale);
      if (clamped === this.scale) return;
      const worldX = (center.x - this.pan.x) / this.scale;
      const worldY = (center.y - this.pan.y) / this.scale;
      this.scale = clamped;
      this.pan.x = center.x - worldX * this.scale;
      this.pan.y = center.y - worldY * this.scale;
      this.applyPan();
    }

    getPointerPosition(event) {
      const view = this.view || this.app?.canvas || this.app?.view;
      if (!view) {
        return { x: event.clientX, y: event.clientY };
      }
      const rect = view.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }

    getPinchDistance() {
      const points = Array.from(this.pointers.values());
      if (points.length < 2) return 0;
      return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    }

    getPinchCenter() {
      const points = Array.from(this.pointers.values());
      if (points.length < 2) return { x: 0, y: 0 };
      return {
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2
      };
    }

    gridToScreen(x, y) {
      const screenX = (x - y) * (this.tileWidth / 2) + this.mapOriginX;
      const screenY = (x + y) * (this.tileHeight / 2) + this.mapOriginY;
      return { x: screenX, y: screenY };
    }

    screenToGrid(screenX, screenY) {
      const dx = screenX - this.mapOriginX;
      const dy = screenY - this.mapOriginY;
      const gx = (dx / (this.tileWidth / 2) + dy / (this.tileHeight / 2)) / 2;
      const gy = (dy / (this.tileHeight / 2) - dx / (this.tileWidth / 2)) / 2;
      return { x: Math.floor(gx), y: Math.floor(gy) };
    }

    buildGroundMap() {
      if (this.groundMap.length) return;
      const size = this.gridSize;
      const quarter = Math.floor(size / 4);
      const half = Math.floor(size / 2);
      const threeQuarter = Math.floor((3 * size) / 4);
      const major = [quarter, half, threeQuarter].filter((value) => value > 0 && value < size);
      this.groundMap = [];

      for (let y = 0; y < size; y += 1) {
        const row = [];
        for (let x = 0; x < size; x += 1) {
          let type = "grass";
          row.push(type);
        }
        this.groundMap.push(row);
      }

      const rng = this.getSeededRng();
      const roadLines = new Set();
      major.forEach((value) => roadLines.add(value));
      for (let i = 0; i < 4; i += 1) {
        const extra = Math.floor(rng() * size);
        roadLines.add(extra);
      }

      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          if (roadLines.has(x) || roadLines.has(y)) {
            this.groundMap[y][x] = "road";
          }
        }
      }

      this.placePlazaPatch(Math.floor(size / 2), Math.floor(size / 2), 4);
      for (let i = 0; i < 2; i += 1) {
        const px = Math.floor(rng() * (size - 6)) + 3;
        const py = Math.floor(rng() * (size - 6)) + 3;
        this.placePlazaPatch(px, py, 3);
      }
    }

    seedStarterLayout() {
      if (this.tileMap.size > 0) return;
      const rng = this.getSeededRng();
      const candidates = this.collectRoadAdjacents();
      // Starter city items - use original custom buildings + Kenney trees
      const starterItems = [
        // Original custom buildings (these have actual building graphics!)
        { id: "starter_building_large", fallback: { w: 1, h: 1 }, textureKey: "building_large" },
        { id: "starter_building_medium", fallback: { w: 1, h: 1 }, textureKey: "building_medium" },
        { id: "starter_house", fallback: { w: 1, h: 1 }, textureKey: "house" },
        { id: "starter_house_2", fallback: { w: 1, h: 1 }, textureKey: "house" },
        { id: "starter_shop", fallback: { w: 1, h: 1 }, textureKey: "shop" },
        { id: "starter_building_small", fallback: { w: 1, h: 1 }, textureKey: "building_small" },
        // Kenney trees (these are nice tree graphics on grass patches!)
        { id: "starter_tree_1", fallback: { w: 1, h: 1 }, textureKey: "kenney_tree_single" },
        { id: "starter_tree_2", fallback: { w: 1, h: 1 }, textureKey: "kenney_tree_grass" },
        { id: "starter_tree_3", fallback: { w: 1, h: 1 }, textureKey: "kenney_tree_park" },
        { id: "starter_trees_double", fallback: { w: 1, h: 1 }, textureKey: "kenney_trees_double" },
        // Original fountain as a centerpiece
        { id: "starter_fountain", fallback: { w: 1, h: 1 }, textureKey: "fountain" }
      ];

      starterItems.forEach((entry) => {
        const item = this.catalogById[entry.id] || entry;
        const footprint = this.getFootprint(item);
        for (let attempt = 0; attempt < 80; attempt += 1) {
          const pick = candidates[Math.floor(rng() * candidates.length)];
          if (!pick) break;
          const rotated = this.getRotatedFootprint(footprint, 0);
          if (this.canPlaceAt(pick.x, pick.y, rotated).ok) {
            this.tileMap.set(this.key(pick.x, pick.y), {
              x: pick.x,
              y: pick.y,
              id: entry.id,
              rotation: 0,
              footprint,
              textureKey: entry.textureKey, // Direct texture key reference
              sprite: entry.sprite
            });
            break;
          }
        }
      });

      this.saveLayout();
    }

    getGroundType(x, y) {
      const base = this.groundMap[y] && this.groundMap[y][x] ? this.groundMap[y][x] : "grass";
      if (this.isRoadType(base)) {
        return this.getRoadVariant(x, y);
      }
      if (base === "grass") {
        return this.getGrassVariantKey(x, y);
      }
      return base;
    }

    getGrassVariantKey(x, y) {
      const variants = Array.isArray(this.grassVariants) && this.grassVariants.length
        ? this.grassVariants
        : ["grass"];
      const seed = this.getSeedValue();
      const index = this.hashCoords(x, y, seed) % variants.length;
      return variants[index] || "grass";
    }

    hashCoords(x, y, seed) {
      let hash = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
      hash = (hash ^ (hash >>> 13)) >>> 0;
      hash = Math.imul(hash, 1274126177) >>> 0;
      return (hash ^ (hash >>> 16)) >>> 0;
    }

    renderGround() {
      if (!this.groundContainer) return;
      const range = this.getVisibleCellRange();
      if (this.visibleRange && this.isSameRange(this.visibleRange, range)) {
        return;
      }
      this.visibleRange = range;
      this.groundContainer.removeChildren();
      this.groundSprites.clear();

      for (let y = range.minY; y <= range.maxY; y += 1) {
        for (let x = range.minX; x <= range.maxX; x += 1) {
          const type = this.getGroundType(x, y);
          const texture = this.textures.ground[type] || this.textures.ground.grass;
          if (!texture) continue;
          const sprite = new Sprite(texture);
          sprite.anchor.set(0.5);
          sprite.width = this.tileWidth;
          sprite.height = this.tileHeight;
          const position = this.gridToScreen(x, y);
          sprite.x = position.x;
          sprite.y = position.y;
          sprite.zIndex = x + y;
          this.groundContainer.addChild(sprite);
          this.groundSprites.set(this.key(x, y), sprite);
        }
      }
    }

    updateGroundTile(x, y) {
      if (!this.isInVisibleRange(x, y)) return;
      const sprite = this.groundSprites.get(this.key(x, y));
      const type = this.getGroundType(x, y);
      const texture = this.textures.ground[type] || this.textures.ground.grass;
      if (sprite && texture) {
        sprite.texture = texture;
      }
    }

    renderGridOverlay() {
      if (!this.gridContainer) return;
      this.gridContainer.removeChildren();
      const grid = new Graphics();
      grid.lineStyle(0.8, 0xffffff, 0.12);

      for (let y = 0; y <= this.gridSize; y += 1) {
        const start = this.gridToScreen(0, y);
        const end = this.gridToScreen(this.gridSize, y);
        grid.moveTo(start.x, start.y);
        grid.lineTo(end.x, end.y);
      }

      for (let x = 0; x <= this.gridSize; x += 1) {
        const start = this.gridToScreen(x, 0);
        const end = this.gridToScreen(x, this.gridSize);
        grid.moveTo(start.x, start.y);
        grid.lineTo(end.x, end.y);
      }

      this.gridContainer.addChild(grid);
    }

    rebuildOccupancy() {
      this.occupiedMap.clear();
      this.tileMap.forEach((tile, key) => {
        const item = this.catalogById[tile.id] || tile;
        const footprint = this.getFootprint(item);
        const rotated = this.getRotatedFootprint(footprint, tile.rotation || 0);
        for (let dy = 0; dy < rotated.h; dy += 1) {
          for (let dx = 0; dx < rotated.w; dx += 1) {
            this.occupiedMap.set(this.key(tile.x + dx, tile.y + dy), key);
          }
        }
      });
    }

    renderPlacements() {
      if (!this.objectContainer) return;
      this.rebuildOccupancy();
      this.objectContainer.removeChildren();

      this.tileMap.forEach((tile) => {
        const sprite = this.createBuildingSprite(tile, false, false);
        if (sprite) {
          this.objectContainer.addChild(sprite);
        }
      });
    }

    createBuildingSprite(tile, isGhost, blocked) {
      const item = this.catalogById[tile.id] || tile;
      const footprint = this.getFootprint(item);
      const rotated = this.getRotatedFootprint(footprint, tile.rotation || 0);
      const anchorX = tile.x + (rotated.w - 1) / 2;
      const anchorY = tile.y + (rotated.h - 1) / 2;
      const screen = this.gridToScreen(anchorX, anchorY);

      // Pass tile to getBuildingTexture so it can use textureKey from starter items
      const itemWithTexture = { ...item, textureKey: tile.textureKey || item.textureKey };
      const texture = this.getBuildingTexture(itemWithTexture, rotated);
      if (!texture) return null;

      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 1);
      const span = rotated.w + rotated.h;
      sprite.width = this.tileWidth * (span / 2) * 1.2;
      sprite.height = this.tileHeight * (2 + Math.max(rotated.w, rotated.h) * 1.4);
      sprite.x = screen.x;
      sprite.y = screen.y;
      sprite.rotation = ((tile.rotation || 0) * Math.PI) / 180;
      sprite.alpha = isGhost ? 0.6 : 1;
      if (blocked) {
        sprite.tint = 0xff8888;
      }
      sprite.zIndex = (tile.x + tile.y + rotated.w + rotated.h) * 10;
      return sprite;
    }

    getBuildingTexture(item, footprint) {
      // If item has a direct textureKey, use it (for starter items)
      if (item && item.textureKey && this.textures.building[item.textureKey]) {
        return this.textures.building[item.textureKey];
      }
      
      // Map shop item IDs to texture keys
      const idToTextureKey = {
        // Shop items using original buildings
        city_house_small: "house",
        city_house: "house",
        city_shop: "shop",
        city_fountain: "fountain",
        city_building_small: "building_small",
        city_building_medium: "building_medium",
        city_building_large: "building_large",
        // Shop items using Kenney trees
        city_tree: "kenney_tree_single",
        city_tree_grass: "kenney_tree_grass",
        city_tree_park: "kenney_tree_park",
        city_trees_double: "kenney_trees_double",
        city_bench: "kenney_bench",
        city_lamppost: "kenney_lamppost"
      };
      
      // Try to find texture by item id
      if (item && item.id) {
        const textureKey = idToTextureKey[item.id];
        if (textureKey && this.textures.building[textureKey]) {
          return this.textures.building[textureKey];
        }
      }
      
      // If item has a sprite path, try to find matching texture
      if (item && item.sprite) {
        const target = this.resolveAsset(item.sprite);
        const match = Object.entries(this.assets.building).find(([, url]) => this.resolveAsset(url) === target);
        if (match && this.textures.building[match[0]]) {
          return this.textures.building[match[0]];
        }
      }
      
      // Fallback based on footprint size
      const area = footprint.w * footprint.h;
      if (area <= 4) return this.textures.building.building_small;
      if (area <= 8) return this.textures.building.building_medium;
      return this.textures.building.building_large;
    }

    clearGhost() {
      if (this.ghostSprite && this.objectContainer) {
        this.objectContainer.removeChild(this.ghostSprite);
      }
      this.ghostSprite = null;
      this.hoverCell = null;
    }

    showGhostAt(x, y) {
      if (this.mode !== "place") return;
      if (!this.selectedItemId) return;
      const item = this.catalogById[this.selectedItemId];
      if (!item) return;
      if (this.hoverCell && this.hoverCell.x === x && this.hoverCell.y === y) return;

      this.clearGhost();
      const footprint = this.getFootprint(item);
      const rotated = this.getRotatedFootprint(footprint, this.rotation);
      const result = this.canPlaceAt(x, y, rotated);
      let ghost = null;
      if (this.isGroundItem(item)) {
        ghost = this.createGroundGhost(x, y, !result.ok);
      } else {
        const ghostTile = { x, y, id: this.selectedItemId, rotation: this.rotation };
        ghost = this.createBuildingSprite(ghostTile, true, !result.ok);
      }
      if (ghost && this.objectContainer) {
        this.ghostSprite = ghost;
        this.objectContainer.addChild(ghost);
      }
      this.hoverCell = { x, y };
    }

    canPlaceAt(x, y, rotated) {
      if (x < 0 || y < 0) return { ok: false, reason: "bounds" };
      if (x + rotated.w > this.gridSize || y + rotated.h > this.gridSize) {
        return { ok: false, reason: "bounds" };
      }
      for (let dy = 0; dy < rotated.h; dy += 1) {
        for (let dx = 0; dx < rotated.w; dx += 1) {
          const key = this.key(x + dx, y + dy);
          if (this.occupiedMap.has(key)) {
            return { ok: false, reason: "occupied" };
          }
        }
      }
      return { ok: true };
    }

    handleCellClick(x, y) {
      if (this.mode === "erase") {
        this.eraseAt(x, y);
        return;
      }
      if (this.mode === "walk") {
        this.moveCharacterTo(x, y);
        return;
      }
      this.placeAt(x, y);
    }

    placeAt(x, y) {
      if (!this.selectedItemId) {
        this.setHint("Select a building from your palette first.");
        return;
      }
      const item = this.catalogById[this.selectedItemId];
      if (!item) return;
      const footprint = this.getFootprint(item);
      const rotated = this.getRotatedFootprint(footprint, this.rotation);
      const result = this.canPlaceAt(x, y, rotated);
      if (!result.ok) {
        this.setHint(result.reason === "occupied" ? "That area is occupied." : "Out of bounds.");
        return;
      }
      if (this.isGroundItem(item)) {
        if (window.EconomyManager && !window.EconomyManager.removeItem(this.selectedItemId, 1, { reason: "place" })) {
          this.setHint("You do not own this tile yet.");
          return;
        }
        this.setGroundAt(x, y, item.groundType || "road");
        this.saveLayout();
        this.setHint("Tile placed.");
        return;
      }
      if (window.EconomyManager && !window.EconomyManager.removeItem(this.selectedItemId, 1, { reason: "place" })) {
        this.setHint("You do not own this building yet.");
        return;
      }
      this.tileMap.set(this.key(x, y), {
        x,
        y,
        id: this.selectedItemId,
        rotation: this.rotation,
        footprint
      });
      this.saveLayout();
      this.renderPlacements();
      this.setHint("Building placed.");
    }

    eraseAt(x, y) {
      const buildingKey = this.occupiedMap.get(this.key(x, y));
      if (!buildingKey) {
        this.setHint("Nothing to remove here.");
        return;
      }
      const tile = this.tileMap.get(buildingKey);
      if (!tile) {
        this.setHint("Nothing to remove here.");
        return;
      }
      this.tileMap.delete(buildingKey);
      if (window.EconomyManager) {
        window.EconomyManager.addItem(tile.id, 1, { reason: "erase" });
      }
      this.saveLayout();
      this.renderPlacements();
      this.setHint("Building removed.");
    }

    setGroundAt(x, y, type) {
      if (!this.groundMap[y]) {
        this.groundMap[y] = [];
      }
      this.groundMap[y][x] = type;
      this.updateGroundNeighbors(x, y);
    }

    isGroundItem(item) {
      return item && (item.type === "ground" || item.placeLayer === "ground");
    }

    createGroundGhost(x, y, blocked) {
      const type = this.getGroundType(x, y);
      const texture = this.textures.ground[type] || this.textures.ground.grass;
      if (!texture) return null;
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.width = this.tileWidth;
      sprite.height = this.tileHeight;
      const position = this.gridToScreen(x, y);
      sprite.x = position.x;
      sprite.y = position.y;
      sprite.alpha = 0.6;
      if (blocked) {
        sprite.tint = 0xff8888;
      }
      sprite.zIndex = 9999;
      return sprite;
    }

    bindInput() {
      const view = this.view || this.app?.canvas || this.app?.view;
      if (!this.app || !view || this.boundHandlers) return;
      this.view = view;

      const handlePointerDown = (event) => {
        if (!this.inputEnabled) return;
        if (event.button !== undefined && event.button !== 0) return;
        view.setPointerCapture?.(event.pointerId);
        const point = this.getPointerPosition(event);
        this.pointers.set(event.pointerId, point);

        if (this.pointers.size === 1) {
          this.drag = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            panX: this.pan.x,
            panY: this.pan.y
          };
          this.dragMoved = false;
          this.root.classList.add("dragging");
        } else if (this.pointers.size === 2) {
          this.drag = null;
          this.dragMoved = true;
          this.initialPinchDist = this.getPinchDistance();
          this.initialScale = this.scale;
        }
      };

      const handlePointerMove = (event) => {
        if (!this.inputEnabled) return;
        if (!this.pointers.has(event.pointerId)) return;
        this.pointers.set(event.pointerId, this.getPointerPosition(event));

        if (this.pointers.size === 2) {
          const currentDist = this.getPinchDistance();
          if (this.initialPinchDist) {
            const nextScale = this.initialScale * (currentDist / this.initialPinchDist);
            const center = this.getPinchCenter();
            this.applyZoom(nextScale, center);
          }
          return;
        }

        if (!this.drag) return;
        const dx = event.clientX - this.drag.startX;
        const dy = event.clientY - this.drag.startY;
        if (Math.abs(dx) + Math.abs(dy) > 6) {
          this.dragMoved = true;
        }
        this.pan.x = this.drag.panX + dx;
        this.pan.y = this.drag.panY + dy;
        this.applyPan();
        if (this.dragMoved) {
          this.hasPanned = true;
        }
      };

      const endPointer = (event) => {
        if (this.pointers.has(event.pointerId)) {
          this.pointers.delete(event.pointerId);
        }
        if (this.pointers.size < 2) {
          this.initialPinchDist = null;
        }
        if (!this.inputEnabled) {
          this.resetInputState();
          return;
        }
        if (!this.dragMoved) {
          const local = this.getLocalMapPoint(event);
          const cell = this.screenToGrid(local.x, local.y);
          if (this.isValidCell(cell.x, cell.y)) {
            this.handleCellClick(cell.x, cell.y);
          }
        }
        this.drag = null;
        this.dragMoved = false;
        this.root.classList.remove("dragging");
        try {
          view.releasePointerCapture?.(event.pointerId);
        } catch (error) {
          // Ignore.
        }
      };

      const handlePointerLeave = () => {
        this.clearGhost();
      };

      const handleHoverMove = (event) => {
        if (!this.inputEnabled) return;
        if (this.drag || this.pointers.size > 1) return;
        const local = this.getLocalMapPoint(event);
        const cell = this.screenToGrid(local.x, local.y);
        if (this.isValidCell(cell.x, cell.y)) {
          this.showGhostAt(cell.x, cell.y);
        } else {
          this.clearGhost();
        }
      };

      const handleWheel = (event) => {
        if (!this.inputEnabled) return;
        event.preventDefault();
        const center = this.getPointerPosition(event);
        const scaleChange = Math.pow(0.999, event.deltaY);
        this.applyZoom(this.scale * scaleChange, center);
        this.hasPanned = true;
      };

      this.boundHandlers = {
        pointerdown: handlePointerDown,
        pointermove: handlePointerMove,
        pointerup: endPointer,
        pointercancel: endPointer,
        pointerleave: handlePointerLeave,
        hovermove: handleHoverMove,
        wheel: handleWheel
      };

      view.addEventListener("pointerdown", handlePointerDown);
      view.addEventListener("pointermove", handlePointerMove);
      view.addEventListener("pointerup", endPointer);
      view.addEventListener("pointercancel", endPointer);
      view.addEventListener("pointerleave", handlePointerLeave);
      view.addEventListener("pointermove", handleHoverMove);
      view.addEventListener("wheel", handleWheel, { passive: false });
    }

    unbindInput() {
      const view = this.view || this.app?.canvas || this.app?.view;
      if (!view || !this.boundHandlers) return;
      const handlers = this.boundHandlers;
      view.removeEventListener("pointerdown", handlers.pointerdown);
      view.removeEventListener("pointermove", handlers.pointermove);
      view.removeEventListener("pointerup", handlers.pointerup);
      view.removeEventListener("pointercancel", handlers.pointercancel);
      view.removeEventListener("pointerleave", handlers.pointerleave);
      view.removeEventListener("pointermove", handlers.hovermove);
      view.removeEventListener("wheel", handlers.wheel);
      this.boundHandlers = null;
    }

    getLocalMapPoint(event) {
      const point = this.getPointerPosition(event);
      return {
        x: (point.x - this.pan.x) / this.scale,
        y: (point.y - this.pan.y) / this.scale
      };
    }

    getVisibleCellRange() {
      if (!this.root) {
        return {
          minX: 0,
          maxX: this.gridSize - 1,
          minY: 0,
          maxY: this.gridSize - 1
        };
      }
      const rect = this.root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return {
          minX: 0,
          maxX: this.gridSize - 1,
          minY: 0,
          maxY: this.gridSize - 1
        };
      }
      const corners = [
        { x: 0, y: 0 },
        { x: rect.width, y: 0 },
        { x: 0, y: rect.height },
        { x: rect.width, y: rect.height }
      ];
      const cells = corners.map((corner) => {
        const localX = (corner.x - this.pan.x) / this.scale;
        const localY = (corner.y - this.pan.y) / this.scale;
        return this.screenToGrid(localX, localY);
      });
      const xs = cells.map((cell) => cell.x);
      const ys = cells.map((cell) => cell.y);
      const padding = 3;
      const minX = Math.max(0, Math.min(...xs) - padding);
      const maxX = Math.min(this.gridSize - 1, Math.max(...xs) + padding);
      const minY = Math.max(0, Math.min(...ys) - padding);
      const maxY = Math.min(this.gridSize - 1, Math.max(...ys) + padding);
      return { minX, maxX, minY, maxY };
    }

    isSameRange(a, b) {
      return (
        a &&
        b &&
        a.minX === b.minX &&
        a.maxX === b.maxX &&
        a.minY === b.minY &&
        a.maxY === b.maxY
      );
    }

    isInVisibleRange(x, y) {
      if (!this.visibleRange) return true;
      return (
        x >= this.visibleRange.minX &&
        x <= this.visibleRange.maxX &&
        y >= this.visibleRange.minY &&
        y <= this.visibleRange.maxY
      );
    }

    scheduleGroundRender() {
      if (this.cullRaf) return;
      this.cullRaf = window.requestAnimationFrame(() => {
        this.cullRaf = null;
        this.renderGround();
      });
    }

    isValidCell(x, y) {
      return x >= 0 && y >= 0 && x < this.gridSize && y < this.gridSize;
    }

    resolveAsset(path) {
      if (!path) return path;
      if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
        return path;
      }
      const trimmed = path.replace(/^\/+/, "");
      try {
        return new URL(trimmed, this.assetBase || "/").href;
      } catch (error) {
        return `${this.assetBase || "/"}${trimmed}`;
      }
    }

    key(x, y) {
      return `${x},${y}`;
    }

    isRoadType(type) {
      return type === "road" || type === "road_center" || type === "road_corner";
    }

    getRoadVariant(x, y) {
      const has = (nx, ny) => {
        const value = this.groundMap[ny] && this.groundMap[ny][nx];
        return this.isRoadType(value);
      };
      const north = has(x, y - 1);
      const south = has(x, y + 1);
      const west = has(x - 1, y);
      const east = has(x + 1, y);
      const count = [north, south, west, east].filter(Boolean).length;

      if (count >= 3) return "road_center";
      if ((north && south) || (east && west)) return "road";
      if ((north && east) || (east && south) || (south && west) || (west && north)) return "road_corner";
      return "road";
    }

    updateGroundNeighbors(x, y) {
      const offsets = [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ];
      offsets.forEach(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (this.isValidCell(nx, ny)) {
          this.updateGroundTile(nx, ny);
        }
      });
    }

    getSeededRng() {
      let t = this.getSeedValue() >>> 0;
      return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
      };
    }

    getSeedValue() {
      if (Number.isFinite(this.seedValue)) {
        return this.seedValue;
      }
      const key = this.getSeedKey();
      let seed = 0;
      try {
        const existing = localStorage.getItem(key);
        if (existing) {
          seed = Number(existing);
        } else {
          seed = this.setSeed();
        }
      } catch (error) {
        seed = 13371337;
      }
      this.seedValue = seed;
      return seed;
    }

    collectRoadAdjacents() {
      const results = [];
      for (let y = 1; y < this.gridSize - 1; y += 1) {
        for (let x = 1; x < this.gridSize - 1; x += 1) {
          if (this.isRoadType(this.getGroundType(x, y))) {
            const neighbors = [
              [x + 1, y],
              [x - 1, y],
              [x, y + 1],
              [x, y - 1]
            ];
            neighbors.forEach(([nx, ny]) => {
              if (!this.isRoadType(this.getGroundType(nx, ny))) {
                results.push({ x: nx, y: ny });
              }
            });
          }
        }
      }
      return results.length ? results : [{ x: Math.floor(this.gridSize / 2), y: Math.floor(this.gridSize / 2) }];
    }

    placePlazaPatch(centerX, centerY, size) {
      const half = Math.floor(size / 2);
      for (let y = centerY - half; y <= centerY + half; y += 1) {
        for (let x = centerX - half; x <= centerX + half; x += 1) {
          if (this.isValidCell(x, y)) {
            this.groundMap[y][x] = "plaza";
          }
        }
      }
    }

    renderPalette() {
      if (!this.palette) return;
      this.palette.innerHTML = "";

      if (!this.catalog.length) {
        const empty = document.createElement("div");
        empty.className = "city-empty";
        empty.textContent = "Buy city items in the Shop to unlock this palette.";
        this.palette.appendChild(empty);
        return;
      }

      this.catalog.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "city-item";
        if (item.id === this.selectedItemId) {
          button.classList.add("active");
        }

        const footprint = this.getFootprint(item);
        const preview = document.createElement("span");
        preview.className = "city-item-preview";
        if (item.sprite) {
          preview.style.backgroundImage = `url("${this.resolveAsset(item.sprite)}")`;
        }

        const details = document.createElement("div");
        details.className = "city-item-details";

        const name = document.createElement("div");
        name.className = "city-item-name";
        name.textContent = item.name || item.id;

        const size = document.createElement("div");
        size.className = "city-item-size ui-label";
        size.textContent = `${footprint.w}x${footprint.h}`;

        details.appendChild(name);
        details.appendChild(size);

        const count = document.createElement("span");
        count.className = "city-item-count";
        const available = this.getItemCount(item.id);
        count.textContent = `x${available}`;
        if (available <= 0) {
          button.classList.add("locked");
        }

        button.appendChild(preview);
        button.appendChild(details);
        button.appendChild(count);
        button.addEventListener("click", () => {
          this.selectedItemId = item.id;
          this.renderPalette();
          this.clearGhost();
          this.setHint("Place mode: tap the map to place this building.");
        });

        this.palette.appendChild(button);
      });
    }

    onShow() {
      window.requestAnimationFrame(() => {
        this.updateMetrics();
        this.renderGround();
        this.renderGridOverlay();
        this.renderPlacements();
        if (!this.hasPanned) {
          this.centerMap();
        } else {
          this.applyPan();
        }
      });
    }

    getSeedKey() {
      return `${this.storageKey}:seed`;
    }

    setSeed(nextSeed) {
      const seed = Number.isFinite(nextSeed) ? Math.floor(nextSeed) : Math.floor(Math.random() * 2 ** 31);
      try {
        localStorage.setItem(this.getSeedKey(), String(seed));
      } catch (error) {
        // Ignore seed storage errors.
      }
      this.seedValue = seed;
      return seed;
    }

    regenerateStarterCity() {
      // Clear saved layout from localStorage first
      try {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.getSeedKey());
      } catch (e) {
        // Ignore
      }
      
      // Reset everything
      this.setSeed();
      this.tileMap.clear();
      this.occupiedMap.clear();
      this.groundMap = [];
      this.layout = { gridSize: this.gridSize, tiles: [] };
      
      // Rebuild
      this.buildGroundMap();
      this.renderGround();
      this.renderGridOverlay();
      this.seedStarterLayout();
      this.renderPlacements();
      this.saveLayout();
      this.setHint("City regenerated with new assets!");
    }

    /**
     * Spawn the player character in the city
     */
    spawnCharacter() {
      if (this.characterSprite || !this.characterContainer) return;
      
      // Only spawn if character has been created
      if (!characterManager.hasCharacter()) return;
      
      this.characterSprite = new CharacterSprite(characterManager);
      
      // Get saved position or default to center
      const char = characterManager.getCharacter();
      const startX = char.position?.x ?? Math.floor(this.gridSize / 2);
      const startY = char.position?.y ?? Math.floor(this.gridSize / 2);
      
      // Set position
      this.characterSprite.setGridPosition(startX, startY, (x, y) => this.gridToScreen(x, y));
      this.characterSprite.updateZIndex();
      
      this.characterContainer.addChild(this.characterSprite);
    }

    /**
     * Move character to clicked cell (if not in place/erase mode)
     */
    moveCharacterTo(x, y) {
      if (!this.characterSprite) return;
      if (!this.isValidCell(x, y)) return;
      
      // Don't walk to occupied cells
      if (this.occupiedMap.has(this.key(x, y))) return;
      
      this.characterSprite.walkTo(
        x, y,
        (gx, gy) => this.gridToScreen(gx, gy),
        () => {
          this.characterSprite?.updateZIndex();
        }
      );
    }

    /**
     * Get character's current position
     */
    getCharacterPosition() {
      if (!this.characterSprite) return null;
      return this.characterSprite.getGridPosition();
    }

    /**
     * Center camera on character
     */
    centerOnCharacter() {
      if (!this.characterSprite || !this.root) return;
      
      const pos = this.characterSprite.getGridPosition();
      const screen = this.gridToScreen(pos.x, pos.y);
      const rect = this.root.getBoundingClientRect();
      
      this.pan.x = (rect.width / 2) - (screen.x * this.scale);
      this.pan.y = (rect.height / 2) - (screen.y * this.scale);
      this.applyPan();
      this.hasPanned = true;
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.setInputEnabled(false);
      this.unbindInput();
      if (this.handleResize) {
        window.removeEventListener("resize", this.handleResize);
      }
      if (this.characterSprite) {
        this.characterSprite.destroy();
        this.characterSprite = null;
      }
      if (this.app) {
        this.app.destroy(true);
        this.app = null;
      }
      this.view = null;
      this.mapContainer = null;
      this.groundContainer = null;
      this.gridContainer = null;
      this.objectContainer = null;
      this.characterContainer = null;
      this.groundSprites.clear();
    }
  }
