/**
 * Background Animation System - Creates aesthetic background effects
 * Includes particle system, gradient animations, and parallax effects
 */
class BackgroundAnimationSystem {
    constructor(container = document.body, options = {}) {
        this.container = container || document.body;
        this.options = {
            particleCount: 50,
            particleSpeed: 0.5,
            gradientDuration: 8000,
            parallaxIntensity: 0.3,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            ...options
        };
        
        this.particles = [];
        this.gradientElement = null;
        this.parallaxElements = [];
        this.animationFrame = null;
        this.canvas = null;
        this.ctx = null;
        
        // Initialize immediately
        this.init();
    }
    
    init() {
        if (this.options.reducedMotion) {
            this.createStaticBackground();
            return;
        }
        
        this.createParticleSystem();
        this.createGradientAnimation();
        this.setupParallaxElements();
        this.startAnimationLoop();
    }
    
    createParticleSystem() {
        // Ensure we have a valid container
        if (!this.container) {
            console.warn('No container provided for BackgroundAnimationSystem');
            return;
        }
        
        const canvas = document.createElement('canvas');
        canvas.className = 'background-particles';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -2;
            opacity: 0.6;
        `;
        
        try {
            this.container.appendChild(canvas);
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            
            this.resizeCanvas();
            this.initializeParticles();
            
            window.addEventListener('resize', () => this.resizeCanvas());
        } catch (error) {
            console.error('Failed to create particle system:', error);
        }
    }
    
    resizeCanvas() {
        if (!this.canvas) return;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    initializeParticles() {
        if (!this.canvas) return;
        
        this.particles = [];
        
        for (let i = 0; i < this.options.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * this.options.particleSpeed,
                vy: (Math.random() - 0.5) * this.options.particleSpeed,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.5 + 0.2,
                color: this.getParticleColor()
            });
        }
    }
    
    getParticleColor() {
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    updateParticles() {
        if (!this.canvas) return;
        
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Wrap around screen edges
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
        });
    }
    
    drawParticles() {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fill();
        });
        
        this.ctx.globalAlpha = 1;
    }
    
    createGradientAnimation() {
        if (!this.container) return;
        
        this.gradientElement = document.createElement('div');
        this.gradientElement.className = 'background-gradient';
        this.gradientElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -3;
            background: linear-gradient(45deg, #667eea, #764ba2, #f093fb, #f5576c, #4facfe);
            background-size: 400% 400%;
            animation: gradientShift ${this.options.gradientDuration}ms ease-in-out infinite;
        `;
        
        try {
            this.container.appendChild(this.gradientElement);
            
            // Add CSS animation keyframes
            if (!document.querySelector('#gradient-keyframes')) {
                const style = document.createElement('style');
                style.id = 'gradient-keyframes';
                style.textContent = `
                    @keyframes gradientShift {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                `;
                document.head.appendChild(style);
            }
        } catch (error) {
            console.error('Failed to create gradient animation:', error);
        }
    }
    
    setupParallaxElements() {
        this.parallaxElements = document.querySelectorAll('[data-parallax]');
        
        window.addEventListener('scroll', () => {
            if (this.options.reducedMotion) return;
            
            const scrollY = window.pageYOffset;
            
            this.parallaxElements.forEach(element => {
                const speed = parseFloat(element.dataset.parallax) || this.options.parallaxIntensity;
                const yPos = -(scrollY * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });
        });
    }
    
    createStaticBackground() {
        if (!this.container) return;
        
        // Create a static gradient background for reduced motion users
        const staticBg = document.createElement('div');
        staticBg.className = 'background-static';
        staticBg.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -3;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            opacity: 0.8;
        `;
        
        try {
            this.container.appendChild(staticBg);
        } catch (error) {
            console.error('Failed to create static background:', error);
        }
    }
    
    startAnimationLoop() {
        if (this.options.reducedMotion) return;
        
        const animate = () => {
            this.updateParticles();
            this.drawParticles();
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    pause() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        if (this.gradientElement) {
            this.gradientElement.style.animationPlayState = 'paused';
        }
    }
    
    resume() {
        if (this.options.reducedMotion) return;
        
        if (!this.animationFrame) {
            this.startAnimationLoop();
        }
        
        if (this.gradientElement) {
            this.gradientElement.style.animationPlayState = 'running';
        }
    }
    
    updateParticleCount(count) {
        this.options.particleCount = count;
        this.initializeParticles();
    }
    
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        if (this.canvas) {
            this.canvas.remove();
        }
        
        if (this.gradientElement) {
            this.gradientElement.remove();
        }
        
        window.removeEventListener('resize', this.resizeCanvas);
        window.removeEventListener('scroll', this.handleParallax);
    }
}

export { BackgroundAnimationSystem };