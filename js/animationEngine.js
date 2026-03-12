/**
 * Animation Engine - Manages scroll-based and background animations
 * Handles performance monitoring and accessibility compliance
 */
class AnimationEngine {
    constructor(options = {}) {
        this.options = {
            performanceThreshold: 30, // minimum FPS
            reducedMotionQuery: '(prefers-reduced-motion: reduce)',
            scrollThreshold: 0.1,
            ...options
        };
        
        this.scrollObserver = null;
        this.backgroundAnimations = new Map();
        this.scrollTriggers = new Map();
        this.activeAnimations = new Set();
        this.performanceMonitor = new PerformanceMonitor();
        this.reducedMotion = window.matchMedia(this.options.reducedMotionQuery).matches;
        
        this.init();
    }
    
    init() {
        this.setupScrollObserver();
        this.setupReducedMotionListener();
        this.setupPerformanceMonitoring();
    }
    
    setupScrollObserver() {
        this.scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const trigger = this.scrollTriggers.get(entry.target);
                if (trigger && entry.isIntersecting) {
                    this.executeScrollAnimation(entry.target, trigger);
                }
            });
        }, {
            threshold: this.options.scrollThreshold,
            rootMargin: '50px'
        });
    }
    
    setupReducedMotionListener() {
        const mediaQuery = window.matchMedia(this.options.reducedMotionQuery);
        mediaQuery.addEventListener('change', (e) => {
            this.reducedMotion = e.matches;
            if (this.reducedMotion) {
                this.pauseAnimations();
            }
        });
    }
    
    setupPerformanceMonitoring() {
        this.performanceMonitor.onPerformanceDrop((fps) => {
            if (fps < this.options.performanceThreshold) {
                this.reduceAnimationComplexity();
            }
        });
    }
    
    registerScrollTrigger(element, animationConfig) {
        if (!element || this.reducedMotion) return;
        
        this.scrollTriggers.set(element, animationConfig);
        this.scrollObserver.observe(element);
    }
    
    registerBackgroundAnimation(element, animationConfig) {
        if (!element || this.reducedMotion) return;
        
        this.backgroundAnimations.set(element, animationConfig);
    }
    
    executeScrollAnimation(element, config) {
        if (this.reducedMotion) return;
        
        const animation = element.animate(config.keyframes, {
            duration: config.duration || 800,
            easing: config.easing || 'ease-out',
            delay: config.delay || 0,
            fill: 'forwards'
        });
        
        this.activeAnimations.add(animation);
        
        animation.addEventListener('finish', () => {
            this.activeAnimations.delete(animation);
        });
        
        return animation;
    }
    
    startBackgroundAnimations() {
        if (this.reducedMotion) return;
        
        this.backgroundAnimations.forEach((config, element) => {
            const animation = element.animate(config.keyframes, {
                duration: config.duration || 3000,
                easing: config.easing || 'ease-in-out',
                iterations: config.iterations || Infinity,
                direction: config.direction || 'alternate'
            });
            
            this.activeAnimations.add(animation);
        });
    }
    
    pauseAnimations() {
        this.activeAnimations.forEach(animation => {
            animation.pause();
        });
    }
    
    resumeAnimations() {
        if (this.reducedMotion) return;
        
        this.activeAnimations.forEach(animation => {
            animation.play();
        });
    }
    
    reduceAnimationComplexity() {
        // Reduce animation complexity for performance
        this.backgroundAnimations.forEach((config, element) => {
            if (config.complexity && config.complexity > 1) {
                config.complexity = Math.max(1, config.complexity * 0.7);
            }
        });
    }
    
    respectReducedMotion() {
        return this.reducedMotion;
    }
    
    destroy() {
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
        }
        
        this.activeAnimations.forEach(animation => {
            animation.cancel();
        });
        
        this.performanceMonitor.destroy();
    }
}

/**
 * Performance Monitor - Tracks animation performance and FPS
 */
class PerformanceMonitor {
    constructor() {
        this.fps = 60;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.callbacks = [];
        this.monitoring = false;
    }
    
    start() {
        if (this.monitoring) return;
        
        this.monitoring = true;
        this.measureFPS();
    }
    
    measureFPS() {
        if (!this.monitoring) return;
        
        const currentTime = performance.now();
        this.frameCount++;
        
        if (currentTime - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            this.callbacks.forEach(callback => callback(this.fps));
        }
        
        requestAnimationFrame(() => this.measureFPS());
    }
    
    onPerformanceDrop(callback) {
        this.callbacks.push(callback);
    }
    
    getFPS() {
        return this.fps;
    }
    
    destroy() {
        this.monitoring = false;
        this.callbacks = [];
    }
}

export { AnimationEngine, PerformanceMonitor };