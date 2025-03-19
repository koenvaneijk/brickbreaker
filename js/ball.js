/**
 * Ball class for Cosmic Brick Breaker
 */

class Ball {
    constructor(scene, audioManager, particleSystem, initialPosition = new THREE.Vector3(0, -11, 0)) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.particleSystem = particleSystem;
        
        // Ball properties
        this.radius = 0.4;
        this.baseSpeed = 15;
        this.speed = this.baseSpeed;
        this.position = initialPosition.clone();
        this.velocity = new THREE.Vector3(
            Utils.random(-0.5, 0.5),
            1,
            0
        ).normalize().multiplyScalar(this.speed);
        
        // Special properties
        this.fireball = false;
        this.brickBuster = false;
        this.magnetic = false;
        this.attachedToPaddle = false;
        this.attachOffset = 0;
        
        // Create ball mesh
        this.createBall();
    }
    
    createBall() {
        // Create geometry
        const geometry = new THREE.SphereGeometry(this.radius, 16, 16);
        
        // Create material
        const material = new THREE.MeshPhongMaterial({
            color: 0x44AAFF,
            emissive: 0x44AAFF,
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
        
        // Create trail effect
        this.createTrail();
    }
    
    createGlow() {
        // Create larger, transparent version of ball for glow effect
        const glowGeometry = new THREE.SphereGeometry(this.radius * 1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x44AAFF,
            transparent: true,
            opacity: 0.3
        });
        
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glowMesh.position.copy(this.position);
        this.scene.add(this.glowMesh);
    }
    
    createTrail() {
        // Create trail geometry
        const trailGeometry = new THREE.BufferGeometry();
        const trailPositions = new Float32Array(30 * 3); // 30 points, 3 coordinates each
        
        // Initialize all positions to current ball position
        for (let i = 0; i < 30; i++) {
            trailPositions[i * 3] = this.position.x;
            trailPositions[i * 3 + 1] = this.position.y;
            trailPositions[i * 3 + 2] = this.position.z;
        }
        
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        
        // Create trail material
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0x44AAFF,
            transparent: true,
            opacity: 0.5
        });
        
        // Create trail mesh
        this.trail = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(this.trail);
        
        // Store trail positions for updating
        this.trailPositions = trailPositions;
        this.trailUpdateCounter = 0;
    }
    
    update(deltaTime, paddle, gameWidth, gameHeight) {
        // If attached to paddle, follow it
        if (this.attachedToPaddle) {
            this.position.x = paddle.position.x + this.attachOffset;
            this.position.y = paddle.position.y + paddle.height / 2 + this.radius;
            
            // Update mesh position
            this.mesh.position.copy(this.position);
            this.glowMesh.position.copy(this.position);
            
            // Update trail
            this.updateTrail();
            
            return false; // No collision detection needed
        }
        
        // Move ball
        const movement = this.velocity.clone().multiplyScalar(deltaTime);
        this.position.add(movement);
        
        // Update mesh position
        this.mesh.position.copy(this.position);
        this.glowMesh.position.copy(this.position);
        
        // Create particle trail
        this.particleSystem.createBallTrail(this.position.clone(), this.velocity);
        
        // Update trail
        this.updateTrail();
        
        // Check wall collisions
        let collision = false;
        
        // Left/right walls
        if (this.position.x < -gameWidth / 2 + this.radius) {
            this.position.x = -gameWidth / 2 + this.radius;
            this.velocity.x = Math.abs(this.velocity.x);
            this.audioManager.playBallWallHit(this.velocity.length() / this.baseSpeed);
            collision = true;
        } else if (this.position.x > gameWidth / 2 - this.radius) {
            this.position.x = gameWidth / 2 - this.radius;
            this.velocity.x = -Math.abs(this.velocity.x);
            this.audioManager.playBallWallHit(this.velocity.length() / this.baseSpeed);
            collision = true;
        }
        
        // Top wall
        if (this.position.y > gameHeight / 2 - this.radius) {
            this.position.y = gameHeight / 2 - this.radius;
            this.velocity.y = -Math.abs(this.velocity.y);
            this.audioManager.playBallWallHit(this.velocity.length() / this.baseSpeed);
            collision = true;
        }
        
        // Bottom (lose condition)
        if (this.position.y < -gameHeight / 2 - this.radius) {
            return true; // Ball lost
        }
        
        // Check paddle collision
        if (this.checkPaddleCollision(paddle)) {
            collision = true;
        }
        
        // If collision occurred, update mesh position again
        if (collision) {
            this.mesh.position.copy(this.position);
            this.glowMesh.position.copy(this.position);
        }
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        return false; // Ball not lost
    }
    
    updateTrail() {
        // Only update trail every few frames to create spacing
        this.trailUpdateCounter++;
        if (this.trailUpdateCounter % 2 === 0) {
            // Shift all positions back
            for (let i = this.trailPositions.length / 3 - 1; i > 0; i--) {
                this.trailPositions[i * 3] = this.trailPositions[(i - 1) * 3];
                this.trailPositions[i * 3 + 1] = this.trailPositions[(i - 1) * 3 + 1];
                this.trailPositions[i * 3 + 2] = this.trailPositions[(i - 1) * 3 + 2];
            }
            
            // Set first position to current ball position
            this.trailPositions[0] = this.position.x;
            this.trailPositions[1] = this.position.y;
            this.trailPositions[2] = this.position.z;
            
            // Update buffer attribute
            this.trail.geometry.attributes.position.needsUpdate = true;
        }
    }
    
    updateVisualEffects(deltaTime) {
        // Pulse glow effect
        const time = Date.now() * 0.001;
        const pulse = 0.3 + 0.1 * Math.sin(time * 5);
        this.glowMesh.material.opacity = pulse;
        
        // Scale glow based on speed
        const speedRatio = this.velocity.length() / this.baseSpeed;
        const glowScale = 1.5 + 0.5 * speedRatio;
        this.glowMesh.scale.set(glowScale, glowScale, glowScale);
        
        // Update trail color based on special properties
        if (this.fireball) {
            this.trail.material.color.set(0xFF8800);
            this.glowMesh.material.color.set(0xFF8800);
        } else if (this.brickBuster) {
            this.trail.material.color.set(0xFFAA00);
            this.glowMesh.material.color.set(0xFFAA00);
        } else {
            this.trail.material.color.set(0x44AAFF);
            this.glowMesh.material.color.set(0x44AAFF);
        }
        
        // Update trail opacity based on speed
        this.trail.material.opacity = 0.3 + 0.4 * speedRatio;
    }
    
    checkPaddleCollision(paddle) {
        // Simple AABB collision check
        const paddleBounds = {
            minX: paddle.position.x - paddle.width / 2,
            maxX: paddle.position.x + paddle.width / 2,
            minY: paddle.position.y - paddle.height / 2,
            maxY: paddle.position.y + paddle.height / 2
        };
        
        const ballBounds = {
            minX: this.position.x - this.radius,
            maxX: this.position.x + this.radius,
            minY: this.position.y - this.radius,
            maxY: this.position.y + this.radius
        };
        
        // Check if ball is colliding with paddle
        if (
            ballBounds.maxX > paddleBounds.minX &&
            ballBounds.minX < paddleBounds.maxX &&
            ballBounds.maxY > paddleBounds.minY &&
            ballBounds.minY < paddleBounds.maxY
        ) {
            // Calculate bounce angle based on where ball hit paddle
            const hitPosition = (this.position.x - paddle.position.x) / (paddle.width / 2);
            const bounceAngle = hitPosition * Math.PI / 3; // -60 to 60 degrees
            
            // Set new velocity
            const speed = this.velocity.length();
            this.velocity.x = Math.sin(bounceAngle) * speed;
            this.velocity.y = Math.abs(Math.cos(bounceAngle) * speed);
            
            // Add a bit of the paddle's velocity to the ball
            this.velocity.x += paddle.velocity.x * 0.2;
            
            // Normalize and scale to maintain consistent speed
            this.velocity.normalize().multiplyScalar(speed);
            
            // Move ball out of paddle
            this.position.y = paddleBounds.maxY + this.radius;
            
            // Play sound
            this.audioManager.playBallPaddleHit(speed / this.baseSpeed);
            
            // If magnetic paddle, attach ball
            if (this.magnetic) {
                this.attachToPaddle(paddle);
            }
            
            return true;
        }
        
        return false;
    }
    
    checkBrickCollision(brick) {
        // Simple AABB collision check
        const brickBounds = {
            minX: brick.position.x - 0.9, // Half width of brick
            maxX: brick.position.x + 0.9,
            minY: brick.position.y - 0.4, // Half height of brick
            maxY: brick.position.y + 0.4,
            minZ: brick.position.z - 0.4, // Half depth of brick
            maxZ: brick.position.z + 0.4
        };
        
        const ballBounds = {
            minX: this.position.x - this.radius,
            maxX: this.position.x + this.radius,
            minY: this.position.y - this.radius,
            maxY: this.position.y + this.radius,
            minZ: this.position.z - this.radius,
            maxZ: this.position.z + this.radius
        };
        
        // Check if ball is colliding with brick
        if (
            ballBounds.maxX > brickBounds.minX &&
            ballBounds.minX < brickBounds.maxX &&
            ballBounds.maxY > brickBounds.minY &&
            ballBounds.minY < brickBounds.maxY &&
            ballBounds.maxZ > brickBounds.minZ &&
            ballBounds.minZ < brickBounds.maxZ
        ) {
            // Determine which side of the brick was hit
            const overlapX = Math.min(ballBounds.maxX - brickBounds.minX, brickBounds.maxX - ballBounds.minX);
            const overlapY = Math.min(ballBounds.maxY - brickBounds.minY, brickBounds.maxY - ballBounds.minY);
            
            // Bounce based on which side has the smallest overlap
            if (overlapX < overlapY) {
                // Hit left or right side
                this.velocity.x = -this.velocity.x;
                
                // Move ball out of brick
                if (this.position.x < brick.position.x) {
                    this.position.x = brickBounds.minX - this.radius;
                } else {
                    this.position.x = brickBounds.maxX + this.radius;
                }
            } else {
                // Hit top or bottom
                this.velocity.y = -this.velocity.y;
                
                // Move ball out of brick
                if (this.position.y < brick.position.y) {
                    this.position.y = brickBounds.minY - this.radius;
                } else {
                    this.position.y = brickBounds.maxY + this.radius;
                }
            }
            
            // Update mesh position
            this.mesh.position.copy(this.position);
            this.glowMesh.position.copy(this.position);
            
            return true;
        }
        
        return false;
    }
    
    setFireball(active) {
        this.fireball = active;
        
        if (active) {
            // Update ball appearance for fireball
            this.mesh.material.color.set(0xFF8800);
            this.mesh.material.emissive.set(0xFF8800);
        } else {
            // Reset to normal appearance
            this.mesh.material.color.set(0x44AAFF);
            this.mesh.material.emissive.set(0x44AAFF);
        }
    }
    
    setBrickBuster(active) {
        this.brickBuster = active;
        
        if (active) {
            // Update ball appearance for brick buster
            this.mesh.material.color.set(0xFFAA00);
            this.mesh.material.emissive.set(0xFFAA00);
        } else {
            // Reset to normal appearance
            this.mesh.material.color.set(0x44AAFF);
            this.mesh.material.emissive.set(0x44AAFF);
        }
    }
    
    setMagnetic(active) {
        this.magnetic = active;
    }
    
    setSlowMotion(active) {
        if (active) {
            this.speed = this.baseSpeed * 0.7;
            
            // Scale velocity to new speed
            const direction = this.velocity.clone().normalize();
            this.velocity = direction.multiplyScalar(this.speed);
        } else {
            this.speed = this.baseSpeed;
            
            // Scale velocity to original speed
            const direction = this.velocity.clone().normalize();
            this.velocity = direction.multiplyScalar(this.speed);
        }
    }
    
    attachToPaddle(paddle) {
        this.attachedToPaddle = true;
        this.attachOffset = this.position.x - paddle.position.x;
    }
    
    release() {
        if (this.attachedToPaddle) {
            this.attachedToPaddle = false;
            
            // Set initial velocity (upward with slight angle)
            const angle = Utils.random(-Math.PI / 4, Math.PI / 4);
            this.velocity.x = Math.sin(angle) * this.speed;
            this.velocity.y = Math.cos(angle) * this.speed;
        }
    }
    
    isAttached() {
        return this.attachedToPaddle;
    }
    
    split() {
        // Create two new balls at slight angles from this one
        const ball1 = new Ball(
            this.scene,
            this.audioManager,
            this.particleSystem,
            this.position.clone()
        );
        
        const ball2 = new Ball(
            this.scene,
            this.audioManager,
            this.particleSystem,
            this.position.clone()
        );
        
        // Set velocities at angles from original
        const speed = this.velocity.length();
        const direction = this.velocity.clone().normalize();
        
        // Create a perpendicular vector
        const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).normalize();
        
        // Set velocities for new balls
        const angle1 = Math.PI / 6; // 30 degrees
        const angle2 = -Math.PI / 6; // -30 degrees
        
        ball1.velocity = new THREE.Vector3(
            direction.x * Math.cos(angle1) + perpendicular.x * Math.sin(angle1),
            direction.y * Math.cos(angle1) + perpendicular.y * Math.sin(angle1),
            0
        ).normalize().multiplyScalar(speed);
        
        ball2.velocity = new THREE.Vector3(
            direction.x * Math.cos(angle2) + perpendicular.x * Math.sin(angle2),
            direction.y * Math.cos(angle2) + perpendicular.y * Math.sin(angle2),
            0
        ).normalize().multiplyScalar(speed);
        
        // Copy special properties
        ball1.setFireball(this.fireball);
        ball1.setBrickBuster(this.brickBuster);
        ball1.setMagnetic(this.magnetic);
        
        ball2.setFireball(this.fireball);
        ball2.setBrickBuster(this.brickBuster);
        ball2.setMagnetic(this.magnetic);
        
        if (this.speed !== this.baseSpeed) {
            ball1.setSlowMotion(true);
            ball2.setSlowMotion(true);
        }
        
        return [ball1, ball2];
    }
    
    dispose() {
        // Remove meshes from scene
        this.scene.remove(this.mesh);
        this.scene.remove(this.glowMesh);
        this.scene.remove(this.trail);
    }
}
