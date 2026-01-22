/**
 * CharacterManager - Handles player character customization and persistence
 * 
 * Manages:
 * - Character appearance (body, hair, clothes, accessories)
 * - Saving/loading character config to localStorage
 * - Wardrobe inventory integration
 * 
 * Future: DragonBones skeleton loading and animation
 */

const STORAGE_KEY = "arcadeCityCharacter";

const DEFAULT_CHARACTER = {
  name: "Player",
  skinTone: 0,        // Index into skin tone palette
  hairStyle: 0,       // Hair style ID
  hairColor: 0,       // Hair color index
  outfit: {
    top: null,        // Clothing item IDs from inventory
    bottom: null,
    shoes: null,
    accessory: null
  },
  position: { x: 32, y: 32 }  // Grid position in city
};

// Available customization options
const CUSTOMIZATION_OPTIONS = {
  skinTones: [
    { id: 0, name: "Light", color: 0xFFE4C4 },
    { id: 1, name: "Fair", color: 0xFFDBC4 },
    { id: 2, name: "Medium", color: 0xD4A574 },
    { id: 3, name: "Tan", color: 0xC68642 },
    { id: 4, name: "Brown", color: 0x8D5524 },
    { id: 5, name: "Dark", color: 0x5C4033 }
  ],
  hairColors: [
    { id: 0, name: "Black", color: 0x1A1A1A },
    { id: 1, name: "Brown", color: 0x4A3728 },
    { id: 2, name: "Blonde", color: 0xE6BE8A },
    { id: 3, name: "Red", color: 0x8B4513 },
    { id: 4, name: "Pink", color: 0xFF69B4 },
    { id: 5, name: "Blue", color: 0x4169E1 },
    { id: 6, name: "White", color: 0xF5F5F5 }
  ],
  hairStyles: [
    { id: 0, name: "Short", asset: null },
    { id: 1, name: "Long", asset: "2010600a" },
    { id: 2, name: "Ponytail", asset: "20106010" }
  ]
};

export class CharacterManager {
  constructor() {
    this.character = null;
    this.listeners = new Set();
    this.isCreated = false;
    this.load();
  }

  /**
   * Load character from localStorage
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.character = { ...DEFAULT_CHARACTER, ...parsed };
        this.isCreated = true;
      } else {
        this.character = { ...DEFAULT_CHARACTER };
        this.isCreated = false;
      }
    } catch (error) {
      console.warn("CharacterManager: Failed to load character", error);
      this.character = { ...DEFAULT_CHARACTER };
      this.isCreated = false;
    }
  }

  /**
   * Save character to localStorage
   */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.character));
      this.isCreated = true;
    } catch (error) {
      console.warn("CharacterManager: Failed to save character", error);
    }
  }

  /**
   * Check if a character has been created
   */
  hasCharacter() {
    return this.isCreated;
  }

  /**
   * Get current character data
   */
  getCharacter() {
    return { ...this.character };
  }

  /**
   * Update character properties
   */
  updateCharacter(updates) {
    this.character = { ...this.character, ...updates };
    this.save();
    this.notify();
  }

  /**
   * Set character name
   */
  setName(name) {
    this.updateCharacter({ name: String(name).slice(0, 20) });
  }

  /**
   * Set skin tone by index
   */
  setSkinTone(index) {
    const valid = Math.max(0, Math.min(index, CUSTOMIZATION_OPTIONS.skinTones.length - 1));
    this.updateCharacter({ skinTone: valid });
  }

  /**
   * Set hair style by index
   */
  setHairStyle(index) {
    const valid = Math.max(0, Math.min(index, CUSTOMIZATION_OPTIONS.hairStyles.length - 1));
    this.updateCharacter({ hairStyle: valid });
  }

  /**
   * Set hair color by index
   */
  setHairColor(index) {
    const valid = Math.max(0, Math.min(index, CUSTOMIZATION_OPTIONS.hairColors.length - 1));
    this.updateCharacter({ hairColor: valid });
  }

  /**
   * Set outfit piece
   */
  setOutfitPiece(slot, itemId) {
    const validSlots = ["top", "bottom", "shoes", "accessory"];
    if (!validSlots.includes(slot)) return;
    
    const outfit = { ...this.character.outfit, [slot]: itemId };
    this.updateCharacter({ outfit });
  }

  /**
   * Update character position in city
   */
  setPosition(x, y) {
    this.updateCharacter({ position: { x, y } });
  }

  /**
   * Get customization options
   */
  getOptions() {
    return CUSTOMIZATION_OPTIONS;
  }

  /**
   * Get current skin tone color
   */
  getSkinColor() {
    const tone = CUSTOMIZATION_OPTIONS.skinTones[this.character.skinTone];
    return tone ? tone.color : 0xFFE4C4;
  }

  /**
   * Get current hair color
   */
  getHairColor() {
    const color = CUSTOMIZATION_OPTIONS.hairColors[this.character.hairColor];
    return color ? color.color : 0x1A1A1A;
  }

  /**
   * Get current hair style asset ID
   */
  getHairAsset() {
    const style = CUSTOMIZATION_OPTIONS.hairStyles[this.character.hairStyle];
    return style ? style.asset : null;
  }

  /**
   * Reset character to default
   */
  reset() {
    this.character = { ...DEFAULT_CHARACTER };
    this.isCreated = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Ignore
    }
    this.notify();
  }

  /**
   * Subscribe to character changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners of changes
   */
  notify() {
    const data = this.getCharacter();
    this.listeners.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.warn("CharacterManager: Listener error", error);
      }
    });
  }

  /**
   * Create initial character (called after character creator is complete)
   */
  createCharacter(config) {
    this.character = { ...DEFAULT_CHARACTER, ...config };
    this.save();
    this.notify();
  }
}

// Singleton instance
export const characterManager = new CharacterManager();
