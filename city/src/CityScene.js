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

      this.hoverCell = null;
      this.ghostSprite = null;

      this.assets = {
        ground: {
          grass: "assets/city/svg/grass.svg",
          road: "assets/city/svg/road.svg",
          road_center: "assets/city/svg/road_center.svg",
          road_corner: "assets/city/svg/road_corner.svg",
          water: "assets/city/svg/water.svg",
          plaza: "assets/city/svg/plaza.svg"
        },
        building: {
          house: "assets/city/svg/house.svg",
          shop: "assets/city/svg/shop.svg",
          fountain: "assets/city/svg/fountain.svg",
          building_small: "assets/city/svg/building_small.svg",
          building_medium: "assets/city/svg/building_medium.svg",
          building_large: "assets/city/svg/building_large.svg"
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
          this.setHint("Place mode: choose a building and tap the map.");
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
      if (!window.PIXI) {
        console.warn("PIXI is not available. CityScene cannot render.");
        return Promise.resolve();
      }
      this.root.innerHTML = "";
      this.app = new window.PIXI.Application();

      return this.app.init({
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: this.root
      }).then(() => {
        this.app.view.classList.add("city-canvas");
        this.app.view.style.width = "100%";
        this.app.view.style.height = "100%";
        this.app.view.style.touchAction = "none";
        this.root.appendChild(this.app.view);

        this.mapContainer = new window.PIXI.Container();
        this.mapContainer.sortableChildren = true;
        this.groundContainer = new window.PIXI.Container();
        this.gridContainer = new window.PIXI.Container();
        this.objectContainer = new window.PIXI.Container();
        this.objectContainer.sortableChildren = true;

        this.mapContainer.addChild(this.groundContainer);
        this.mapContainer.addChild(this.gridContainer);
        this.mapContainer.addChild(this.objectContainer);
        this.app.stage.addChild(this.mapContainer);
      });
    }

    loadAssets() {
      if (!window.PIXI || !window.PIXI.Assets) {
        return Promise.resolve();
      }
      const urls = [
        ...Object.values(this.assets.ground),
        ...Object.values(this.assets.building)
      ];
      return window.PIXI.Assets.load(urls).then(() => {
        Object.entries(this.assets.ground).forEach(([key, url]) => {
          this.textures.ground[key] = window.PIXI.Texture.from(url);
        });
        Object.entries(this.assets.building).forEach(([key, url]) => {
          this.textures.building[key] = window.PIXI.Texture.from(url);
        });
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
      this.mode = mode === "erase" ? "erase" : "place";
      if (this.mode === "erase") {
        this.setHint("Erase mode: tap a building to remove it.");
      } else {
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
      const rect = this.app.view.getBoundingClientRect();
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
      const starterItems = [
        { id: "city_townhall", fallback: { w: 4, h: 3 } },
        { id: "city_park_fountain", fallback: { w: 3, h: 3 } },
        { id: "city_bakery", fallback: { w: 3, h: 2 } },
        { id: "city_house_small", fallback: { w: 2, h: 2 } },
        { id: "city_house_small", fallback: { w: 2, h: 2 } }
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
              footprint
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
      return base;
    }

    renderGround() {
      if (!this.groundContainer) return;
      this.groundContainer.removeChildren();
      this.groundSprites.clear();

      for (let y = 0; y < this.gridSize; y += 1) {
        for (let x = 0; x < this.gridSize; x += 1) {
          const type = this.getGroundType(x, y);
          const texture = this.textures.ground[type] || this.textures.ground.grass;
          if (!texture) continue;
          const sprite = new window.PIXI.Sprite(texture);
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
      const grid = new window.PIXI.Graphics();
      grid.lineStyle(1, 0xffffff, 0.18);

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

      const texture = this.getBuildingTexture(item, rotated);
      if (!texture) return null;

      const sprite = new window.PIXI.Sprite(texture);
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
      if (item && item.sprite) {
        const match = Object.entries(this.assets.building).find(([, url]) => url === item.sprite);
        if (match) {
          return this.textures.building[match[0]];
        }
      }
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
      const sprite = new window.PIXI.Sprite(texture);
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
      if (!this.app || !this.app.view) return;
      const view = this.app.view;

      view.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        view.setPointerCapture(event.pointerId);
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
      });

      view.addEventListener("pointermove", (event) => {
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
      });

      const endPointer = (event) => {
        if (this.pointers.has(event.pointerId)) {
          this.pointers.delete(event.pointerId);
        }
        if (this.pointers.size < 2) {
          this.initialPinchDist = null;
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
          view.releasePointerCapture(event.pointerId);
        } catch (error) {
          // Ignore.
        }
      };

      view.addEventListener("pointerup", endPointer);
      view.addEventListener("pointercancel", endPointer);
      view.addEventListener("pointerleave", () => {
        this.clearGhost();
      });

      view.addEventListener("pointermove", (event) => {
        if (this.drag || this.pointers.size > 1) return;
        const local = this.getLocalMapPoint(event);
        const cell = this.screenToGrid(local.x, local.y);
        if (this.isValidCell(cell.x, cell.y)) {
          this.showGhostAt(cell.x, cell.y);
        } else {
          this.clearGhost();
        }
      });

      view.addEventListener(
        "wheel",
        (event) => {
          event.preventDefault();
          const center = this.getPointerPosition(event);
          const scaleChange = Math.pow(0.999, event.deltaY);
          this.applyZoom(this.scale * scaleChange, center);
          this.hasPanned = true;
        },
        { passive: false }
      );
    }

    getLocalMapPoint(event) {
      const point = this.getPointerPosition(event);
      return {
        x: (point.x - this.pan.x) / this.scale,
        y: (point.y - this.pan.y) / this.scale
      };
    }

    isValidCell(x, y) {
      return x >= 0 && y >= 0 && x < this.gridSize && y < this.gridSize;
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
      let t = seed >>> 0;
      return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
      };
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
          preview.style.backgroundImage = `url("${item.sprite}")`;
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
      return seed;
    }

    regenerateStarterCity() {
      this.setSeed();
      this.tileMap.clear();
      this.groundMap = [];
      this.buildGroundMap();
      this.renderGround();
      this.renderGridOverlay();
      this.seedStarterLayout();
      this.renderPlacements();
      this.saveLayout();
      this.setHint("Starter city regenerated.");
    }
  }
