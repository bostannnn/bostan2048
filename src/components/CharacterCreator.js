/**
 * CharacterCreator - Overlay UI for creating/customizing the player character
 * 
 * Shown when:
 * - First time player (no saved character)
 * - Player opens wardrobe/customization from city
 */

import { characterManager } from "../core/CharacterManager.js";

export class CharacterCreator {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onComplete = options.onComplete || (() => {});
    this.isEditing = options.isEditing || false; // True if editing existing character
    
    this.overlay = null;
    this.previewCanvas = null;
    this.previewCtx = null;
    
    // Current selections (working copy)
    const char = characterManager.getCharacter();
    this.currentName = char.name;
    this.currentSkinTone = char.skinTone;
    this.currentHairStyle = char.hairStyle;
    this.currentHairColor = char.hairColor;
  }
  
  /**
   * Show the character creator overlay
   */
  show() {
    this.createOverlay();
    this.updatePreview();
    
    // Animate in
    requestAnimationFrame(() => {
      this.overlay.classList.add("visible");
    });
  }
  
  /**
   * Hide and cleanup
   */
  hide() {
    if (!this.overlay) return;
    
    this.overlay.classList.remove("visible");
    setTimeout(() => {
      this.overlay.remove();
      this.overlay = null;
    }, 300);
  }
  
  /**
   * Create the overlay DOM
   */
  createOverlay() {
    const options = characterManager.getOptions();
    
    this.overlay = document.createElement("div");
    this.overlay.className = "character-creator-overlay";
    this.overlay.innerHTML = `
      <div class="character-creator">
        <div class="cc-header">
          <h2>${this.isEditing ? "Edit Character" : "Create Your Character"}</h2>
          ${this.isEditing ? '<button class="cc-close" type="button">&times;</button>' : ''}
        </div>
        
        <div class="cc-content">
          <div class="cc-preview">
            <canvas class="cc-preview-canvas" width="200" height="280"></canvas>
          </div>
          
          <div class="cc-options">
            <div class="cc-section">
              <label class="cc-label">Name</label>
              <input type="text" class="cc-name-input" maxlength="20" value="${this.currentName}" placeholder="Enter name...">
            </div>
            
            <div class="cc-section">
              <label class="cc-label">Skin Tone</label>
              <div class="cc-color-row" data-type="skin">
                ${options.skinTones.map((tone, i) => `
                  <button type="button" class="cc-color-btn ${i === this.currentSkinTone ? 'active' : ''}" 
                    data-index="${i}" 
                    style="background-color: #${tone.color.toString(16).padStart(6, '0')}"
                    title="${tone.name}">
                  </button>
                `).join('')}
              </div>
            </div>
            
            <div class="cc-section">
              <label class="cc-label">Hair Style</label>
              <div class="cc-style-row" data-type="hairStyle">
                ${options.hairStyles.map((style, i) => `
                  <button type="button" class="cc-style-btn ${i === this.currentHairStyle ? 'active' : ''}" 
                    data-index="${i}">
                    ${style.name}
                  </button>
                `).join('')}
              </div>
            </div>
            
            <div class="cc-section">
              <label class="cc-label">Hair Color</label>
              <div class="cc-color-row" data-type="hairColor">
                ${options.hairColors.map((color, i) => `
                  <button type="button" class="cc-color-btn ${i === this.currentHairColor ? 'active' : ''}" 
                    data-index="${i}" 
                    style="background-color: #${color.color.toString(16).padStart(6, '0')}"
                    title="${color.name}">
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
        
        <div class="cc-footer">
          ${this.isEditing ? '<button type="button" class="cc-btn cc-btn-cancel">Cancel</button>' : ''}
          <button type="button" class="cc-btn cc-btn-confirm">${this.isEditing ? 'Save Changes' : 'Create Character'}</button>
        </div>
      </div>
    `;
    
    // Get canvas
    this.previewCanvas = this.overlay.querySelector(".cc-preview-canvas");
    this.previewCtx = this.previewCanvas.getContext("2d");
    
    // Bind events
    this.bindEvents();
    
    this.container.appendChild(this.overlay);
  }
  
  /**
   * Bind UI events
   */
  bindEvents() {
    // Name input
    const nameInput = this.overlay.querySelector(".cc-name-input");
    nameInput.addEventListener("input", (e) => {
      this.currentName = e.target.value;
    });
    
    // Skin tone buttons
    this.overlay.querySelector('[data-type="skin"]').addEventListener("click", (e) => {
      const btn = e.target.closest(".cc-color-btn");
      if (!btn) return;
      this.currentSkinTone = parseInt(btn.dataset.index, 10);
      this.updateActiveButtons('[data-type="skin"]', this.currentSkinTone);
      this.updatePreview();
    });
    
    // Hair style buttons
    this.overlay.querySelector('[data-type="hairStyle"]').addEventListener("click", (e) => {
      const btn = e.target.closest(".cc-style-btn");
      if (!btn) return;
      this.currentHairStyle = parseInt(btn.dataset.index, 10);
      this.updateActiveButtons('[data-type="hairStyle"]', this.currentHairStyle);
      this.updatePreview();
    });
    
    // Hair color buttons
    this.overlay.querySelector('[data-type="hairColor"]').addEventListener("click", (e) => {
      const btn = e.target.closest(".cc-color-btn");
      if (!btn) return;
      this.currentHairColor = parseInt(btn.dataset.index, 10);
      this.updateActiveButtons('[data-type="hairColor"]', this.currentHairColor);
      this.updatePreview();
    });
    
    // Confirm button
    this.overlay.querySelector(".cc-btn-confirm").addEventListener("click", () => {
      this.saveAndClose();
    });
    
    // Cancel button (editing mode)
    const cancelBtn = this.overlay.querySelector(".cc-btn-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.hide());
    }
    
    // Close button (editing mode)
    const closeBtn = this.overlay.querySelector(".cc-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.hide());
    }
  }
  
  /**
   * Update active state of buttons
   */
  updateActiveButtons(selector, activeIndex) {
    const container = this.overlay.querySelector(selector);
    container.querySelectorAll("button").forEach((btn, i) => {
      btn.classList.toggle("active", parseInt(btn.dataset.index, 10) === activeIndex);
    });
  }
  
  /**
   * Update the preview canvas
   */
  updatePreview() {
    const ctx = this.previewCtx;
    const canvas = this.previewCanvas;
    const options = characterManager.getOptions();
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Center point
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.65;
    
    // Get colors
    const skinColor = options.skinTones[this.currentSkinTone]?.color ?? 0xFFE4C4;
    const hairColor = options.hairColors[this.currentHairColor]?.color ?? 0x4A3728;
    const skinHex = "#" + skinColor.toString(16).padStart(6, "0");
    const hairHex = "#" + hairColor.toString(16).padStart(6, "0");
    
    // Scale for preview
    const scale = 2.5;
    
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 60 * scale, 20 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    ctx.fillStyle = skinHex;
    ctx.beginPath();
    ctx.roundRect(cx - 14 * scale, cy - 30 * scale, 28 * scale, 35 * scale, 8);
    ctx.fill();
    
    // Dress
    ctx.fillStyle = "#FF6B9D";
    ctx.beginPath();
    ctx.roundRect(cx - 16 * scale, cy, 32 * scale, 40 * scale, 4);
    ctx.fill();
    
    // Legs
    ctx.fillStyle = skinHex;
    ctx.fillRect(cx - 8 * scale, cy + 35 * scale, 6 * scale, 20 * scale);
    ctx.fillRect(cx + 2 * scale, cy + 35 * scale, 6 * scale, 20 * scale);
    
    // Head
    ctx.fillStyle = skinHex;
    ctx.beginPath();
    ctx.arc(cx, cy - 45 * scale, 18 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair
    ctx.fillStyle = hairHex;
    const hairStyle = this.currentHairStyle;
    
    if (hairStyle === 0) {
      // Short hair
      ctx.beginPath();
      ctx.ellipse(cx, cy - 55 * scale, 20 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (hairStyle === 1) {
      // Long hair
      ctx.beginPath();
      ctx.ellipse(cx, cy - 55 * scale, 22 * scale, 14 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      // Hair sides
      ctx.fillRect(cx - 22 * scale, cy - 50 * scale, 8 * scale, 55 * scale);
      ctx.fillRect(cx + 14 * scale, cy - 50 * scale, 8 * scale, 55 * scale);
    } else if (hairStyle === 2) {
      // Ponytail
      ctx.beginPath();
      ctx.ellipse(cx, cy - 55 * scale, 20 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      // Ponytail
      ctx.beginPath();
      ctx.ellipse(cx, cy - 75 * scale, 8 * scale, 20 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Eyes
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx - 6 * scale, cy - 45 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 6 * scale, cy - 45 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Blush
    ctx.fillStyle = "rgba(255, 150, 150, 0.4)";
    ctx.beginPath();
    ctx.ellipse(cx - 10 * scale, cy - 40 * scale, 4 * scale, 2 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 10 * scale, cy - 40 * scale, 4 * scale, 2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth
    ctx.strokeStyle = "#C77";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 38 * scale, 3 * scale, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
    
    // Name
    ctx.fillStyle = "#FFF";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.strokeText(this.currentName || "Player", cx, 30);
    ctx.fillText(this.currentName || "Player", cx, 30);
  }
  
  /**
   * Save character and close
   */
  saveAndClose() {
    characterManager.createCharacter({
      name: this.currentName || "Player",
      skinTone: this.currentSkinTone,
      hairStyle: this.currentHairStyle,
      hairColor: this.currentHairColor
    });
    
    this.hide();
    this.onComplete();
  }
}

/**
 * Show character creator and return promise
 */
export function showCharacterCreator(options = {}) {
  return new Promise((resolve) => {
    const creator = new CharacterCreator({
      ...options,
      onComplete: () => resolve(characterManager.getCharacter())
    });
    creator.show();
  });
}
