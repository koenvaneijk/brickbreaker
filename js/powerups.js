/**
 * Power-up system for Cosmic Brick Breaker
 */

class PowerUpManager {
    constructor(scene, audioManager, particleSystem) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.particleSystem = particleSystem;
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
                emissiveIntensity: 0.7,
                transparent: true,
                opacity: 0.9,
                shininess: 100
            });
        }
        
        // Create geometry for power-ups
        this.geometry = new THREE.OctahedronGeometry(0.4, 2);
        
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
        
        // Create power-up group
        const group = new THREE.Group();
        group.position.copy(position);
        group.userData.type = type;
        group.userData.velocity = new THREE.Vector3(0, -5, 0);
        group.userData.createdAt = Date.now();
        
        // Create core mesh
        const coreMesh = new THREE.Mesh(this.geometry, this.materials[type]);
        coreMesh.castShadow = true;
        coreMesh.receiveShadow = true;
        group.add(coreMesh);
        
        // Create outer glow ring
        const ringGeometry = new THREE.TorusGeometry(0.7, 0.1, 16, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.powerUpTypes[type].color,
            transparent: true,
            opacity: 0.7
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        
        // Create particles
        const particleCount = 8;
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 0.7;
            particle.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            particle.userData.angle = angle;
            particle.userData.radius = radius;
            particle.userData.speed = 0.5 + Math.random() * 0.5;
            particle.userData.verticalOffset = Math.random() * Math.PI * 2;
            group.add(particle);
        }
        
        // Create icon
        const iconSize = 0.4;
        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = 128;
        iconCanvas.height = 128;
        const ctx = iconCanvas.getContext('2d');
        
        // Draw icon background
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.powerUpTypes[type].icon, 64, 64);
        
        const iconTexture = new THREE.CanvasTexture(iconCanvas);
        const iconMaterial = new THREE.SpriteMaterial({
            map: iconTexture,
            transparent: true,
            opacity: 0.9
        });
        
        const icon = new THREE.Sprite(iconMaterial);
        icon.scale.set(iconSize, iconSize, 1);
        group.add(icon);
        
        // Add to scene
        this.scene.add(group);
        
        // Add to power-ups array
        this.powerUps.push(group);
        
        return group;
    }
    
    update(deltaTime, paddle) {
        // Update falling power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            // Move power-up down
            powerUp.position.add(powerUp.userData.velocity.clone().multiplyScalar(deltaTime));
            
            // Animate power-up
            this.animatePowerUp(powerUp, deltaTime);
            
            // Check if power-up is below screen
            if (powerUp.position.y < -15) {
                this.scene.remove(powerUp);
                this.powerUps.splice(i, 1);
                continue;
            }
            
            // Check collision with paddle
            if (this.checkPaddleCollision(powerUp, paddle)) {
                // Create collection effect
                this.particleSystem.createPowerUpCollectionEffect(
                    powerUp.position.clone(),
                    new THREE.Color(this.powerUpTypes[powerUp.userData.type].color)
                );
                
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
    
    animatePowerUp(powerUp, deltaTime) {
        // Rotate core
        const core = powerUp.children[0];
        core.rotation.x += 2 * deltaTime;
        core.rotation.y += 3 * deltaTime;
        
        // Rotate ring
        const ring = powerUp.children[1];
        ring.rotation.z += 1.5 * deltaTime;
        
        // Pulse ring scale
        const time = Date.now() * 0.001;
        const timeSinceCreation = (Date.now() - powerUp.userData.createdAt) * 0.001;
        const pulseFactor = 1 + 0.2 * Math.sin(time * 3);
        ring.scale.set(pulseFactor, pulseFactor, pulseFactor);
        
        // Animate particles
        for (let i = 2; i < 10; i++) {
            if (powerUp.children[i]) {
                const particle = powerUp.children[i];
                
                // Orbit around center
                particle.userData.angle += particle.userData.speed * deltaTime;
                
                // Vertical bobbing
                const verticalOffset = 0.2 * Math.sin(time * 2 + particle.userData.verticalOffset);
                
                particle.position.set(
                    Math.cos(particle.userData.angle) * particle.userData.radius,
                    verticalOffset,
                    Math.sin(particle.userData.angle) * particle.userData.radius
                );
                
                // Pulse opacity
                particle.material.opacity = 0.5 + 0.5 * Math.sin(time * 3 + i);
            }
        }
        
        // Hover effect for the whole power-up
        powerUp.position.y += Math.sin(timeSinceCreation * 3) * 0.01;
    }
    
    checkPaddleCollision(powerUp, paddle) {
        // Simple AABB collision check
        const paddleBounds = {
            minX: paddle.position.x - paddle.width / 2,
            maxX: paddle.position.x + paddle.width / 2,
            minY: paddle.position.y - paddle.height / 2,
            maxY: paddle.position.y + paddle.height / 2,
            minZ: paddle.position.z - paddle.depth / 2,
            maxZ: paddle.position.z + paddle.depth / 2
        };
        
        const powerUpBounds = {
            minX: powerUp.position.x - 0.7,
            maxX: powerUp.position.x + 0.7,
            minY: powerUp.position.y - 0.7,
            maxY: powerUp.position.y + 0.7,
            minZ: powerUp.position.z - 0.7,
            maxZ: powerUp.position.z + 0.7
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
            <span class="power-up-icon">${powerUpInfo.icon}</span>
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
