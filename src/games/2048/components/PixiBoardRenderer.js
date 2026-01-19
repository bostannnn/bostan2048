import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

const TILE_COLORS = {
  2: 0xeee4da,
  4: 0xede0c8,
  8: 0xf2b179,
  16: 0xf59563,
  32: 0xf67c5f,
  64: 0xf65e3b,
  128: 0xedcf72,
  256: 0xedcc61,
  512: 0xedc850,
  1024: 0xedc53f,
  2048: 0xedc22e,
};

const DARK_TEXT = 0x776e65;
const LIGHT_TEXT = 0xf9f6f2;

// --- CRITICAL FIX 1: Use Quintic Easing (Much snappier/smoother) ---
const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

export class PixiBoardRenderer {
  constructor(hostEl, options = {}) {
    this.hostEl = hostEl;
    this.size = options.size || 4;
    this.imageAvailability = options.imageAvailability || {};
    this.imagePaths = options.imagePaths || {};
    this.textures = new Map();
    this.tiles = new Map();
    this.tweens = new Set();
    this.metrics = {
      tileSize: 0,
      spacing: 0,
      offsetX: 0,
      offsetY: 0,
      boardSize: 0,
      radius: 0,
    };
    this.pendingGrid = null;
    this.resizeObserver = null;
    this.themeObserver = null;
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

    // PixiJS v8 uses .canvas, not .view
    this.app.canvas.classList.add('pixi-board');
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';
    this.app.canvas.style.pointerEvents = 'none';

    this.hostEl.innerHTML = '';
    this.hostEl.appendChild(this.app.canvas);

    this.root = new Container();
    this.backgroundLayer = new Container();
    this.tileLayer = new Container();
    this.tileLayer.sortableChildren = true;
    this.root.addChild(this.backgroundLayer);
    this.root.addChild(this.tileLayer);
    this.app.stage.addChild(this.root);

    this.app.ticker.add(this.updateTweens, this);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.hostEl);
    } else {
      window.addEventListener('resize', () => this.resize());
    }

    this.observeTheme();
    this.resize();

    if (this.pendingGrid) {
      const grid = this.pendingGrid;
      this.pendingGrid = null;
      this.update(grid);
    }
  }

  observeTheme() {
    if (typeof MutationObserver === 'undefined' || !document.body) return;
    this.themeObserver = new MutationObserver(() => this.drawBackground());
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  setThemeAssets(imagePaths, imageAvailability) {
    this.imagePaths = imagePaths || {};
    this.imageAvailability = imageAvailability || {};
    this.textures.clear();
    this.refreshTiles();
  }

  setTileTexture(value, image) {
    if (!image) return;
    const texture = image instanceof Texture ? image : Texture.from(image);
    this.textures.set(value, texture);
    this.refreshTileValue(value);
  }

resize() {
    if (!this.hostEl) return;
    
    // 1. Get the exact CSS pixels
    const width = this.hostEl.clientWidth;
    const height = this.hostEl.clientHeight;
    
    if (!width || !height) return;

    // 2. Tell Pixi to match this size exactly (Prevents stretching)
    this.app.renderer.resize(width, height);

    // 3. Recalculate grid metrics
    const boardSize = Math.min(width, height);
    const spacing = Math.max(6, Math.round(boardSize * 0.025));
    const tileSize = Math.floor((boardSize - spacing * (this.size + 1)) / this.size);
    const actualBoard = tileSize * this.size + spacing * (this.size + 1);
    const offsetX = (width - actualBoard) / 2;
    const offsetY = (height - actualBoard) / 2;
    const radius = Math.max(6, Math.round(tileSize * 0.1));

    this.metrics = { tileSize, spacing, offsetX, offsetY, boardSize: actualBoard, radius };

    this.drawBackground();
    this.refreshTiles();
  }

  drawBackground() {
    if (!this.backgroundLayer) return;
    this.backgroundLayer.removeChildren();
    const grid = new Graphics();
    const { tileSize, spacing } = this.metrics;
    const { radius } = this.metrics;

    const isDark = document.body.classList.contains('dark-mode');
    const color = isDark ? 0xffffff : 0x999999;
    const alpha = isDark ? 0.06 : 0.15;

    for (let x = 0; x < this.size; x += 1) {
      for (let y = 0; y < this.size; y += 1) {
        const pos = this.getCellPosition(x, y);
        grid.roundRect(pos.x, pos.y, tileSize, tileSize, radius * 0.8);
        grid.fill({ color, alpha });
      }
    }

    this.backgroundLayer.addChild(grid);
  }

  getCellPosition(x, y) {
    const { spacing, tileSize, offsetX, offsetY } = this.metrics;
    return {
      x: offsetX + spacing + x * (tileSize + spacing),
      y: offsetY + spacing + y * (tileSize + spacing),
    };
  }

  getContainerPosition(x, y) {
    const pos = this.getCellPosition(x, y);
    const { tileSize } = this.metrics;
    return {
      x: pos.x + tileSize / 2,
      y: pos.y + tileSize / 2,
    };
  }

  update(grid) {
    if (!this.app) {
      this.pendingGrid = grid;
      return;
    }

    const toRemove = new Set(this.tiles.keys());

    grid.eachCell((x, y, tile) => {
      if (!tile) return;
      toRemove.delete(tile);
      if (this.tiles.has(tile)) {
        this.updateTile(tile);
      } else {
        this.addTile(tile, toRemove);
      }
    });

    toRemove.forEach((tile) => this.removeTile(tile));
  }

  addTile(tile, toRemove) {
    const container = new Container();
    this.renderTileVisual(container, tile.value);
    this.tileLayer.addChild(container);
    this.tiles.set(tile, container);

    const dest = this.getContainerPosition(tile.x, tile.y);
    this.setTilePivot(container);

    if (tile.previousPosition) {
      const prev = this.getContainerPosition(tile.previousPosition.x, tile.previousPosition.y);
      container.position.set(prev.x, prev.y);
      this.animatePosition(container, dest);
    } else {
      container.position.set(dest.x, dest.y);
    }

    if (tile.mergedFrom && tile.mergedFrom.length) {
      container.scale.set(0);
      this.animateScale(container, 1);
      if (window.effectManager && window.effectManager.explodeAt) {
        window.effectManager.explodeAt(dest.x, dest.y, tile.value);
      }
      tile.mergedFrom.forEach((merged) => {
        const mergedContainer = this.tiles.get(merged);
        if (!mergedContainer) return;
        if (toRemove) {
          toRemove.delete(merged);
        }
        this.tiles.delete(merged);
        this.animatePosition(mergedContainer, dest, () => {
          mergedContainer.destroy({ children: true });
        });
      });
    } else if (!tile.previousPosition) {
      container.scale.set(0);
      this.animateScale(container, 1);
    }
  }

  updateTile(tile) {
    const container = this.tiles.get(tile);
    if (!container) return;
    const dest = this.getContainerPosition(tile.x, tile.y);
    this.setTilePivot(container);

    if (
      tile.previousPosition &&
      (tile.previousPosition.x !== tile.x || tile.previousPosition.y !== tile.y)
    ) {
      const prev = this.getContainerPosition(tile.previousPosition.x, tile.previousPosition.y);
      container.position.set(prev.x, prev.y);
      this.animatePosition(container, dest);
    } else {
      container.position.set(dest.x, dest.y);
    }
  }

  removeTile(tile) {
    const container = this.tiles.get(tile);
    if (!container) return;
    this.tiles.delete(tile);
    container.destroy({ children: true });
  }

  animatePosition(container, dest, onComplete) {
    this.removeTweens(container.position);
    // 100ms = Snappy speed
    // easeOutQuint = Smooth "Apple-like" arrival
    this.tweenTo(container.position, { x: dest.x, y: dest.y }, 65, easeOutQuint, onComplete);
  }

  animateScale(container, scale) {
    this.removeTweens(container.scale);
    // Scale can keep the bounce effect if you like, or match quint for consistency
    const easeBack = (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
    this.tweenTo(container.scale, { x: scale, y: scale }, 140, easeBack);
  }

  setTilePivot(container) {
    const { tileSize } = this.metrics;
    container.pivot.set(tileSize / 2, tileSize / 2);
  }

  renderTileVisual(container, value) {
    const { tileSize, radius } = this.metrics;
    container.removeChildren();
    container.mask = null; 

    const texture = this.textures.get(value);
    const hasImage = this.imageAvailability[value] && texture;

    if (hasImage) {
      const sprite = new Sprite(texture);
      
      // Aspect Fill Logic (Fixes distortion)
      const scale = Math.max(tileSize / texture.width, tileSize / texture.height);
      sprite.scale.set(scale);
      sprite.anchor.set(0.5);
      sprite.position.set(tileSize / 2, tileSize / 2);
      
      const mask = new Graphics();
      mask.roundRect(0, 0, tileSize, tileSize, radius);
      mask.fill(0xffffff);
      
      container.addChild(sprite);
      container.addChild(mask);
      container.mask = mask; 
      return;
    }

    const bg = new Graphics();
    const color = TILE_COLORS[value] || 0x3c3a32;
    bg.roundRect(0, 0, tileSize, tileSize, radius);
    bg.fill(color);
    container.addChild(bg);

    const textColor = value <= 4 ? DARK_TEXT : LIGHT_TEXT;
    const text = new Text({
      text: String(value),
      style: {
        fontFamily: '"SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
        fontWeight: '700',
        fontSize: this.getFontSize(value, tileSize),
        fill: textColor,
      },
    });
    text.anchor.set(0.5);
    text.position.set(tileSize / 2, tileSize / 2);
    container.addChild(text);
  }

  getFontSize(value, tileSize) {
    const digits = String(value).length;
    if (digits <= 2) return Math.round(tileSize * 0.45);
    if (digits === 3) return Math.round(tileSize * 0.38);
    if (digits === 4) return Math.round(tileSize * 0.32);
    return Math.round(tileSize * 0.28);
  }

  refreshTiles() {
    this.tiles.forEach((container, tile) => {
      this.renderTileVisual(container, tile.value);
      this.setTilePivot(container);
      const dest = this.getContainerPosition(tile.x, tile.y);
      container.position.set(dest.x, dest.y);
    });
  }

  refreshTileValue(value) {
    this.tiles.forEach((container, tile) => {
      if (tile.value !== value) return;
      this.renderTileVisual(container, tile.value);
      this.setTilePivot(container);
    });
  }

  tweenTo(target, to, duration, ease, onComplete) {
    const props = {};
    Object.keys(to).forEach((key) => {
      props[key] = { from: target[key], to: to[key] };
    });
    const tween = {
      target,
      props,
      duration: Math.max(16, duration),
      elapsed: 0,
      ease: ease || ((t) => t),
      onComplete,
    };
    this.tweens.add(tween);
    return tween;
  }

  removeTweens(target) {
    if (!this.tweens.size) return;
    // Optimize: iterating Set directly is fine, no need to create array unless deleting
    // We are deleting inside the loop in updateTweens, which is tricky, but here we scan.
    for (const tween of this.tweens) {
      if (tween.target === target) {
        this.tweens.delete(tween);
      }
    }
  }

  // --- CRITICAL FIX 3: Garbage Collection Optimization ---
  updateTweens() {
    if (!this.tweens.size) return;
    const deltaMS = this.app?.ticker?.deltaMS || 16.67;
    
    // Iterate the Set directly to avoid "Array.from" GC overhead
    this.tweens.forEach((tween) => {
      tween.elapsed += deltaMS;
      const t = Math.min(1, tween.elapsed / tween.duration);
      const eased = tween.ease(t);
      Object.keys(tween.props).forEach((key) => {
        const prop = tween.props[key];
        tween.target[key] = prop.from + (prop.to - prop.from) * eased;
      });
      if (t >= 1) {
        this.tweens.delete(tween);
        if (tween.onComplete) tween.onComplete();
      }
    });
  }

  destroy() {
    if (this.resizeObserver && this.hostEl) {
      this.resizeObserver.unobserve(this.hostEl);
      this.resizeObserver = null;
    }
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
    this.tiles.forEach((container) => container.destroy({ children: true }));
    this.tiles.clear();
    this.tweens.clear();
    if (this.app) {
      this.app.ticker.remove(this.updateTweens, this);
      this.app.destroy({ removeView: true });
      this.app = null;
    }
  }
}
