/**
 * Property-Based Tests for Animation Engine
 * Tests universal animation behaviors and scroll triggers
 */

import { AnimationEngine } from '../js/animationEngine.js';

// Mock DOM environment for testing
const mockIntersectionObserver = class {
    constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.observedElements = new Set();
    }
    
    observe(element) {
        this.observedElements.add(element);
    }
    
    unobserve(element) {
        this.observedElements.delete(element);
    }
    
    disconnect() {
        this.observedElements.clear();
    }
    
    // Simulate intersection
    triggerIntersection(element, isIntersecting = true) {
        if (this.observedElements.has(element)) {
            this.callback([{
                target: element,
                isIntersecting,
                intersectionRatio: isIntersecting ? 0.5 : 0
            }]);
        }
    }
};

// Mock requestAnimationFrame
let animationFrameId = 0;
const mockRequestAnimationFrame = (callback) => {
    return setTimeout(callback, 16); // ~60fps
};

const mockCancelAnimationFrame = (id) => {
    clearTimeout(id);
};

// Setup test environment
beforeAll(() => {
    global.IntersectionObserver = mockIntersectionObserver;
    global.requestAnimationFrame = mockRequestAnimationFrame;
    global.cancelAnimationFrame = mockCancelAnimationFrame;
    global.matchMedia = jest.fn(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    }));
    global.performance = { now: () => Date.now() };
});

