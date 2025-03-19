/**
 * Particle system for visual effects
 */

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particlePools = {};
        this.activeParticles = [];
        
        // Initialize particle pools
        this.initParticlePools();
    }
    
    initParticlePools() {
        // Brick destruction particles
        this.createParticlePool('brickDestruction', 500, 0x88CCFF, 0.2, 0.5);
        
        // Power-up collection particles
        this.createParticlePool('powerUpCollection', 200, 0xFFFFFF, 0.3, 0.8);
        
        // Ball trail particles
        this.createParticlePool('ballTrail', 300, 0x44AAFF, 0.1, 0.3);
        
        // Paddle trail particles
        this.createParticlePool('paddleTrail', 200, 0x44FFAA, 0.2, 0.4);
    }
    
    createParticlePool(name, count, color, minSize, maxSize) {
        const particles = [];
        
        // Create particle geometry
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const scales = new Float32Array(count);
        const colors = new Float32Array(count * 3);
        
        // Initialize all particles as inactive
        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            scales[i] = Utils.random(minSize, maxSize);
            
            // Convert hex color to RGB
            const particleColor = new THREE.Color(color);
            colors[i * 3] = particleColor.r;
            colors[i * 3 + 1] = particleColor.g;
            colors[i * 3 + 2] = particleColor.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Create particle material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float scale;
                attribute vec3 color;
                varying vec3 vColor;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = scale * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // Create circular particle
                    float r = distance(gl_PointCoord, vec2(0.5, 0.5));
                    if (r > 0.5) discard;
                    
                    // Soft edge
                    float alpha = 1.0 - smoothstep(0.3, 0.5, r);
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        // Create particle system
        const particleSystem = new THREE.Points(geometry, material);
        particleSystem.frustumCulled = false;
        this.scene.add(particleSystem);
        
        // Store particle data
        this.particlePools[name] = {
            system: particleSystem,
            geometry: geometry,
            material: material,
            count: count,
            available: Array.from({ length: count }, (_, i) => i),
            active: [],
            color: color,
            minSize: minSize,
            maxSize: maxSize
        };
    }
    
    emitParticles(type, position, options = {}) {
        const pool = this.particlePools[type];
        if (!pool) return;
        
        const count = options.count || 10;
        const speed = options.speed || 5;
        const spread = options.spread || 1;
        const lifetime = options.lifetime || 1;
        const gravity = options.gravity !== undefined ? options.gravity : 0;
        const color = options.color || pool.color;
        
        // Convert color to THREE.Color if it's a hex value
        const particleColor = color instanceof THREE.Color ? color : new THREE.Color(color);
        
        // Get particles from pool
        const particleIndices = [];
        for (let i = 0; i < count; i++) {
            if (pool.available.length === 0) break;
            
            const index = pool.available.pop();
            pool.active.push(index);
            particleIndices.push(index);
            
            // Set initial position
            const positions = pool.geometry.attributes.position.array;
            positions[index * 3] = position.x;
            positions[index * 3 + 1] = position.y;
            positions[index * 3 + 2] = position.z;
            
            // Set color
            const colors = pool.geometry.attributes.color.array;
            colors[index * 3] = particleColor.r;
            colors[index * 3 + 1] = particleColor.g;
            colors[index * 3 + 2] = particleColor.b;
            
            // Set scale
            const scales = pool.geometry.attributes.scale.array;
            scales[index] = Utils.random(pool.minSize, pool.maxSize);
        }
        
        // Create particle data for animation
        const particles = particleIndices.map(index => {
            // Random direction
            const angle = Utils.random(0, Math.PI * 2);
            const elevation = Utils.random(-Math.PI / 2, Math.PI / 2);
            
            const direction = new THREE.Vector3(
                Math.cos(angle) * Math.cos(elevation),
                Math.sin(elevation),
                Math.sin(angle) * Math.cos(elevation)
            );
            
            // Add some randomness to direction
            direction.x += Utils.random(-spread, spread);
            direction.y += Utils.random(-spread, spread);
            direction.z += Utils.random(-spread, spread);
            direction.normalize();
            
            // Random velocity
            const velocity = direction.multiplyScalar(Utils.random(speed * 0.5, speed * 1.5));
            
            return {
                type,
                index,
                position: new THREE.Vector3(position.x, position.y, position.z),
                velocity,
                gravity,
                lifetime: Utils.random(lifetime * 0.7, lifetime * 1.3),
                age: 0
            };
        });
        
        // Add to active particles
        this.activeParticles.push(...particles);
        
        // Update geometry attributes
        pool.geometry.attributes.position.needsUpdate = true;
        pool.geometry.attributes.color.needsUpdate = true;
        pool.geometry.attributes.scale.needsUpdate = true;
    }
    
    createBrickDestructionEffect(position, brickColor) {
        this.emitParticles('brickDestruction', position, {
            count: 30,
            speed: 10,
            spread: 0.5,
            lifetime: 1.5,
            gravity: -5,
            color: brickColor
        });
    }
    
    createPowerUpCollectionEffect(position, powerUpColor) {
        this.emitParticles('powerUpCollection', position, {
            count: 40,
            speed: 15,
            spread: 1,
            lifetime: 1,
            gravity: 0,
            color: powerUpColor
        });
    }
    
    createBallTrail(position, velocity) {
        // Only create trail particles occasionally to avoid overwhelming the system
        if (Math.random() > 0.3) return;
        
        const speed = velocity.length() * 0.2;
        
        this.emitParticles('ballTrail', position, {
            count: 1,
            speed: speed,
            spread: 0.1,
            lifetime: 0.5,
            gravity: 0
        });
    }
    
    createPaddleTrail(position, velocity) {
        // Only create trail when paddle is moving fast
        if (velocity.length() < 0.5) return;
        
        this.emitParticles('paddleTrail', position, {
            count: 1,
            speed: velocity.length() * 0.1,
            spread: 0.1,
            lifetime: 0.3,
            gravity: 0
        });
    }
    
    update(deltaTime) {
        // Update all active particles
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const particle = this.activeParticles[i];
            
            // Update age
            particle.age += deltaTime;
            
            // Check if particle is dead
            if (particle.age >= particle.lifetime) {
                // Return to pool
                const pool = this.particlePools[particle.type];
                pool.available.push(particle.index);
                
                // Remove from active array
                const activeIndex = pool.active.indexOf(particle.index);
                if (activeIndex !== -1) {
                    pool.active.splice(activeIndex, 1);
                }
                
                // Remove from global active array
                this.activeParticles.splice(i, 1);
                continue;
            }
            
            // Update position
            particle.velocity.y += particle.gravity * deltaTime;
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
            
            // Update particle in geometry
            const positions = this.particlePools[particle.type].geometry.attributes.position.array;
            positions[particle.index * 3] = particle.position.x;
            positions[particle.index * 3 + 1] = particle.position.y;
            positions[particle.index * 3 + 2] = particle.position.z;
            
            // Fade out based on age
            const lifeRatio = particle.age / particle.lifetime;
            const scales = this.particlePools[particle.type].geometry.attributes.scale.array;
            scales[particle.index] *= (1 - lifeRatio * deltaTime * 2);
        }
        
        // Update all particle systems
        for (const type in this.particlePools) {
            const pool = this.particlePools[type];
            if (pool.active.length > 0) {
                pool.geometry.attributes.position.needsUpdate = true;
                pool.geometry.attributes.scale.needsUpdate = true;
                pool.material.uniforms.time.value += deltaTime;
            }
        }
    }
    
    dispose() {
        // Remove all particle systems from scene
        for (const type in this.particlePools) {
            const pool = this.particlePools[type];
            this.scene.remove(pool.system);
            pool.geometry.dispose();
            pool.material.dispose();
        }
        
        this.particlePools = {};
        this.activeParticles = [];
    }
}
