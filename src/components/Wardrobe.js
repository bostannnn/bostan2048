/**
 * Wardrobe - Overlay for changing character clothes from inventory
 */

import { characterManager } from "../core/CharacterManager.js";

export class Wardrobe {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onClose = options.onClose || (() => {});
    this.overlay = null;
    this.previewCanvas = null;
    this.previewCtx = null;

    // Working copy of current selections
    const char = characterManager.getCharacter();
    this.currentSkinTone = char.skinTone;
    this.currentHairStyle = char.hairStyle;
    this.currentHairColor = char.hairColor;
  }

  show() {
    this.createOverlay();
    this.updatePreview();
    requestAnimationFrame(() => {
      this.overlay.classList.add("visible");
    });
  }

  hide() {
    if (!this.overlay) return;
    this.overlay.classList.remove("visible");
    setTimeout(() => {
      this.overlay?.remove();
      this.overlay = null;
      this.onClose();
    }, 300);
  }

  createOverlay() {
    if (this.overlay) return;

    const options = characterManager.getOptions();
    const char = characterManager.getCharacter();

    this.overlay = document.createElement("div");
    this.overlay.className = "wardrobe-overlay";
    this.overlay.innerHTML = `
      <div class="wardrobe">
        <div class="wardrobe-header">
          <h2>Wardrobe</h2>
          <button class="wardrobe-close" type="button">&times;</button>
        </div>
        
        <div class="wardrobe-content">
          <div class="wardrobe-preview">
            <canvas class="wardrobe-preview-canvas" width="160" height="220"></canvas>
            <div class="wardrobe-name">${char.name}</div>
          </div>
          
          <div class="wardrobe-tabs">
            <button class="wardrobe-tab active" data-tab="appearance" type="button">Appearance</button>
            <button class="wardrobe-tab" data-tab="clothes" type="button">Clothes</button>
          </div>
          
          <div class="wardrobe-panel" data-panel="appearance">
            <div class="wardrobe-section">
              <label class="wardrobe-label">Skin Tone</label>
              <div class="wardrobe-color-row" data-type="skin">
                ${options.skinTones.map((tone, i) => `
                  <button type="button" class="wardrobe-color-btn ${i === this.currentSkinTone ? 'active' : ''}" 
                    data-index="${i}" 
                    style="background-color: #${tone.color.toString(16).padStart(6, '0')}"
                    title="${tone.name}">
                  </button>
                `).join('')}
              </div>
            </div>
            
            <div class="wardrobe-section">
              <label class="wardrobe-label">Hair Style</label>
              <div class="wardrobe-style-row" data-type="hairStyle">
                ${options.hairStyles.map((style, i) => `
                  <button type="button" class="wardrobe-style-btn ${i === this.currentHairStyle ? 'active' : ''}" 
                    data-index="${i}">
                    ${style.name}
                  </button>
                `).join('')}
              </div>
            </div>
            
            <div class="wardrobe-section">
              <label class="wardrobe-label">Hair Color</label>
              <div class="wardrobe-color-row" data-type="hairColor">
                ${options.hairColors.map((color, i) => `
                  <button type="button" class="wardrobe-color-btn ${i === this.currentHairColor ? 'active' : ''}" 
                    data-index="${i}" 
                    style="background-color: #${color.color.toString(16).padStart(6, '0')}"
                    title="${color.name}">
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
          
          <div class="wardrobe-panel hidden" data-panel="clothes">
            <div class="wardrobe-inventory">
              <div class="wardrobe-empty">
                <span class="wardrobe-empty-icon">👗</span>
                <p>No clothes in inventory yet!</p>
                <p class="wardrobe-empty-hint">Visit the Shop to buy outfits.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="wardrobe-footer">
          <button type="button" class="wardrobe-btn wardrobe-btn-save">Save Changes</button>
        </div>
      </div>
    `;

    // Get canvas
    this.previewCanvas = this.overlay.querySelector(".wardrobe-preview-canvas");
    this.previewCtx = this.previewCanvas.getContext("2d");

    this.bindEvents();
    this.container.appendChild(this.overlay);
  }

  bindEvents() {
    // Close button
    this.overlay.querySelector(".wardrobe-close").addEventListener("click", () => this.hide());
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.hide();
    });

    // Tabs
    this.overlay.querySelectorAll(".wardrobe-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        this.overlay.querySelectorAll(".wardrobe-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        
        const panelId = tab.dataset.tab;
        this.overlay.querySelectorAll(".wardrobe-panel").forEach((p) => {
          p.classList.toggle("hidden", p.dataset.panel !== panelId);
        });
      });
    });

    // Skin tone
    this.overlay.querySelector('[data-type="skin"]').addEventListener("click", (e) => {
      const btn = e.target.closest(".wardrobe-color-btn");
      if (!btn) return;
      this.currentSkinTone = parseInt(btn.dataset.index, 10);
      this.updateActiveButtons('[data-type="skin"]', this.currentSkinTone);
      this.updatePreview();
    });

    // Hair style
    this.overlay.querySelector('[data-type="hairStyle"]').addEventListener("click", (e) => {
      const btn = e.target.closest(".wardrobe-style-btn");
      if (!btn) return;
      this.currentHairStyle = parseInt(btn.dataset.index, 10);
      this.updateActiveButtons('[data-type="hairStyle"]', this.currentHairStyle);
      this.updatePreview();
    });

    // Hair color
    this.overlay.querySelector('[data-type="hairColor"]').addEventListener("click", (e) => {
      const btn = e.target.closest(".wardrobe-color-btn");
      if (!btn) return;
      this.currentHairColor = parseInt(btn.dataset.index, 10);
      this.updateActiveButtons('[data-type="hairColor"]', this.currentHairColor);
      this.updatePreview();
    });

    // Save button
    this.overlay.querySelector(".wardrobe-btn-save").addEventListener("click", () => {
      this.saveAndClose();
    });
  }

  updateActiveButtons(selector, activeIndex) {
    const container = this.overlay.querySelector(selector);
    container.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", parseInt(btn.dataset.index, 10) === activeIndex);
    });
  }

  updatePreview() {
    const ctx = this.previewCtx;
    const canvas = this.previewCanvas;
    const options = characterManager.getOptions();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.6;

    const skinColor = options.skinTones[this.currentSkinTone]?.color ?? 0xFFE4C4;
    const hairColor = options.hairColors[this.currentHairColor]?.color ?? 0x4A3728;
    const skinHex = "#" + skinColor.toString(16).padStart(6, "0");
    const hairHex = "#" + hairColor.toString(16).padStart(6, "0");

    const scale = 2;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 55 * scale, 18 * scale, 7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = skinHex;
    ctx.beginPath();
    ctx.roundRect(cx - 12 * scale, cy - 25 * scale, 24 * scale, 30 * scale, 8);
    ctx.fill();

    // Dress
    ctx.fillStyle = "#FF6B9D";
    ctx.beginPath();
    ctx.roundRect(cx - 14 * scale, cy, 28 * scale, 35 * scale, 4);
    ctx.fill();

    // Legs
    ctx.fillStyle = skinHex;
    ctx.fillRect(cx - 7 * scale, cy + 30 * scale, 5 * scale, 18 * scale);
    ctx.fillRect(cx + 2 * scale, cy + 30 * scale, 5 * scale, 18 * scale);

    // Head
    ctx.fillStyle = skinHex;
    ctx.beginPath();
    ctx.arc(cx, cy - 40 * scale, 16 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = hairHex;
    const hairStyle = this.currentHairStyle;

    if (hairStyle === 0) {
      ctx.beginPath();
      ctx.ellipse(cx, cy - 50 * scale, 18 * scale, 10 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (hairStyle === 1) {
      ctx.beginPath();
      ctx.ellipse(cx, cy - 50 * scale, 20 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 20 * scale, cy - 45 * scale, 7 * scale, 50 * scale);
      ctx.fillRect(cx + 13 * scale, cy - 45 * scale, 7 * scale, 50 * scale);
    } else if (hairStyle === 2) {
      ctx.beginPath();
      ctx.ellipse(cx, cy - 50 * scale, 18 * scale, 10 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy - 68 * scale, 7 * scale, 18 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx - 5 * scale, cy - 40 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 5 * scale, cy - 40 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Blush
    ctx.fillStyle = "rgba(255, 150, 150, 0.4)";
    ctx.beginPath();
    ctx.ellipse(cx - 9 * scale, cy - 36 * scale, 3.5 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 9 * scale, cy - 36 * scale, 3.5 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  saveAndClose() {
    characterManager.updateCharacter({
      skinTone: this.currentSkinTone,
      hairStyle: this.currentHairStyle,
      hairColor: this.currentHairColor
    });
    this.hide();
  }
}

let wardrobeInstance = null;

export function showWardrobe(options = {}) {
  if (wardrobeInstance) {
    wardrobeInstance.hide();
  }
  wardrobeInstance = new Wardrobe(options);
  wardrobeInstance.show();
  return wardrobeInstance;
}

export function hideWardrobe() {
  wardrobeInstance?.hide();
  wardrobeInstance = null;
}
