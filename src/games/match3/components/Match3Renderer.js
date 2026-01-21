import { gsap } from "gsap";
import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";

export class Match3Renderer {
  constructor(hostEl, options = {}) {
    this.hostEl = hostEl;
    this.rows = options.rows || 8;
    this.cols = options.cols || 8;
    this.gemPaths = options.gemPaths || [];
    this.specialPaths = options.specialPaths || {};
    this.backgroundPath = options.backgroundPath || null;
    this.tiles = new Map();
    this.metrics = {
      tileSize: 0,
      spacing: 0,
      offsetX: 0,
      offsetY: 0,
      boardWidth: 0,
      boardHeight: 0,
      radius: 0,
    };
    this.hintTween = null;
    this.hintOverlay = null;
    this.rejectOverlay = null;
    this.flashOverlay = null;
    this.resizeHandler = null;
    this.motionQuery = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    this.reduceMotion = this.motionQuery ? this.motionQuery.matches : false;
    this.motionHandler = null;
    this.ready = this.init();
  }

  async init() {
    if (!this.hostEl) return;

    this.app = new Application();
    await this.app.init({
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.max(1, window.devicePixelRatio || 1),
      resizeTo: this.hostEl,
    });

    this.app.canvas.classList.add("match3-canvas");
    this.app.canvas.style.width = "100%";
    this.app.canvas.style.height = "100%";
    this.app.canvas.style.pointerEvents = "none";

    this.hostEl.innerHTML = "";
    this.hostEl.appendChild(this.app.canvas);

    this.root = new Container();
    this.backgroundLayer = new Container();
    this.tileLayer = new Container();
    this.effectLayer = new Container();
    this.tileLayer.sortableChildren = true;
    this.root.addChild(this.backgroundLayer);
    this.root.addChild(this.tileLayer);
    this.root.addChild(this.effectLayer);
    this.app.stage.addChild(this.root);

    this.selection = new Graphics();
    this.hintOverlay = new Graphics();
    this.backgroundLayer.addChild(this.hintOverlay);
    this.backgroundLayer.addChild(this.selection);
    this.rejectOverlay = new Graphics();
    this.flashOverlay = new Graphics();
    this.effectLayer.addChild(this.rejectOverlay);
    this.effectLayer.addChild(this.flashOverlay);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.hostEl);
    } else {
      this.resizeHandler = () => this.resize();
      window.addEventListener("resize", this.resizeHandler);
    }

    if (this.motionQuery) {
      this.motionHandler = (event) => {
        this.reduceMotion = !!event.matches;
      };
      if (this.motionQuery.addEventListener) {
        this.motionQuery.addEventListener("change", this.motionHandler);
      } else if (this.motionQuery.addListener) {
        this.motionQuery.addListener(this.motionHandler);
      }
    }

    await this.preloadTextures();
    this.resize();
  }

  loadTexture(path) {
    if (!path) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(Texture.from(img));
      img.onerror = () => resolve(null);
      img.src = path;
    });
  }

  async preloadTextures() {
    this.gemTextures = await Promise.all(
      this.gemPaths.map((path) => this.loadTexture(path))
    );
    this.specialTextures = {};
    const specials = await Promise.all(
      Object.entries(this.specialPaths).map(async ([key, path]) => ({
        key,
        texture: await this.loadTexture(path),
      }))
    );
    specials.forEach(({ key, texture }) => {
      if (texture) {
        this.specialTextures[key] = texture;
      }
    });
    if (this.backgroundPath) {
      this.backgroundTexture = await this.loadTexture(this.backgroundPath);
    }
  }

  setGridSize(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.resize();
  }

  setSelection(cell) {
    if (!this.selection) return;
    this.selection.clear();
    if (!cell) return;
    const { tileSize, radius } = this.metrics;
    const pos = this.getCellPosition(cell.row, cell.col);
    this.selection.roundRect(pos.x, pos.y, tileSize, tileSize, radius);
    this.selection.stroke({ color: 0xffffff, width: Math.max(2, tileSize * 0.06), alpha: 0.8 });
  }

  clearHint() {
    if (this.hintTween) {
      this.hintTween.kill();
      this.hintTween = null;
    }
    if (this.hintOverlay) {
      this.hintOverlay.clear();
      this.hintOverlay.alpha = 0;
    }
  }

  showHint(cells) {
    if (!this.hintOverlay || !cells || !cells.length) return;
    if (this.hintTween) {
      this.hintTween.kill();
      this.hintTween = null;
    }
    this.hintOverlay.clear();
    const { tileSize, radius } = this.metrics;
    cells.forEach((cell) => {
      const pos = this.getCellPosition(cell.row, cell.col);
      this.hintOverlay.roundRect(pos.x, pos.y, tileSize, tileSize, radius);
    });
    this.hintOverlay.stroke({
      color: 0xffd36a,
      width: Math.max(2, Math.round(tileSize * 0.08)),
      alpha: 0.9,
    });
    if (this.reduceMotion) {
      this.hintOverlay.alpha = 0.75;
      return;
    }
    this.hintOverlay.alpha = 0.2;
    this.hintTween = gsap.to(this.hintOverlay, {
      alpha: 0.9,
      duration: 0.7,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }

  resize() {
    if (!this.hostEl || !this.app) return;
    const width = this.hostEl.clientWidth;
    const height = this.hostEl.clientHeight;
    if (!width || !height) return;

    this.app.renderer.resize(width, height);

    this.clearHint();
    const spacing = Math.max(4, Math.round(Math.min(width, height) * 0.02));
    const tileSize = Math.floor(
      (Math.min(width, height) - spacing * (this.cols + 1)) / this.cols
    );
    const boardWidth = tileSize * this.cols + spacing * (this.cols + 1);
    const boardHeight = tileSize * this.rows + spacing * (this.rows + 1);
    const offsetX = (width - boardWidth) / 2;
    const offsetY = (height - boardHeight) / 2;
    const radius = Math.max(6, Math.round(tileSize * 0.18));

    this.metrics = { tileSize, spacing, offsetX, offsetY, boardWidth, boardHeight, radius };
    this.drawBackground();
    this.refreshTiles();
  }

  drawBackground() {
    this.backgroundLayer.removeChildren();

    if (this.backgroundTexture) {
      const sprite = new Sprite(this.backgroundTexture);
      sprite.width = this.metrics.boardWidth;
      sprite.height = this.metrics.boardHeight;
      sprite.x = this.metrics.offsetX;
      sprite.y = this.metrics.offsetY;
      sprite.alpha = 0.45;
      this.backgroundLayer.addChild(sprite);
    }

    const grid = new Graphics();
    const { tileSize, spacing, radius } = this.metrics;
    grid.fill({ color: 0x0f1115, alpha: 0.18 });
    grid.roundRect(
      this.metrics.offsetX,
      this.metrics.offsetY,
      this.metrics.boardWidth,
      this.metrics.boardHeight,
      radius * 0.8
    );

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const pos = this.getCellPosition(row, col);
        grid.roundRect(pos.x, pos.y, tileSize, tileSize, radius);
        grid.fill({ color: 0xffffff, alpha: 0.08 });
      }
    }
    this.backgroundLayer.addChild(grid);
    this.backgroundLayer.addChild(this.hintOverlay);
    this.backgroundLayer.addChild(this.selection);
  }

  getCellPosition(row, col) {
    const { spacing, tileSize, offsetX, offsetY } = this.metrics;
    return {
      x: offsetX + spacing + col * (tileSize + spacing),
      y: offsetY + spacing + row * (tileSize + spacing),
    };
  }

  getContainerPosition(row, col) {
    const pos = this.getCellPosition(row, col);
    const { tileSize } = this.metrics;
    return { x: pos.x + tileSize / 2, y: pos.y + tileSize / 2 };
  }

  getSpawnPosition(row, col) {
    const dest = this.getContainerPosition(row, col);
    const { offsetY, spacing, tileSize } = this.metrics;
    return {
      x: dest.x,
      y: offsetY - spacing - tileSize * 0.6,
    };
  }

  render(grid) {
    if (!this.app) return;
    this.lastGrid = grid;
    const toRemove = new Set(this.tiles.keys());

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const tile = grid[row][col];
        if (!tile) continue;
        toRemove.delete(tile);
        if (!this.tiles.has(tile)) {
          this.addTile(tile, row, col);
        } else {
          this.updateTile(tile, row, col);
        }
      }
    }

    toRemove.forEach((tile) => this.removeTile(tile));
  }

  addTile(tile, row, col) {
    const container = new Container();
    container.zIndex = 1;
    this.renderTileVisual(container, tile);
    this.tileLayer.addChild(container);
    this.tiles.set(tile, container);
    const dest = this.getContainerPosition(row, col);
    const spawn = this.getSpawnPosition(row, col);
    if (this.reduceMotion) {
      container.position.set(dest.x, dest.y);
      container.scale.set(1);
      container.__targetX = dest.x;
      container.__targetY = dest.y;
    } else {
      container.position.set(spawn.x, spawn.y);
      container.scale.set(0.92);
      this.animatePosition(container, dest);
      this.animateScale(container, 1);
    }
    container.__lastRow = row;
    container.__lastCol = col;
  }

  updateTile(tile, row, col) {
    const container = this.tiles.get(tile);
    if (!container) return;
    if (
      container.__lastType !== tile.type ||
      container.__lastSpecial !== tile.special ||
      container.__lastSize !== this.metrics.tileSize
    ) {
      this.renderTileVisual(container, tile);
    }
    const dest = this.getContainerPosition(row, col);
    this.animatePosition(container, dest);
    container.__lastRow = row;
    container.__lastCol = col;
  }

  removeTile(tile) {
    const container = this.tiles.get(tile);
    if (!container) return;
    this.tiles.delete(tile);
    this.animateRemoval(container, tile);
  }

  renderTileVisual(container, tile) {
    const { tileSize, radius } = this.metrics;
    if (container.__glowTween) {
      container.__glowTween.kill();
      container.__glowTween = null;
    }
    container.removeChildren();

    if (tile.special) {
      const glow = new Graphics();
      glow.roundRect(0, 0, tileSize, tileSize, radius);
      glow.fill({ color: 0xffe59f, alpha: 0.35 });
      glow.blendMode = "screen";
      glow.alpha = 0.4;
      glow.pivot.set(tileSize / 2, tileSize / 2);
      glow.position.set(tileSize / 2, tileSize / 2);
      glow.scale.set(0.92);
      container.addChild(glow);
      if (!this.reduceMotion) {
        container.__glowTween = gsap.to(glow, {
          alpha: 0.85,
          duration: 0.8,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      } else {
        glow.alpha = 0.7;
      }
    }

    const texture = this.gemTextures[tile.type];
    if (texture) {
      const sprite = new Sprite(texture);
      const scale = Math.min(tileSize / texture.width, tileSize / texture.height);
      sprite.scale.set(scale);
      sprite.anchor.set(0.5);
      sprite.position.set(tileSize / 2, tileSize / 2);
      container.addChild(sprite);
    } else {
      const fallback = new Graphics();
      fallback.roundRect(0, 0, tileSize, tileSize, radius);
      fallback.fill({ color: 0xffffff, alpha: 0.4 });
      container.addChild(fallback);
    }

    if (tile.special) {
      const overlayTexture = this.specialTextures[tile.special] || this.specialTextures.line;
      if (overlayTexture) {
        const overlay = new Sprite(overlayTexture);
        const scale = Math.min(tileSize / overlayTexture.width, tileSize / overlayTexture.height) * 0.75;
        overlay.scale.set(scale);
        overlay.anchor.set(0.5);
        overlay.position.set(tileSize / 2, tileSize / 2);
        overlay.alpha = 0.85;
        container.addChild(overlay);
      }
    }

    container.pivot.set(tileSize / 2, tileSize / 2);
    container.__lastType = tile.type;
    container.__lastSpecial = tile.special;
    container.__lastSize = tileSize;
  }

  refreshTiles() {
    this.tiles.forEach((container, tile) => {
      this.renderTileVisual(container, tile);
      const pos = this.findTilePosition(tile);
      if (pos) {
        container.position.set(pos.x, pos.y);
        container.__targetX = pos.x;
        container.__targetY = pos.y;
      }
    });
  }

  findTilePosition(tile) {
    if (!this.lastGrid) return null;
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (this.lastGrid[row][col] === tile) {
          return this.getContainerPosition(row, col);
        }
      }
    }
    return null;
  }

  animatePosition(container, dest) {
    if (this.reduceMotion) {
      container.position.set(dest.x, dest.y);
      container.__targetX = dest.x;
      container.__targetY = dest.y;
      return;
    }
    const distance = Math.hypot(dest.x - container.position.x, dest.y - container.position.y);
    const distanceFactor = Math.min(1.2, distance / Math.max(1, this.metrics.tileSize));
    const duration = Math.min(0.28, 0.12 + distanceFactor * 0.08);
    if (Math.abs(dest.x - container.position.x) < 0.4 && Math.abs(dest.y - container.position.y) < 0.4) {
      container.position.set(dest.x, dest.y);
      container.__targetX = dest.x;
      container.__targetY = dest.y;
      return;
    }
    if (container.__targetX === dest.x && container.__targetY === dest.y) return;
    container.__targetX = dest.x;
    container.__targetY = dest.y;
    gsap.killTweensOf(container.position);
    gsap.to(container.position, {
      x: dest.x,
      y: dest.y,
      duration,
      ease: "power3.out",
    });
  }

  animateScale(container, scale) {
    if (this.reduceMotion) {
      container.scale.set(scale);
      return;
    }
    gsap.killTweensOf(container.scale);
    gsap.to(container.scale, {
      x: scale,
      y: scale,
      duration: 0.22,
      ease: "back.out(1.7)",
    });
  }

  animateRemoval(container, tile) {
    if (this.reduceMotion) {
      container.destroy({ children: true });
      return;
    }
    gsap.killTweensOf(container);
    gsap.killTweensOf(container.scale);
    if (container.__glowTween) {
      container.__glowTween.kill();
      container.__glowTween = null;
    }
    if (tile?.special) {
      this.spawnBurst(container.position.x, container.position.y, "burst", { count: 3, spread: 0.6, scale: 0.7 });
    } else {
      this.spawnBurst(container.position.x, container.position.y, "sparkle", { count: 2, spread: 0.45, scale: 0.5 });
    }
    gsap.to(container, {
      alpha: 0,
      duration: 0.16,
      ease: "power1.out",
    });
    gsap
      .timeline({ onComplete: () => container.destroy({ children: true }) })
      .to(container.scale, {
        x: 1.08,
        y: 1.08,
        duration: 0.08,
        ease: "power1.out",
      })
      .to(container.scale, {
        x: 0.2,
        y: 0.2,
        duration: 0.18,
        ease: "back.in(1.6)",
      });
  }

  setLastGrid(grid) {
    this.lastGrid = grid;
  }

  animateSwap(tileA, tileB, from, to) {
    const containerA = this.tiles.get(tileA);
    const containerB = this.tiles.get(tileB);
    if (!containerA || !containerB) return Promise.resolve();

    const posA = this.getContainerPosition(from.row, from.col);
    const posB = this.getContainerPosition(to.row, to.col);
    const prevA = containerA.zIndex;
    const prevB = containerB.zIndex;
    containerA.zIndex = 5;
    containerB.zIndex = 5;

    if (this.reduceMotion) {
      containerA.position.set(posB.x, posB.y);
      containerB.position.set(posA.x, posA.y);
      containerA.zIndex = prevA;
      containerB.zIndex = prevB;
      containerA.__targetX = posB.x;
      containerA.__targetY = posB.y;
      containerB.__targetX = posA.x;
      containerB.__targetY = posA.y;
      return Promise.resolve();
    }

    gsap.killTweensOf(containerA.position);
    gsap.killTweensOf(containerB.position);
    gsap.killTweensOf(containerA.scale);
    gsap.killTweensOf(containerB.scale);

    return new Promise((resolve) => {
      gsap
        .timeline({
          onComplete: () => {
            containerA.zIndex = prevA;
            containerB.zIndex = prevB;
            containerA.__targetX = posB.x;
            containerA.__targetY = posB.y;
            containerB.__targetX = posA.x;
            containerB.__targetY = posA.y;
            resolve();
          },
        })
        .to(
          containerA.position,
          { x: posB.x, y: posB.y, duration: 0.18, ease: "power3.out" },
          0
        )
        .to(
          containerB.position,
          { x: posA.x, y: posA.y, duration: 0.18, ease: "power3.out" },
          0
        )
        .to(
          [containerA.scale, containerB.scale],
          {
            duration: 0.1,
            x: 1.06,
            y: 1.06,
            yoyo: true,
            repeat: 1,
            ease: "power1.out",
          },
          0
        );
    });
  }

  animateReject(tileA, tileB) {
    const targets = [tileA, tileB]
      .map((tile) => this.tiles.get(tile))
      .filter(Boolean);
    if (!targets.length) return Promise.resolve();

    if (this.reduceMotion) {
      return Promise.resolve();
    }

    gsap.killTweensOf(targets);
    gsap.killTweensOf(targets.map((target) => target.scale));

    return new Promise((resolve) => {
      this.flashReject(targets.map((target) => target.position));
      gsap.to(targets, {
        rotation: 0.12,
        duration: 0.06,
        yoyo: true,
        repeat: 3,
        ease: "power1.inOut",
        onComplete: () => {
          targets.forEach((target) => {
            target.rotation = 0;
          });
          resolve();
        },
      });
      gsap.to(targets.map((target) => target.scale), {
        x: 1.08,
        y: 1.08,
        duration: 0.08,
        yoyo: true,
        repeat: 1,
        ease: "power1.out",
      });
    });
  }

  flashReject(positions) {
    if (!this.rejectOverlay || !positions.length) return;
    if (this.reduceMotion) return;
    const { tileSize, radius } = this.metrics;
    this.rejectOverlay.clear();
    positions.forEach((pos) => {
      this.rejectOverlay.roundRect(
        pos.x - tileSize / 2,
        pos.y - tileSize / 2,
        tileSize,
        tileSize,
        radius
      );
    });
    this.rejectOverlay.stroke({ color: 0xff5d5d, width: Math.max(2, Math.round(tileSize * 0.07)), alpha: 0.9 });
    this.rejectOverlay.alpha = 0.9;
    gsap.killTweensOf(this.rejectOverlay);
    gsap.to(this.rejectOverlay, {
      alpha: 0,
      duration: 0.25,
      ease: "power1.out",
      onComplete: () => {
        this.rejectOverlay.clear();
      },
    });
  }

  flashBoard(color = 0xffffff, alpha = 0.18) {
    if (!this.flashOverlay) return;
    if (this.reduceMotion) return;
    const { offsetX, offsetY, boardWidth, boardHeight, radius } = this.metrics;
    this.flashOverlay.clear();
    this.flashOverlay.roundRect(offsetX, offsetY, boardWidth, boardHeight, radius * 0.8);
    this.flashOverlay.fill({ color, alpha });
    this.flashOverlay.alpha = 0;
    gsap.killTweensOf(this.flashOverlay);
    gsap.to(this.flashOverlay, {
      alpha: 1,
      duration: 0.08,
      yoyo: true,
      repeat: 1,
      ease: "power1.out",
      onComplete: () => {
        this.flashOverlay.clear();
      },
    });
  }

  spawnBurst(x, y, textureKey, options = {}) {
    const texture = this.specialTextures[textureKey];
    if (!texture || !this.effectLayer) return;
    if (this.reduceMotion) return;
    const count = options.count || 1;
    const spread = options.spread ?? 0.3;
    const baseScale = options.scale ?? 0.6;
    for (let i = 0; i < count; i += 1) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      const offset = (Math.random() - 0.5) * this.metrics.tileSize * spread;
      const offsetY = (Math.random() - 0.5) * this.metrics.tileSize * spread;
      sprite.position.set(x + offset, y + offsetY);
      sprite.alpha = 0.9;
      const scale = Math.max(0.2, this.metrics.tileSize / texture.width) * baseScale;
      sprite.scale.set(scale);
      this.effectLayer.addChild(sprite);
      gsap.to(sprite, {
        alpha: 0,
        rotation: Math.random() * 0.6 - 0.3,
        duration: 0.35,
        ease: "power2.out",
        onComplete: () => sprite.destroy(),
      });
      gsap.to(sprite.scale, {
        x: scale * 1.6,
        y: scale * 1.6,
        duration: 0.35,
        ease: "power2.out",
      });
    }
  }

  destroy() {
    if (this.resizeObserver && this.hostEl) {
      this.resizeObserver.unobserve(this.hostEl);
      this.resizeObserver = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.motionQuery && this.motionHandler) {
      if (this.motionQuery.removeEventListener) {
        this.motionQuery.removeEventListener("change", this.motionHandler);
      } else if (this.motionQuery.removeListener) {
        this.motionQuery.removeListener(this.motionHandler);
      }
      this.motionHandler = null;
    }
    if (this.hintTween) {
      this.hintTween.kill();
      this.hintTween = null;
    }
    if (this.hintOverlay) {
      gsap.killTweensOf(this.hintOverlay);
    }
    if (this.rejectOverlay) {
      gsap.killTweensOf(this.rejectOverlay);
    }
    if (this.flashOverlay) {
      gsap.killTweensOf(this.flashOverlay);
    }
    this.tiles.forEach((container) => {
      if (container.__glowTween) {
        container.__glowTween.kill();
        container.__glowTween = null;
      }
      gsap.killTweensOf(container);
      gsap.killTweensOf(container.position);
      gsap.killTweensOf(container.scale);
      container.destroy({ children: true });
    });
    this.tiles.clear();
    if (this.app) {
      this.app.destroy({ removeView: true });
      this.app = null;
    }
  }
}
