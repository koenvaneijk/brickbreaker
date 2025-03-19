/**
 * Brick system for Cosmic Brick Breaker
 */

class BrickManager {
    constructor(scene, audioManager, particleSystem, powerUpManager) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.particleSystem = particleSystem;
        this.powerUpManager = powerUpManager;
        
        this.bricks = [];
        this.brickTypes = {
            standard: {
                color: 0x88CCFF,
                hits: 1,
                points: 100,
                dropChance: 0.15
            },
            reinforced: {
                color: 0xCCFF88,
                hits: 2,
                points: 200,
                dropChance: 0.2
            },
            explosive: {
                color: 0xFF8888,
                hits: 1,
                points: 150,
                dropChance: 0.1,
                explosive: true
            },
            indestructible: {
                color: 0x888888,
                hits: Infinity,
                points: 0,
                dropChance: 0
            },
            powerUp: {
                color: 0xFFCC88,
                hits: 1,
                points: 150,
                dropChance: 1.0 // Guaranteed drop
            },
            phase: {
                color: 0xAA88FF,
                hits: 1,
                points: 200,
                dropChance: 0.15,
                phasing: true
            }
        };
        
        // Create materials for each brick type
        this.materials = {};
        for (const type in this.brickTypes) {
            this.materials[type] = new THREE.MeshPhongMaterial({
                color: this.brickTypes[type].color,
                emissive: this.brickTypes[type].color,
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 0.9,
                shininess: 100
            });
            
            // Create damaged version for reinforced bricks
            if (this.brickTypes[type].hits > 1) {
                this.materials[`${type}_damaged`] = new THREE.MeshPhongMaterial({
                    color: this.brickTypes[type].color,
                    emissive: this.brickTypes[type].color,
                    emissiveIntensity: 0.4,
                    transparent: true,
                    opacity: 0.9,
                    shininess: 100,
                    wireframe: true
                });
            }
        }
        
        // Create brick geometry
        this.geometry = new THREE.BoxGeometry(1.8, 0.8, 0.8);
        
