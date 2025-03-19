/**
 * Utility functions for Cosmic Brick Breaker
 */

const Utils = {
    /**
     * Generate a random number between min and max (inclusive)
     */
    random: (min, max) => {
        return Math.random() * (max - min) + min;
    },
    
    /**
     * Generate a random integer between min and max (inclusive)
     */
    randomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    /**
     * Clamp a value between min and max
     */
    clamp: (value, min, max) => {
        return Math.max(min, Math.min(max, value));
    },
    
    /**
     * Linear interpolation between a and b by t
     */
    lerp: (a, b, t) => {
        return a + (b - a) * t;
    },
    
    /**
     * Check if there's a chance (percentage as decimal)
     */
    chance: (percentage) => {
        return Math.random() < percentage;
    },
    
    /**
     * Generate a random color
     */
    randomColor: () => {
        return new THREE.Color(
            Utils.random(0.5, 1),
            Utils.random(0.5, 1),
            Utils.random(0.5, 1)
        );
    },
    
    /**
     * Generate a color scheme with base and accent colors
     */
    generateColorScheme: () => {
        const hue = Utils.random(0, 1);
        const baseColor = new THREE.Color().setHSL(hue, 0.7, 0.5);
        const accentColor = new THREE.Color().setHSL((hue + 0.5) % 1, 0.8, 0.6);
        
        return {
            base: baseColor,
            accent: accentColor,
            highlight: new THREE.Color().setHSL(hue, 0.9, 0.7)
        };
    },
    
    /**
     * Format a number with commas
     */
    formatNumber: (num) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    
    /**
     * Create a debounced function
     */
    debounce: (func, delay) => {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    },
    
    /**
     * Check if device is mobile
     */
    isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    /**
     * Create a unique ID
     */
    createId: () => {
        return Math.random().toString(36).substr(2, 9);
    }
};
