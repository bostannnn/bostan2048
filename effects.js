class EffectManager {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.resize();

        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '999';
        this.container.appendChild(this.canvas);

        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
    }

    explode(element, value) {
        const rect = element.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        const x = rect.left - containerRect.left + rect.width / 2;
        const y = rect.top - containerRect.top + rect.height / 2;

        this.createParticles(x, y, value);
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

        requestAnimationFrame(() => this.animate());
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