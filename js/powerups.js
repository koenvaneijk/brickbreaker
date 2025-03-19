/**
 * Power-up system for Cosmic Brick Breaker
 */

class PowerUpManager {
    constructor(scene, audioManager) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.powerUps = [];
        this.activePowerUps = new Map();
        
        // Power-up definitions
        this.powerUpTypes = {
            multiBall: {
                name: 'Multi-Ball',
                color: 0xFF5555,
                icon: '3×',
                duration: 15,
                dropChance: 0.15
            },
            paddleExpansion: {
                name: 'Paddle Expansion',
                color: 0x55FF55,
                icon: '↔',
                duration: 20,
                dropChance: 0.15
            },
            slowMotion: {
                name: 'Slow Motion',
                color: 0x5555FF,
                icon: '⏱',
                duration: 15,
                dropChance: 0.15
            },
            laserCannon: {
                name: 'Laser Cannon',
                color: 0xFF5555,
                icon: '⚡',
                duration: 10,
                dropChance: 0.1
            },
            fireball: {
                name: 'Fireball',
                color: 0xFF8800,
                icon: '🔥',
                duration: 15,
                dropChance: 0.1
            },
            magneticPaddle: {
                name: 'Magnetic Paddle',
                color: 0xAA55FF,
                icon: '🧲',
                duration: 15,
                dropChance: 0.1
            },
            shield: {
                name: 'Shield',
                color: 0x00AAFF,
                icon: '🛡',
                duration: 0, // One-time use
                dropChance: 0.1
            },
            brickBuster: {
                name: 'Brick Buster',
                color: 0xFFAA00,
                icon: '💥',
                duration: 15,
                dropChance: 0.1
            }
        };
        
        // Create materials for each power-up type
        this.materials = {};
        for (const type in this.powerUpTypes) {
            this.materials[type] = new THREE.MeshPhongMaterial({
                color: this.powerUpTypes[type].color,
                emissive: this.powerUpTypes[type].color,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.9,
                shininess: 100
            });
        }
        
        // Create geometry for power-ups
        this.geometry = new THREE.OctahedronGeometry(0.5, 2);
        
