import { Container, Graphics, Sprite, Text, Assets } from 'pixi.js';
import gsap from 'gsap';

export class PixiRenderer {
    constructor(container, logic) {
        this.container = container;
        this.logic = logic;
        
        this.tileSize = 100;
        this.padding = 10;
        
        this.gridContainer = new Container();
        this.container.addChild(this.gridContainer);
        
        this.centerGrid();

        this.sprites = {}; // Map of tile ID to Sprite/Container
        this.tileLayer = new Container();
    }
    
    centerGrid() {
         const gridWidth = (this.tileSize + this.padding) * 4 + this.padding;
         this.gridContainer.position.set(
            (window.innerWidth - gridWidth) / 2,
            (window.innerHeight - gridWidth) / 2
        );
    }
    
    resize() {
        this.centerGrid();
    }

    drawBackground() {
        this.gridContainer.removeChildren();
        
        const bg = new Graphics();
        const fullSize = (this.tileSize + this.padding) * 4 + this.padding;
        bg.roundRect(0, 0, fullSize, fullSize, 10);
        bg.fill(0xbbada0);
        
        this.gridContainer.addChild(bg);
        
        for(let x=0; x<4; x++) {
            for(let y=0; y<4; y++) {
                const cell = new Graphics();
                const pos = this.getPosition(x, y);
                cell.roundRect(pos.x, pos.y, this.tileSize, this.tileSize, 5);
                cell.fill(0xcdc1b4);
                this.gridContainer.addChild(cell);
            }
        }
        
        this.tileLayer = new Container();
        this.gridContainer.addChild(this.tileLayer);
        this.sprites = {};
    }

    getPosition(x, y) {
        return {
            x: this.padding + x * (this.tileSize + this.padding),
            y: this.padding + y * (this.tileSize + this.padding)
        };
    }
    
    update(grid) {
        const toRemove = new Set(Object.keys(this.sprites));
        
        grid.eachCell((x, y, tile) => {
            if (tile) {
                if (this.sprites[tile._id]) {
                    toRemove.delete(tile._id);
                    this.updateTile(tile);
                } else {
                    this.addTile(tile, toRemove);
                }
            }
        });
        
        toRemove.forEach(id => {
            const sprite = this.sprites[id];
            sprite.destroy();
            delete this.sprites[id];
        });
    }

    addTile(tile, toRemove) {
        const container = new Container();
        
        // Background/Image
        let bg;
        // Check if asset is loaded
        const texture = Assets.get(String(tile.value));
        if (texture) {
             bg = new Sprite(texture);
             bg.width = this.tileSize;
             bg.height = this.tileSize;
        } else {
             bg = new Graphics();
             bg.roundRect(0,0,this.tileSize, this.tileSize, 5);
             bg.fill(0xeee4da);
             
             const text = new Text({ text: String(tile.value), style: { fontSize: 40, fill: 0x776e65 } });
             text.anchor.set(0.5);
             text.position.set(this.tileSize/2, this.tileSize/2);
             bg.addChild(text);
        }
        
        container.addChild(bg);
        
        this.tileLayer.addChild(container);
        this.sprites[tile._id] = container;
        
        const dest = this.getPosition(tile.x, tile.y);
        
        if (tile.previousPosition) {
            const src = this.getPosition(tile.previousPosition.x, tile.previousPosition.y);
            container.position.set(src.x, src.y);
            gsap.to(container.position, { x: dest.x, y: dest.y, duration: 0.1 });
        } else if (tile.mergedFrom) {
             container.position.set(dest.x, dest.y);
             container.scale.set(0);
             gsap.to(container.scale, { x: 1, y: 1, duration: 0.2, ease: "back.out(1.7)" });
             
             if (toRemove) {
                 tile.mergedFrom.forEach(merged => {
                     const sprite = this.sprites[merged._id];
                     if (sprite) {
                         toRemove.delete(merged._id);
                         delete this.sprites[merged._id]; 
                         
                         // Keep it in layer but behind new tile
                         this.tileLayer.setChildIndex(sprite, 0);

                         gsap.to(sprite.position, { x: dest.x, y: dest.y, duration: 0.1, onComplete: () => {
                             sprite.destroy();
                         }});
                     }
                 });
             }
        } else {
             // New tile appear
             container.position.set(dest.x, dest.y);
             container.scale.set(0);
             gsap.to(container.scale, { x: 1, y: 1, duration: 0.2 });
        }
    }

    updateTile(tile) {
        const sprite = this.sprites[tile._id];
        const dest = this.getPosition(tile.x, tile.y);
        gsap.to(sprite.position, { x: dest.x, y: dest.y, duration: 0.1 });
    }
}
