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
    this.tileLayer.sortableChildren = true;
    this.root.addChild(this.backgroundLayer);
    this.root.addChild(this.tileLayer);
    this.app.stage.addChild(this.root);

    this.selection = new Graphics();
    this.backgroundLayer.addChild(this.selection);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.hostEl);
    } else {
      window.addEventListener("resize", () => this.resize());
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

  resize() {
    if (!this.hostEl || !this.app) return;
    const width = this.hostEl.clientWidth;
    const height = this.hostEl.clientHeight;
    if (!width || !height) return;

    this.app.renderer.resize(width, height);

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
    container.position.set(dest.x, dest.y);
    container.scale.set(0);
    this.animateScale(container, 1);
  }

  updateTile(tile, row, col) {
    const container = this.tiles.get(tile);
    if (!container) return;
    this.renderTileVisual(container, tile);
    const dest = this.getContainerPosition(row, col);
    this.animatePosition(container, dest);
  }

  removeTile(tile) {
    const container = this.tiles.get(tile);
    if (!container) return;
    this.tiles.delete(tile);
    this.animateRemoval(container);
  }

  renderTileVisual(container, tile) {
    const { tileSize, radius } = this.metrics;
    container.removeChildren();

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
  }

  refreshTiles() {
    this.tiles.forEach((container, tile) => {
      this.renderTileVisual(container, tile);
      const pos = this.findTilePosition(tile);
      if (pos) {
        container.position.set(pos.x, pos.y);
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
    gsap.killTweensOf(container.position);
    gsap.to(container.position, {
      x: dest.x,
      y: dest.y,
      duration: 0.18,
      ease: "power3.out",
    });
  }

  animateScale(container, scale) {
    gsap.killTweensOf(container.scale);
    gsap.to(container.scale, {
      x: scale,
      y: scale,
      duration: 0.22,
      ease: "back.out(1.7)",
    });
  }

  animateRemoval(container) {
    gsap.killTweensOf(container);
    gsap.killTweensOf(container.scale);
    gsap.to(container, {
      alpha: 0,
      duration: 0.16,
      ease: "power1.out",
    });
    gsap.to(container.scale, {
      x: 0.2,
      y: 0.2,
      duration: 0.2,
      ease: "back.in(1.6)",
      onComplete: () => container.destroy({ children: true }),
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

    gsap.killTweensOf(targets);
    gsap.killTweensOf(targets.map((target) => target.scale));

    return new Promise((resolve) => {
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

  destroy() {
    if (this.resizeObserver && this.hostEl) {
      this.resizeObserver.unobserve(this.hostEl);
      this.resizeObserver = null;
    }
    this.tiles.forEach((container) => {
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