describe('Animation Engine Property Tests', () => {
    let animationEngine;
    let mockElement;
    
    beforeEach(() => {
        animationEngine = new AnimationEngine();
        mockElement = {
            animate: jest.fn(() => ({
                addEventListener: jest.fn(),
                pause: jest.fn(),
                play: jest.fn(),
                cancel: jest.fn()
            })),
            style: {},
            dataset: {}
        };
    });
    
    afterEach(() => {
        if (animationEngine) {
            animationEngine.destroy();
        }
    });
    
    /**
     * Property 2: Scroll-Based Animation Triggers
     * **Validates: Requirements 2.2, 6.1, 7.2, 10.2**
     * 
     * For any section that becomes visible during scroll, the Animation_Engine 
     * should trigger the appropriate entrance animations for that section's content elements.
     */
    describe('Property 2: Scroll-Based Animation Triggers', () => {
        const generateAnimationConfig = () => ({
            keyframes: [
                { opacity: 0, transform: 'translateY(20px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ],
            duration: Math.floor(Math.random() * 1000) + 200, // 200-1200ms
            easing: ['ease-in', 'ease-out', 'ease-in-out'][Math.floor(Math.random() * 3)],
            delay: Math.floor(Math.random() * 500) // 0-500ms delay
        });
        
        const generateElements = (count) => {
            return Array.from({ length: count }, (_, i) => ({
                ...mockElement,
                id: `element-${i}`,
                animate: jest.fn(() => ({
                    addEventListener: jest.fn((event, callback) => {
                        if (event === 'finish') {
                            setTimeout(callback, 100); // Simulate animation finish
                        }
                    }),
                    pause: jest.fn(),
                    play: jest.fn(),
                    cancel: jest.fn()
                }))
            }));
        };
        
        test('should trigger animations for any element that becomes visible', () => {
            // Property: For any element with scroll trigger, intersection should trigger animation
            const elements = generateElements(5);
            const configs = elements.map(() => generateAnimationConfig());
            
            // Register scroll triggers for all elements
            elements.forEach((element, index) => {
                animationEngine.registerScrollTrigger(element, configs[index]);
            });
            
            // Simulate intersection for each element
            elements.forEach((element, index) => {
                animationEngine.scrollObserver.triggerIntersection(element, true);
                
                // Verify animation was triggered with correct config
                expect(element.animate).toHaveBeenCalledWith(
                    configs[index].keyframes,
                    expect.objectContaining({
                        duration: configs[index].duration,
                        easing: configs[index].easing,
                        delay: configs[index].delay,
                        fill: 'forwards'
                    })
                );
            });
        });
        
        test('should not trigger animations when elements leave viewport', () => {
            const elements = generateElements(3);
            const configs = elements.map(() => generateAnimationConfig());
            
            elements.forEach((element, index) => {
                animationEngine.registerScrollTrigger(element, configs[index]);
            });
            
            // Simulate elements leaving viewport
            elements.forEach((element) => {
                element.animate.mockClear();
                animationEngine.scrollObserver.triggerIntersection(element, false);
                
                // Should not trigger animation when leaving viewport
                expect(element.animate).not.toHaveBeenCalled();
            });
        });
        
        test('should respect reduced motion preferences', () => {
            // Mock reduced motion preference
            global.matchMedia = jest.fn(() => ({
                matches: true, // Reduced motion enabled
                addEventListener: jest.fn(),
                removeEventListener: jest.fn()
            }));
            
            const reducedMotionEngine = new AnimationEngine();
            const element = generateElements(1)[0];
            const config = generateAnimationConfig();
            
            reducedMotionEngine.registerScrollTrigger(element, config);
            reducedMotionEngine.scrollObserver.triggerIntersection(element, true);
            
            // Should not animate when reduced motion is preferred
            expect(element.animate).not.toHaveBeenCalled();
            
            reducedMotionEngine.destroy();
        });
        
        test('should handle multiple simultaneous intersections', () => {
            const elements = generateElements(10);
            const configs = elements.map(() => generateAnimationConfig());
            
            elements.forEach((element, index) => {
                animationEngine.registerScrollTrigger(element, configs[index]);
            });
            
            // Trigger all intersections simultaneously
            elements.forEach((element) => {
                animationEngine.scrollObserver.triggerIntersection(element, true);
            });
            
            // All elements should have their animations triggered
            elements.forEach((element, index) => {
                expect(element.animate).toHaveBeenCalledWith(
                    configs[index].keyframes,
                    expect.objectContaining({
                        duration: configs[index].duration,
                        easing: configs[index].easing
                    })
                );
            });
        });
        
        test('should clean up animations when they finish', (done) => {
            const element = generateElements(1)[0];
            const config = generateAnimationConfig();
            
            let finishCallback;
            element.animate.mockImplementation(() => ({
                addEventListener: jest.fn((event, callback) => {
                    if (event === 'finish') {
                        finishCallback = callback;
                    }
                }),
                pause: jest.fn(),
                play: jest.fn(),
                cancel: jest.fn()
            }));
            
            animationEngine.registerScrollTrigger(element, config);
            animationEngine.scrollObserver.triggerIntersection(element, true);
            
            // Verify animation was added to active set
            expect(animationEngine.activeAnimations.size).toBe(1);
            
            // Simulate animation finish
            setTimeout(() => {
                finishCallback();
                
                // Animation should be removed from active set
                expect(animationEngine.activeAnimations.size).toBe(0);
                done();
            }, 50);
        });
    });
    
    describe('Animation Engine Unit Tests', () => {
        test('should initialize with default options', () => {
            expect(animationEngine.options.performanceThreshold).toBe(30);
            expect(animationEngine.options.scrollThreshold).toBe(0.1);
            expect(animationEngine.scrollObserver).toBeDefined();
            expect(animationEngine.scrollTriggers).toBeInstanceOf(Map);
            expect(animationEngine.activeAnimations).toBeInstanceOf(Set);
        });
        
        test('should register background animations', () => {
            const config = generateAnimationConfig();
            
            animationEngine.registerBackgroundAnimation(mockElement, config);
            
            expect(animationEngine.backgroundAnimations.has(mockElement)).toBe(true);
            expect(animationEngine.backgroundAnimations.get(mockElement)).toBe(config);
        });
        
        test('should start background animations', () => {
            const config = {
                keyframes: [{ opacity: 0.5 }, { opacity: 1 }],
                duration: 2000,
                iterations: Infinity
            };
            
            animationEngine.registerBackgroundAnimation(mockElement, config);
            animationEngine.startBackgroundAnimations();
            
            expect(mockElement.animate).toHaveBeenCalledWith(
                config.keyframes,
                expect.objectContaining({
                    duration: 2000,
                    iterations: Infinity,
                    direction: 'alternate'
                })
            );
        });
        
        test('should pause and resume animations', () => {
            const mockAnimation = {
                pause: jest.fn(),
                play: jest.fn(),
                addEventListener: jest.fn(),
                cancel: jest.fn()
            };
            
            animationEngine.activeAnimations.add(mockAnimation);
            
            animationEngine.pauseAnimations();
            expect(mockAnimation.pause).toHaveBeenCalled();
            
            animationEngine.resumeAnimations();
            expect(mockAnimation.play).toHaveBeenCalled();
        });
    });
});

// Export for use in other test files
export { mockIntersectionObserver, generateAnimationConfig };