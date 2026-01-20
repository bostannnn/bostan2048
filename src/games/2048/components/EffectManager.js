export class EffectManager {
        constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            this.disabled = true;
            return;
        }
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.running = false;
        this.frameId = null;
        this.resize();

        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '999';
        this.container.appendChild(this.canvas);

        this.handleResize = () => this.resize();
        window.addEventListener('resize', this.handleResize);
        this.animate = this.animate.bind(this);
        this.start();
    }

    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
    }

    explode(element, value) {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        const x = rect.left - containerRect.left + rect.width / 2;
        const y = rect.top - containerRect.top + rect.height / 2;

        this.explodeAt(x, y, value);
    }

    explodeAt(x, y, value) {
        this.createParticles(x, y, value);
    }

    start() {
        if (this.disabled || this.running) return;
        this.running = true;
        this.frameId = requestAnimationFrame(this.animate);
    }

    stop() {
        this.running = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    rewind() {
        const x = this.canvas.width / 2;
        const y = this.canvas.height / 2;
        const radius = Math.min(this.canvas.width, this.canvas.height) * 0.55;
        const palette = ['#ffffff', '#e0c3fc', '#8ec5fc', '#f6d365', '#fda085'];
        const count = Math.min(200, Math.floor(radius * 0.6));

        this.particles.push(new RewindRing(x, y, radius, '#ffffff'));
        this.particles.push(new RewindRing(x, y, radius * 0.75, '#e0c3fc'));
        this.particles.push(new ClockRing(x, y, radius * 0.9, '#ffffff'));
        this.particles.push(new ClockRing(x, y, radius * 0.65, '#8ec5fc', 36));
        this.particles.push(new ClockHand(x, y, radius * 0.55, 4, '#ffffff', -0.18));
        this.particles.push(new ClockHand(x, y, radius * 0.4, 6, '#f6d365', -0.12));

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const ringRadius = radius * (0.6 + Math.random() * 0.4);
            const color = palette[i % palette.length];
            this.particles.push(new RewindParticle(x, y, angle, ringRadius, color));
        }
    }

    createParticles(x, y, value) {
        const tier = Math.max(1, Math.log2(value));
        let count = Math.floor(tier * 10); 
        let speedMultiplier = 0.8 + (tier / 8);
        let color = this.getColorForValue(value);
        let sparkleChance = 0;
        
        // Progressive Tiers
        
        // Tier 1 (128+): Single Shockwave
        if (value >= 128) {
             this.particles.push(new Shockwave(x, y, color));
        }

        // Tier 2 (512+): Sparkles introduced, Double Shockwave
        if (value >= 512) {
             count += 20;
             sparkleChance = 0.3; // 30% sparkles
             this.particles.push(new Shockwave(x, y, color, 10)); // 10 frame delay
        }

        // Tier 3 (2048+): Triple Shockwave, Faster, More particles
        if (value >= 2048) {
             count += 40;
             speedMultiplier += 1.0;
             sparkleChance = 0.6; // 60% sparkles
             this.particles.push(new Shockwave(x, y, '#ffffff', 20)); // White shockwave
        }
        
        // Tier 4 (8192+): MAX POWER
        if (value >= 8192) {
            count += 60;
            speedMultiplier += 2.0;
            this.particles.push(new Shockwave(x, y, color, 5));
            this.particles.push(new Shockwave(x, y, color, 15));
            this.particles.push(new Shockwave(x, y, '#ffffff', 30));
        }

        for (let i = 0; i < count; i++) {
            if (Math.random() < sparkleChance) {
                this.particles.push(new Sparkle(x, y, color, speedMultiplier));
            } else {
                this.particles.push(new Particle(x, y, color, speedMultiplier));
            }
        }
    }

    getColorForValue(value) {
        const colors = {
            2: '#eee4da',
            4: '#ede0c8',
            8: '#f2b179',
            16: '#f59563',
            32: '#f67c5f',
            64: '#f65e3b',
            128: '#edcf72',
            256: '#edcc61',
            512: '#edc850',
            1024: '#edc53f',
            2048: '#edc22e',
            4096: '#3e3933',
        };
        return colors[value] || '#ffffff';
    }

    animate() {
        if (!this.running) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = 'lighter';

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update();
            p.draw(this.ctx);
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        this.ctx.globalCompositeOperation = 'source-over';

        this.frameId = requestAnimationFrame(this.animate);
    }

    destroy() {
        this.stop();
        if (this.handleResize) {
            window.removeEventListener('resize', this.handleResize);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

class Particle {
    constructor(x, y, color, speedMultiplier) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 3 + 2) * speedMultiplier;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.size = Math.random() * 4 + 2;
        this.gravity = 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
        this.size *= 0.95; 
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class Sparkle extends Particle {
    constructor(x, y, color, speedMultiplier) {
        super(x, y, color, speedMultiplier);
        this.decay = Math.random() * 0.01 + 0.005; // Lives longer
    }
    
    draw(ctx) {
        ctx.globalAlpha = this.life * (0.5 + Math.random() * 0.5); // Flicker
        ctx.fillStyle = '#ffffff'; // Sparkles are often white/bright
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Colored core
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
    }
}

class Shockwave {
    constructor(x, y, color, delay = 0) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 1;
        this.maxRadius = 100;
        this.life = 1.0;
        this.decay = 0.02;
        this.delay = delay;
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            return;
        }
        this.radius += 5;
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.delay > 0 || this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.lineWidth = 5;
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

class RewindParticle {
    constructor(x, y, angle, radius, color) {
        this.x = x + Math.cos(angle) * radius;
        this.y = y + Math.sin(angle) * radius;
        const inward = 2.5 + Math.random() * 2.5;
        const swirl = (Math.random() * 1.2 + 0.4) * (Math.random() < 0.5 ? -1 : 1);
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        this.vx = -dx * inward + -dy * swirl;
        this.vy = -dy * inward + dx * swirl;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.015;
        this.size = Math.random() * 3 + 1;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.size *= 0.97;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 2.5, this.y - this.vy * 2.5);
        ctx.stroke();
        ctx.restore();
    }
}

class RewindRing {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.life = 1.0;
        this.decay = 0.04;
    }

    update() {
        this.radius -= 8;
        this.life -= this.decay;
        if (this.radius <= 0) {
            this.life = 0;
        }
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.lineWidth = 6;
        ctx.strokeStyle = this.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

class ClockRing {
    constructor(x, y, radius, color, tickCount = 60) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.tickCount = tickCount;
        this.rotation = Math.random() * Math.PI * 2;
        this.spin = -(Math.random() * 0.08 + 0.06);
        this.life = 1.0;
        this.decay = 0.035;
    }

    update() {
        this.rotation += this.spin;
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.life * 0.9;
        ctx.strokeStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        for (let i = 0; i < this.tickCount; i++) {
            const isHour = i % Math.max(1, Math.round(this.tickCount / 12)) === 0;
            const tickLength = isHour ? 14 : 7;
            const tickWidth = isHour ? 3 : 2;
            ctx.lineWidth = tickWidth;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(0, -this.radius + tickLength);
            ctx.stroke();
            ctx.rotate((Math.PI * 2) / this.tickCount);
        }

        ctx.restore();
    }
}

class ClockHand {
    constructor(x, y, length, width, color, speed) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.width = width;
        this.color = color;
        this.rotation = Math.random() * Math.PI * 2;
        this.speed = speed;
        this.life = 1.0;
        this.decay = 0.04;
    }

    update() {
        this.rotation += this.speed;
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.life;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -this.length);
        ctx.stroke();
        ctx.restore();
    }
}
