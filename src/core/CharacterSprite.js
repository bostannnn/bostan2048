/**
 * CharacterSprite - PixiJS visual representation of the player character
 * 
 * Creates a layered character sprite that can walk around the city.
 * Currently uses simple shapes; can be upgraded to DragonBones later.
 */

import { Container, Graphics, Text } from "pixi.js";
import gsap from "gsap";

// Character dimensions for isometric view
const CHAR_WIDTH = 32;
const CHAR_HEIGHT = 48;

// Animation states
const ANIM_IDLE = "idle";
const ANIM_WALK = "walk";

// Direction angles for 8-directional movement
const DIRECTIONS = {
  down: 0,
  downLeft: 1,
  left: 2,
  upLeft: 3,
  up: 4,
  upRight: 5,
  right: 6,
  downRight: 7
};

export class CharacterSprite extends Container {
  constructor(characterManager) {
    super();
    
    this.characterManager = characterManager;
    this.animState = ANIM_IDLE;
    this.direction = DIRECTIONS.down;
    this.walkTween = null;
    this.idleBob = null;
    
    // Grid position (not screen position)
    this.gridX = 32;
    this.gridY = 32;
    
    // Target for walking
    this.targetX = null;
    this.targetY = null;
    this.isWalking = false;
    this.walkSpeed = 3; // Grid cells per second
    
    // Build the visual
    this.buildSprite();
    
    // Subscribe to character changes
    if (this.characterManager) {
      this.unsubscribe = this.characterManager.subscribe(() => this.updateAppearance());
      
      // Set initial position from saved data
      const char = this.characterManager.getCharacter();
      if (char.position) {
        this.gridX = char.position.x;
        this.gridY = char.position.y;
      }
    }
    
    // Start idle animation
    this.startIdleAnimation();
  }
  
