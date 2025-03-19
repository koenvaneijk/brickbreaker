/**
 * Paddle controller for Cosmic Brick Breaker
 */

class Paddle {
    constructor(scene, audioManager, particleSystem) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.particleSystem = particleSystem;
        
        // Paddle properties
        this.width = 4;
        this.height = 0.5;
        this.depth = 1;
        this.speed = 15;
        this.position = new THREE.Vector3(0, -12, 0);
        this.previousPosition = this.position.clone();
        this.velocity = new THREE.Vector3();
        
        // Create paddle mesh
        this.createPaddle();
        
        // Laser properties
        this.lasers = [];
        this.laserCooldown = 0;
        this.laserMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 1
        });
        
        // Shield properties
        this.shield = null;
        
        // Input state
        this.targetX = 0;
        this.mouseX = 0;
        this.isTouching = false;
    }
    
    createPaddle() {
        // Create geometry
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        
        // Create material
        const material = new THREE.MeshPhongMaterial({
            color: 0x44FFAA,
            emissive: 0x44FFAA,
            emissiveIntensity: 0.5,
            shininess: 100
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Create glow effect
        this.createGlow();
    }
    
    createGlow() {
        // Create larger, transparent version of paddle for glow effect
        const glowGeometry = new THREE.BoxGeometry(this.width + 0.2, this.height + 0.2, this.depth + 0.2);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x44FFAA,
            transparent: true,
            opacity: 0.3
        });
        
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glowMesh.position.copy(this.position);
        this.scene.add(this.glowMesh);
    }
    
    setupEventListeners() {
        // Mouse movement
        document.addEventListener('mousemove', (event) => {
            const x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouseX = x * 15; // Scale to game coordinates
        });
        
        // Touch movement
        document.addEventListener('touchmove', (event) => {
            event.preventDefault();
            const touch = event.touches[0];
            const x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.mouseX = x * 15; // Scale to game coordinates
            this.isTouching = true;
        });
        
        document.addEventListener('touchend', () => {
            this.isTouching = false;
        });
    }
    
    update(deltaTime, gameWidth) {
        // Store previous position for velocity calculation
        this.previousPosition.copy(this.position);
        
        // Update target position based on input
        this.targetX = this.mouseX;
        
        // Clamp target position to game bounds
        const halfWidth = this.width / 2;
        const maxX = gameWidth / 2 - halfWidth;
        this.targetX = Utils.clamp(this.targetX, -maxX, maxX);
        
        // Smoothly move toward target
        const lerpFactor = 0.2;
        this.position.x += (this.targetX - this.position.x) * lerpFactor;
        
        // Update mesh position
        this.mesh.position.copy(this.position);
        this.glowMesh.position.copy(this.position);
        
        // Calculate velocity
        this.velocity.subVectors(this.position, this.previousPosition).divideScalar(deltaTime);
        
        // Create paddle trail
        if (Math.abs(this.velocity.x) > 5) {
            const trailPosition = this.position.clone();
            trailPosition.x -= Math.sign(this.velocity.x) * this.width * 0.4;
            this.particleSystem.createPaddleTrail(trailPosition, this.velocity);
        }
        
        // Update lasers
        this.updateLasers(deltaTime);
        
        // Update shield
        if (this.shield) {
            this.shield.position.x = this.position.x;
        }
        
        // Pulse glow effect
        const time = Date.now() * 0.001;
        const pulse = 0.3 + 0.1 * Math.sin(time * 3);
        this.glowMesh.material.opacity = pulse;
        this.glowMesh.scale.set(
            1 + 0.1 * Math.sin(time * 2),
            1 + 0.1 * Math.sin(time * 2.5),
            1 + 0.1 * Math.sin(time * 3)
        );
    }
    
    expand() {
        // Expand paddle width
        const originalWidth = this.width;
        this.width *= 1.5;
        
        // Update geometry
        this.scene.remove(this.mesh);
        this.scene.remove(this.glowMesh);
        
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        this.mesh = new THREE.Mesh(geometry, this.mesh.material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
        
        // Update glow
        const glowGeometry = new THREE.BoxGeometry(this.width + 0.2, this.height + 0.2, this.depth + 0.2);
        this.glowMesh = new THREE.Mesh(glowGeometry, this.glowMesh.material);
        this.glowMesh.position.copy(this.position);
        this.scene.add(this.glowMesh);
        
        return originalWidth;
    }
    
    resetWidth(originalWidth) {
        // Reset paddle to original width
        this.width = originalWidth;
        
        // Update geometry
        this.scene.remove(this.mesh);
        this.scene.remove(this.glowMesh);
        
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        this.mesh = new THREE.Mesh(geometry, this.mesh.material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
        
        // Update glow
        const glowGeometry = new THREE.BoxGeometry(this.width + 0.2, this.height + 0.2, this.depth + 0.2);
        this.glowMesh = new THREE.Mesh(glowGeometry, this.glowMesh.material);
        this.glowMesh.position.copy(this.position);
        this.scene.add(this.glowMesh);
    }
    
    activateLasers() {
        // Create laser cannon visual effect on paddle
        const leftLaserPosition = this.position.clone();
        leftLaserPosition.x -= this.width / 2 - 0.3;
        leftLaserPosition.y += 0.3;
        
        const rightLaserPosition = this.position.clone();
        rightLaserPosition.x += this.width / 2 - 0.3;
        rightLaserPosition.y += 0.3;
        
        // Create laser cannon meshes
        const laserCannonGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8);
        const laserCannonMaterial = new THREE.MeshPhongMaterial({
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 0.5
        });
        
        this.leftLaserCannon = new THREE.Mesh(laserCannonGeometry, laserCannonMaterial);
        this.leftLaserCannon.position.copy(leftLaserPosition);
        this.leftLaserCannon.rotation.x = Math.PI / 2;
        this.scene.add(this.leftLaserCannon);
        
        this.rightLaserCannon = new THREE.Mesh(laserCannonGeometry, laserCannonMaterial);
        this.rightLaserCannon.position.copy(rightLaserPosition);
        this.rightLaserCannon.rotation.x = Math.PI / 2;
        this.scene.add(this.rightLaserCannon);
    }
    
    deactivateLasers() {
        // Remove laser cannons
        if (this.leftLaserCannon) {
            this.scene.remove(this.leftLaserCannon);
            this.leftLaserCannon = null;
        }
        
        if (this.rightLaserCannon) {
            this.scene.remove(this.rightLaserCannon);
            this.rightLaserCannon = null;
        }
        
        // Remove any active lasers
        this.lasers.forEach(laser => this.scene.remove(laser));
        this.lasers = [];
    }
    
    fireLasers() {
        if (!this.leftLaserCannon || !this.rightLaserCannon) return;
        if (this.laserCooldown > 0) return;
        
        // Create laser beams
        const laserGeometry = new THREE.BoxGeometry(0.1, 20, 0.1);
        
        // Left laser
        const leftLaser = new THREE.Mesh(laserGeometry, this.laserMaterial);
        leftLaser.position.copy(this.leftLaserCannon.position);
        leftLaser.position.y += 10; // Position laser beam above cannon
        this.scene.add(leftLaser);
        this.lasers.push(leftLaser);
        
        // Right laser
        const rightLaser = new THREE.Mesh(laserGeometry, this.laserMaterial);
        rightLaser.position.copy(this.rightLaserCannon.position);
        rightLaser.position.y += 10; // Position laser beam above cannon
        this.scene.add(rightLaser);
        this.lasers.push(rightLaser);
        
        // Set cooldown
        this.laserCooldown = 0.5; // Half second cooldown
        
        // Play laser sound
        // this.audioManager.playLaserSound();
    }
    
    updateLasers(deltaTime) {
        // Update laser cooldown
        if (this.laserCooldown > 0) {
            this.laserCooldown -= deltaTime;
        }
        
        // Update laser cannons position if they exist
        if (this.leftLaserCannon && this.rightLaserCannon) {
            const leftLaserPosition = this.position.clone();
            leftLaserPosition.x -= this.width / 2 - 0.3;
            leftLaserPosition.y += 0.3;
            this.leftLaserCannon.position.copy(leftLaserPosition);
            
            const rightLaserPosition = this.position.clone();
            rightLaserPosition.x += this.width / 2 - 0.3;
            rightLaserPosition.y += 0.3;
            this.rightLaserCannon.position.copy(rightLaserPosition);
            
            // Fire lasers automatically
            if (this.laserCooldown <= 0) {
                this.fireLasers();
            }
        }
        
        // Remove old lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            
            // Lasers exist for 0.2 seconds
            laser.userData.age = (laser.userData.age || 0) + deltaTime;
            
            if (laser.userData.age > 0.2) {
                this.scene.remove(laser);
                this.lasers.splice(i, 1);
            }
        }
    }
    
    activateShield() {
        if (this.shield) return;
        
        // Create shield mesh
        const shieldGeometry = new THREE.BoxGeometry(20, 0.2, 1);
        const shieldMaterial = new THREE.MeshPhongMaterial({
            color: 0x00AAFF,
            emissive: 0x00AAFF,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });
        
        this.shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
        this.shield.position.set(this.position.x, -14, 0);
        this.scene.add(this.shield);
    }
    
    deactivateShield() {
        if (!this.shield) return;
        
        this.scene.remove(this.shield);
        this.shield = null;
    }
    
    hasShield() {
        return this.shield !== null;
    }
    
    getLasers() {
        return this.lasers;
    }
    
    reset() {
        // Reset position
        this.position.set(0, -12, 0);
        this.previousPosition.copy(this.position);
        this.velocity.set(0, 0, 0);
        
        // Update mesh
        this.mesh.position.copy(this.position);
        this.glowMesh.position.copy(this.position);
        
        // Deactivate lasers and shield
        this.deactivateLasers();
        this.deactivateShield();
    }
}