        // Phase brick animation
        this.phaseTimer = 0;
    }
    
    createBrick(x, y, type = 'standard') {
        if (!this.brickTypes[type]) {
            type = 'standard';
        }
        
        const material = this.materials[type];
        const mesh = new THREE.Mesh(this.geometry, material);
        
        mesh.position.set(x, y, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Store brick data
        mesh.userData = {
            type: type,
            hitsLeft: this.brickTypes[type].hits,
            points: this.brickTypes[type].points,
            dropChance: this.brickTypes[type].dropChance,
            phasing: this.brickTypes[type].phasing || false,
            explosive: this.brickTypes[type].explosive || false,
            originalPosition: new THREE.Vector3(x, y, 0)
        };
        
        // Add to scene and bricks array
        this.scene.add(mesh);
        this.bricks.push(mesh);
        
        return mesh;
    }
    
    generateLevel(difficulty = 1) {
        // Clear existing bricks
        this.clearBricks();
        
        // Determine grid size based on difficulty
        const rows = Math.min(8, 3 + Math.floor(difficulty / 2));
        const cols = 10;
        
        // Calculate spacing and offset
        const spacing = 2;
        const offsetX = -(cols * spacing) / 2 + spacing / 2;
        const offsetY = 10;
        
        // Brick type probabilities based on difficulty
        const typeProbs = {
            standard: 0.6 - difficulty * 0.05,
            reinforced: 0.1 + difficulty * 0.03,
            explosive: 0.1,
            indestructible: 0.05 + difficulty * 0.01,
            powerUp: 0.1,
            phase: 0.05 + difficulty * 0.02
        };
        
        // Normalize probabilities
        const total = Object.values(typeProbs).reduce((sum, val) => sum + val, 0);
        for (const type in typeProbs) {
            typeProbs[type] /= total;
        }
        
        // Generate bricks
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Determine brick type
                let type = 'standard';
                let rand = Math.random();
                let cumulative = 0;
                
                for (const brickType in typeProbs) {
                    cumulative += typeProbs[brickType];
                    if (rand < cumulative) {
                        type = brickType;
                        break;
                    }
                }
                
                // Create brick
                const x = offsetX + col * spacing;
                const y = offsetY - row * spacing;
                this.createBrick(x, y, type);
            }
        }
        
        return this.bricks.length;
    }
    
    regenerateBricks(difficulty = 1, count = 5) {
        // Only regenerate if we're below a certain threshold
        if (this.bricks.length > 20) return 0;
        
        // Calculate spacing and offset
        const spacing = 2;
        const cols = 10;
        const offsetX = -(cols * spacing) / 2 + spacing / 2;
        const offsetY = 10;
        
        // Brick type probabilities based on difficulty
        const typeProbs = {
            standard: 0.5 - difficulty * 0.05,
            reinforced: 0.15 + difficulty * 0.03,
            explosive: 0.1,
            indestructible: 0.05 + difficulty * 0.01,
            powerUp: 0.1,
            phase: 0.1 + difficulty * 0.02
        };
        
        // Normalize probabilities
        const total = Object.values(typeProbs).reduce((sum, val) => sum + val, 0);
        for (const type in typeProbs) {
            typeProbs[type] /= total;
        }
        
        // Generate new bricks
        let added = 0;
        
        for (let i = 0; i < count; i++) {
            // Find an empty spot
            let attempts = 0;
            let validPosition = false;
            let x, y;
            
            while (!validPosition && attempts < 20) {
                const col = Math.floor(Math.random() * cols);
                const row = Math.floor(Math.random() * 3); // Only add to top 3 rows
                
                x = offsetX + col * spacing;
                y = offsetY - row * spacing;
                
                // Check if position is empty
                validPosition = !this.bricks.some(brick => 
                    Math.abs(brick.position.x - x) < 1 && 
                    Math.abs(brick.position.y - y) < 1
                );
                
                attempts++;
            }
            
            if (validPosition) {
                // Determine brick type
                let type = 'standard';
                let rand = Math.random();
                let cumulative = 0;
                
                for (const brickType in typeProbs) {
                    cumulative += typeProbs[brickType];
                    if (rand < cumulative) {
                        type = brickType;
                        break;
                    }
                }
                
                // Create brick
                this.createBrick(x, y, type);
                added++;
            }
        }
        
        return added;
    }
    
    hitBrick(brick, ball) {
        const brickData = brick.userData;
        
        // Skip if brick is indestructible
        if (brickData.type === 'indestructible') {
            this.audioManager.playBallWallHit(ball.velocity.length() / 20);
            return 0;
        }
        
        // Skip if brick is phasing and currently intangible
        if (brickData.phasing && brick.material.opacity < 0.3) {
            return 0;
        }
        
        // Reduce hits left
        brickData.hitsLeft--;
        
        // Play sound
        this.audioManager.playBrickHit(brickData.type, ball.velocity.length() / 20);
        
        // If reinforced brick is damaged but not destroyed
        if (brickData.type === 'reinforced' && brickData.hitsLeft > 0) {
            brick.material = this.materials[`${brickData.type}_damaged`];
            return 0;
        }
        
        // If brick is destroyed
        if (brickData.hitsLeft <= 0) {
            // Create particle effect
            this.particleSystem.createBrickDestructionEffect(
                brick.position.clone(),
                new THREE.Color(this.brickTypes[brickData.type].color)
            );
            
            // Handle explosive bricks
            if (brickData.explosive) {
                this.explodeBrick(brick);
            }
            
            // Check for power-up drop
            if (Math.random() < brickData.dropChance) {
                this.powerUpManager.createPowerUp(brick.position.clone());
            }
            
            // Remove brick
            this.removeBrick(brick);
            
            return brickData.points;
        }
        
        return 0;
    }
    
    explodeBrick(brick) {
        const explosionRadius = 3;
        const position = brick.position.clone();
        
        // Find nearby bricks
        this.bricks.forEach(otherBrick => {
            if (otherBrick !== brick && otherBrick.userData.type !== 'indestructible') {
                const distance = position.distanceTo(otherBrick.position);
                
                if (distance < explosionRadius) {
                    // Create particle effect
                    this.particleSystem.createBrickDestructionEffect(
                        otherBrick.position.clone(),
                        new THREE.Color(this.brickTypes[otherBrick.userData.type].color)
                    );
                    
                    // Check for power-up drop
                    if (Math.random() < otherBrick.userData.dropChance * 0.5) {
                        this.powerUpManager.createPowerUp(otherBrick.position.clone());
                    }
                    
                    // Remove brick
                    this.removeBrick(otherBrick);
                }
            }
        });
    }
    
    removeBrick(brick) {
        // Remove from scene
        this.scene.remove(brick);
        
        // Remove from array
        const index = this.bricks.indexOf(brick);
        if (index !== -1) {
            this.bricks.splice(index, 1);
        }
    }
    
    update(deltaTime) {
        // Update phase bricks
        this.phaseTimer += deltaTime;
        
        if (this.phaseTimer > 0.05) {
            this.phaseTimer = 0;
            
            this.bricks.forEach(brick => {
                if (brick.userData.phasing) {
                    // Calculate phase based on time
                    const phase = (Date.now() % 5000) / 5000; // 0 to 1 over 5 seconds
                    
                    // Opacity oscillates between 0.1 and 0.9
                    brick.material.opacity = 0.1 + 0.8 * Math.abs(Math.sin(phase * Math.PI));
                    
                    // Disable collision when nearly transparent
                    brick.userData.tangible = brick.material.opacity > 0.3;
                }
            });
        }
    }
    
    clearBricks() {
        // Remove all bricks from scene
        this.bricks.forEach(brick => this.scene.remove(brick));
        this.bricks = [];
    }
    
    getBrickCount() {
        return this.bricks.length;
    }
    
    getDestructibleBrickCount() {
        return this.bricks.filter(brick => 
            brick.userData.type !== 'indestructible'
        ).length;
    }
}
