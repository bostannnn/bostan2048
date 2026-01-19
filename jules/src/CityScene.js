import { Container, Graphics, Text } from 'pixi.js';
import { Viewport } from './Viewport.js';

export class CityScene {
    constructor(app, gameManager) {
        this.app = app;
        this.gameManager = gameManager;
        
        // Create viewport
        this.viewport = new Viewport(app);
        this.app.stage.addChild(this.viewport);
        
        // Add background
        const bg = new Graphics();
        bg.rect(-2000, -2000, 4000, 4000);
        bg.fill(0x333333); // Dark grey ground
        
        // Grid lines
        // Graphics API v8
        for (let x = -2000; x <= 2000; x += 100) {
            bg.moveTo(x, -2000).lineTo(x, 2000).stroke({ width: 2, color: 0x444444 });
        }
        for (let y = -2000; y <= 2000; y += 100) {
            bg.moveTo(-2000, y).lineTo(2000, y).stroke({ width: 2, color: 0x444444 });
        }
        
        this.viewport.addChild(bg);

        // Add dummy buildings
        this.addBuilding(0, 0, '2048 Center', 0x00AAFF);
        this.addBuilding(300, 100, 'Residential', 0x00FFAA);
        this.addBuilding(-200, -300, 'Factory', 0xFF00AA);
    }

    addBuilding(x, y, name, color) {
        // Create a simple building sprite/graphic
        const building = new Container();
        building.position.set(x, y);
        building.eventMode = 'static';
        building.cursor = 'pointer';

        const graphics = new Graphics();
        graphics.rect(-50, -50, 100, 100);
        graphics.fill(color);
        graphics.stroke({ width: 2, color: 0xFFFFFF });
        
        const label = new Text({ text: name, style: { fontSize: 16, fill: 0xFFFFFF, align: 'center' } });
        label.anchor.set(0.5);
        label.position.set(0, 60);

        building.addChild(graphics, label);
        
        building.on('pointertap', (e) => {
            // Check if we were dragging the viewport. If so, don't trigger click.
            // But pointertap is usually smart enough.
            // However, our viewport dragging logic might interfere.
            // Viewport uses pointermove.
            // Let's rely on pointertap.
            this.onBuildingClick(name);
        });

        this.viewport.addChild(building);
    }

    onBuildingClick(name) {
        console.log(`Clicked building: ${name}`);
        // Trigger event or callback
        if (name === '2048 Center') {
            this.gameManager.showPlayOverlay();
        }
    }

    pause() {
        this.viewport.visible = false;
        this.viewport.eventMode = 'none';
    }

    resume() {
        this.viewport.visible = true;
        this.viewport.eventMode = 'static';
    }
}
