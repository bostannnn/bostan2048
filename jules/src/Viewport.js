import { Container, Rectangle } from 'pixi.js';

export class Viewport extends Container {
    constructor(app) {
        super();
        this.app = app;
        
        this.eventMode = 'static';
        // Use a very large hit area so we can drag empty space
        this.hitArea = new Rectangle(-50000, -50000, 100000, 100000);

        this.dragging = false;
        this.lastPosition = null;
        
        // Multitouch
        this.pointers = new Map();
        this.initialPinchDist = null;
        this.initialScale = 1;

        this.on('pointerdown', this.onPointerDown, this);
        this.on('pointerup', this.onPointerUp, this);
        this.on('pointerupoutside', this.onPointerUp, this);
        this.on('pointermove', this.onPointerMove, this);
        // this.app.view.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        // In Pixi v8 we can listen to wheel on container if eventMode is static
        this.on('wheel', this.onWheel, this);
    }

    onPointerDown(event) {
        this.pointers.set(event.pointerId, event.global.clone());
        if (this.pointers.size === 1) {
             this.dragging = true;
             this.lastPosition = event.global.clone();
        } else if (this.pointers.size === 2) {
             this.dragging = false; // Switch to zoom
             this.initialPinchDist = this.getPinchDist();
             this.initialScale = this.scale.x;
        }
    }

    onPointerUp(event) {
        this.pointers.delete(event.pointerId);
        if (this.pointers.size < 2) {
            this.initialPinchDist = null;
        }
        if (this.pointers.size === 1) {
            this.dragging = true;
            // Update lastPosition to the remaining pointer
            const p = this.pointers.values().next().value;
            this.lastPosition = p.clone();
        } else if (this.pointers.size === 0) {
            this.dragging = false;
        }
    }

    onPointerMove(event) {
        if (!this.pointers.has(event.pointerId)) return;
        this.pointers.set(event.pointerId, event.global.clone());

        if (this.pointers.size === 2) {
            // Pinch
            const currentDist = this.getPinchDist();
            if (this.initialPinchDist) {
                const scale = (currentDist / this.initialPinchDist) * this.initialScale;
                // Clamp scale
                const newScale = Math.max(0.1, Math.min(scale, 5));
                this.scale.set(newScale);
            }
        } else if (this.dragging && this.pointers.size === 1) {
            const newPosition = this.pointers.get(event.pointerId);
            const dx = newPosition.x - this.lastPosition.x;
            const dy = newPosition.y - this.lastPosition.y;
            
            this.position.x += dx;
            this.position.y += dy;
            
            this.lastPosition = newPosition.clone();
        }
    }

    getPinchDist() {
        const points = Array.from(this.pointers.values());
        const p1 = points[0];
        const p2 = points[1];
        return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }

    onWheel(event) {
        event.preventDefault();
        const zoomFactor = 0.999; // Smooth zoom
        // event.deltaY is usually around 100 or -100
        const scaleChange = Math.pow(zoomFactor, event.deltaY);
        
        const worldPos = this.toLocal(event.global);
        
        let newScale = this.scale.x * scaleChange;
        newScale = Math.max(0.1, Math.min(newScale, 5));
        
        this.scale.set(newScale);
        
        const newWorldPos = this.toGlobal(worldPos);
        this.position.x += event.global.x - newWorldPos.x;
        this.position.y += event.global.y - newWorldPos.y;
    }
}