  /**
   * Build the character visual using simple shapes
   * Will be replaced with DragonBones armature when available
   */
  buildSprite() {
    // Clear existing
    this.removeChildren();
    
    // Shadow
    this.shadow = new Graphics();
    this.shadow.beginFill(0x000000, 0.3);
    this.shadow.drawEllipse(0, 0, CHAR_WIDTH * 0.4, CHAR_WIDTH * 0.15);
    this.shadow.endFill();
    this.shadow.y = -2;
    this.addChild(this.shadow);
    
    // Body container (for animation)
    this.bodyContainer = new Container();
    this.addChild(this.bodyContainer);
    
    // Get colors from character manager
    const skinColor = this.characterManager?.getSkinColor() ?? 0xFFE4C4;
    const hairColor = this.characterManager?.getHairColor() ?? 0x4A3728;
    
    // Body (simple oval)
    this.body = new Graphics();
    this.body.beginFill(skinColor);
    this.body.drawRoundedRect(-CHAR_WIDTH * 0.35, -CHAR_HEIGHT * 0.6, CHAR_WIDTH * 0.7, CHAR_HEIGHT * 0.45, 8);
    this.body.endFill();
    
    // Simple dress/clothes
    this.clothes = new Graphics();
    this.clothes.beginFill(0xFF6B9D); // Pink dress default
    this.clothes.drawRoundedRect(-CHAR_WIDTH * 0.4, -CHAR_HEIGHT * 0.35, CHAR_WIDTH * 0.8, CHAR_HEIGHT * 0.4, 4);
    this.clothes.endFill();
    
    // Head
    this.head = new Graphics();
    this.head.beginFill(skinColor);
    this.head.drawCircle(0, -CHAR_HEIGHT * 0.75, CHAR_WIDTH * 0.3);
    this.head.endFill();
    
    // Hair
    this.hair = new Graphics();
    this.hair.beginFill(hairColor);
    this.hair.drawEllipse(0, -CHAR_HEIGHT * 0.82, CHAR_WIDTH * 0.35, CHAR_WIDTH * 0.25);
    this.hair.endFill();
    
    // Eyes
    this.eyes = new Graphics();
    this.eyes.beginFill(0x000000);
    this.eyes.drawCircle(-6, -CHAR_HEIGHT * 0.75, 2);
    this.eyes.drawCircle(6, -CHAR_HEIGHT * 0.75, 2);
    this.eyes.endFill();
    
    // Add in order (back to front)
    this.bodyContainer.addChild(this.body);
    this.bodyContainer.addChild(this.clothes);
    this.bodyContainer.addChild(this.head);
    this.bodyContainer.addChild(this.hair);
    this.bodyContainer.addChild(this.eyes);
    
    // Name label (optional)
    const charData = this.characterManager?.getCharacter();
    if (charData?.name) {
      this.nameLabel = new Text(charData.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: 10,
        fill: 0xFFFFFF,
        stroke: 0x000000,
        strokeThickness: 2,
        align: "center"
      });
      this.nameLabel.anchor.set(0.5);
      this.nameLabel.y = -CHAR_HEIGHT - 8;
      this.addChild(this.nameLabel);
    }
  }
  
  /**
   * Update appearance from character manager
   */
  updateAppearance() {
    this.buildSprite();
    if (this.animState === ANIM_IDLE) {
      this.startIdleAnimation();
    }
  }
  
  /**
   * Start idle bobbing animation
   */
  startIdleAnimation() {
    this.stopAnimations();
    this.animState = ANIM_IDLE;
    
    this.idleBob = gsap.to(this.bodyContainer, {
      y: -3,
      duration: 0.8,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });
  }
  
  /**
   * Stop all animations
   */
  stopAnimations() {
    if (this.idleBob) {
      this.idleBob.kill();
      this.idleBob = null;
    }
    if (this.walkTween) {
      this.walkTween.kill();
      this.walkTween = null;
    }
    if (this.bodyContainer) {
      this.bodyContainer.y = 0;
    }
  }
  
  /**
   * Walk to a grid position
   * @param {number} targetX - Target grid X
   * @param {number} targetY - Target grid Y
   * @param {Function} gridToScreen - Function to convert grid to screen coords
   * @param {Function} onComplete - Callback when walk completes
   */
  walkTo(targetX, targetY, gridToScreen, onComplete) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.isWalking = true;
    this.animState = ANIM_WALK;
    
    // Calculate distance
    const dx = targetX - this.gridX;
    const dy = targetY - this.gridY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate direction
    this.updateDirection(dx, dy);
    
    // Duration based on distance and walk speed
    const duration = distance / this.walkSpeed;
    
    // Stop idle animation, start walk animation
    this.stopAnimations();
    
    // Walking bob animation
    this.walkTween = gsap.to(this.bodyContainer, {
      y: -4,
      duration: 0.15,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });
    
    // Get screen positions
    const startScreen = gridToScreen(this.gridX, this.gridY);
    const endScreen = gridToScreen(targetX, targetY);
    
    // Move the sprite
    gsap.to(this, {
      x: endScreen.x,
      y: endScreen.y,
      duration: duration,
      ease: "none",
      onComplete: () => {
        this.gridX = targetX;
        this.gridY = targetY;
        this.isWalking = false;
        this.startIdleAnimation();
        
        // Save position
        if (this.characterManager) {
          this.characterManager.setPosition(targetX, targetY);
        }
        
        if (onComplete) onComplete();
      }
    });
  }
  
  /**
   * Update facing direction based on movement delta
   */
  updateDirection(dx, dy) {
    // Simple 4-direction for now
    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = dx > 0 ? DIRECTIONS.right : DIRECTIONS.left;
      // Flip sprite for left/right
      this.bodyContainer.scale.x = dx > 0 ? 1 : -1;
    } else {
      this.direction = dy > 0 ? DIRECTIONS.down : DIRECTIONS.up;
    }
  }
  
  /**
   * Set position directly (no animation)
   */
  setGridPosition(x, y, gridToScreen) {
    this.gridX = x;
    this.gridY = y;
    const screen = gridToScreen(x, y);
    this.x = screen.x;
    this.y = screen.y;
  }
  
  /**
   * Get current grid position
   */
  getGridPosition() {
    return { x: this.gridX, y: this.gridY };
  }
  
  /**
   * Update zIndex based on position (for proper depth sorting)
   */
  updateZIndex() {
    this.zIndex = (this.gridX + this.gridY) * 10 + 5;
  }
  
  /**
   * Cleanup
   */
  destroy() {
    this.stopAnimations();
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    super.destroy({ children: true });
  }
}