        // Create UI container
        this.uiContainer = document.getElementById('power-ups-container');
    }
    
    createPowerUp(position, forcedType = null) {
        // Determine power-up type
        let type;
        
        if (forcedType && this.powerUpTypes[forcedType]) {
            type = forcedType;
        } else {
            // Weighted random selection
            const totalWeight = Object.values(this.powerUpTypes)
                .reduce((sum, powerUp) => sum + powerUp.dropChance, 0);
            
            let random = Math.random() * totalWeight;
            
            for (const powerUpType in this.powerUpTypes) {
                random -= this.powerUpTypes[powerUpType].dropChance;
                if (random <= 0) {
                    type = powerUpType;
                    break;
                }
            }
            
            // Fallback if something went wrong
            if (!type) {
                type = 'multiBall';
            }
        }
        
        // Create mesh
        const mesh = new THREE.Mesh(this.geometry, this.materials[type]);
        mesh.position.copy(position);
        mesh.userData.type = type;
        mesh.userData.velocity = new THREE.Vector3(0, -5, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Add to scene
        this.scene.add(mesh);
        
        // Add to power-ups array
        this.powerUps.push(mesh);
        
        return mesh;
    }
    
    update(deltaTime, paddle) {
        // Update falling power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            // Move power-up down
            powerUp.position.add(powerUp.userData.velocity.clone().multiplyScalar(deltaTime));
            
            // Rotate power-up
            powerUp.rotation.x += 2 * deltaTime;
            powerUp.rotation.y += 3 * deltaTime;
            
            // Check if power-up is below screen
            if (powerUp.position.y < -15) {
                this.scene.remove(powerUp);
                this.powerUps.splice(i, 1);
                continue;
            }
            
            // Check collision with paddle
            if (this.checkPaddleCollision(powerUp, paddle)) {
                this.activatePowerUp(powerUp.userData.type);
                this.scene.remove(powerUp);
                this.powerUps.splice(i, 1);
            }
        }
        
        // Update active power-ups
        this.activePowerUps.forEach((data, type) => {
            if (data.duration > 0) {
                data.duration -= deltaTime;
                
                // Update UI timer
                if (data.uiElement) {
                    const timerFill = data.uiElement.querySelector('.power-up-timer-fill');
                    const percentage = (data.duration / this.powerUpTypes[type].duration) * 100;
                    timerFill.style.width = `${percentage}%`;
                }
                
                // Deactivate if expired
                if (data.duration <= 0) {
                    this.deactivatePowerUp(type);
                }
            }
        });
    }
    
    checkPaddleCollision(powerUp, paddle) {
        // Simple AABB collision check
        const paddleBounds = {
            minX: paddle.position.x - paddle.scale.x / 2,
            maxX: paddle.position.x + paddle.scale.x / 2,
            minY: paddle.position.y - paddle.scale.y / 2,
            maxY: paddle.position.y + paddle.scale.y / 2,
            minZ: paddle.position.z - paddle.scale.z / 2,
            maxZ: paddle.position.z + paddle.scale.z / 2
        };
        
        const powerUpBounds = {
            minX: powerUp.position.x - 0.5,
            maxX: powerUp.position.x + 0.5,
            minY: powerUp.position.y - 0.5,
            maxY: powerUp.position.y + 0.5,
            minZ: powerUp.position.z - 0.5,
            maxZ: powerUp.position.z + 0.5
        };
        
        return (
            paddleBounds.minX < powerUpBounds.maxX &&
            paddleBounds.maxX > powerUpBounds.minX &&
            paddleBounds.minY < powerUpBounds.maxY &&
            paddleBounds.maxY > powerUpBounds.minY &&
            paddleBounds.minZ < powerUpBounds.maxZ &&
            paddleBounds.maxZ > powerUpBounds.minZ
        );
    }
    
    activatePowerUp(type) {
        const powerUpInfo = this.powerUpTypes[type];
        
        // Play sound effect
        this.audioManager.playPowerUpCollected(type);
        
        // If already active, just reset duration
        if (this.activePowerUps.has(type)) {
            const data = this.activePowerUps.get(type);
            data.duration = powerUpInfo.duration;
            return;
        }
        
        // Create UI element
        const uiElement = document.createElement('div');
        uiElement.className = 'power-up-indicator';
        uiElement.style.backgroundColor = `#${powerUpInfo.color.toString(16).padStart(6, '0')}`;
        uiElement.innerHTML = `
            ${powerUpInfo.icon}
            <div class="power-up-timer">
                <div class="power-up-timer-fill"></div>
            </div>
        `;
        this.uiContainer.appendChild(uiElement);
        
        // Store power-up data
        this.activePowerUps.set(type, {
            duration: powerUpInfo.duration,
            uiElement: powerUpInfo.duration > 0 ? uiElement : null
        });
        
        // Play power-up theme
        this.audioManager.playPowerUpTheme(type);
        
        // For one-time use power-ups
        if (powerUpInfo.duration === 0) {
            // Remove UI element after a short delay
            setTimeout(() => {
                if (uiElement.parentNode) {
                    uiElement.parentNode.removeChild(uiElement);
                }
            }, 2000);
        }
    }
    
    deactivatePowerUp(type) {
        if (!this.activePowerUps.has(type)) return;
        
        const data = this.activePowerUps.get(type);
        
        // Remove UI element
        if (data.uiElement && data.uiElement.parentNode) {
            data.uiElement.parentNode.removeChild(data.uiElement);
        }
        
        // Stop power-up theme
        this.audioManager.stopPowerUpTheme(type);
        
        // Remove from active power-ups
        this.activePowerUps.delete(type);
    }
    
    isPowerUpActive(type) {
        return this.activePowerUps.has(type);
    }
    
    deactivateAllPowerUps() {
        const types = Array.from(this.activePowerUps.keys());
        types.forEach(type => this.deactivatePowerUp(type));
    }
    
    clearPowerUps() {
        // Remove all power-ups from scene
        this.powerUps.forEach(powerUp => this.scene.remove(powerUp));
        this.powerUps = [];
        
        // Deactivate all active power-ups
        this.deactivateAllPowerUps();
    }
}
