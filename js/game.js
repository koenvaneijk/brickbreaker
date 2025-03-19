/**
 * Main game class for Cosmic Brick Breaker
 */

class Game {
    constructor() {
        // Game state
        this.state = 'start'; // start, playing, paused, gameOver
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore') || '0');
        this.combo = 0;
        this.comboTimer = 0;
        this.difficulty = 1;
        this.difficultyTimer = 0;
        this.ballsRemaining = 3;
        
        // Game dimensions
        this.width = 20;
        this.height = 30;
        
        // Setup DOM elements
        this.setupDOM();
        
        // Setup Three.js scene
        this.setupScene();
        
        // Create audio manager
        this.audioManager = new AudioManager();
        
        // Create particle system
        this.particleSystem = new ParticleSystem(this.scene);
        
        // Create power-up manager
        this.powerUpManager = new PowerUpManager(this.scene, this.audioManager, this.particleSystem);
        
        // Create brick manager
        this.brickManager = new BrickManager(
            this.scene,
            this.audioManager,
            this.particleSystem,
            this.powerUpManager
        );
        
        // Create paddle
        this.paddle = new Paddle(this.scene, this.audioManager, this.particleSystem);
        this.paddle.setupEventListeners();
        
        // Create initial ball
        this.balls = [];
        this.createInitialBall();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start animation loop
        this.lastTime = 0;
        this.animate();
    }
    
    setupDOM() {
        // Get DOM elements
        this.gameContainer = document.getElementById('game-container');
        this.scoreValue = document.getElementById('score-value');
        this.highScoreValue = document.getElementById('high-score-value');
        this.ballsValue = document.getElementById('balls-value');
        this.finalScore = document.getElementById('final-score');
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over');
        this.startButton = document.getElementById('start-button');
        this.restartButton = document.getElementById('restart-button');
        
        // Set initial values
        this.scoreValue.textContent = '0';
        this.highScoreValue.textContent = Utils.formatNumber(this.highScore);
        this.ballsValue.textContent = this.ballsRemaining;
    }
    
    setupScene() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 25);
        
        // Adjust game width based on aspect ratio
        this.updateGameDimensions();
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000);
        this.renderer.shadowMap.enabled = true;
        this.gameContainer.appendChild(this.renderer.domElement);
        
        // Add lights
        this.setupLights();
        
        // Add environment
        this.setupEnvironment();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x333333);
        this.scene.add(ambientLight);
        
        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(10, 10, 10);
        mainLight.castShadow = true;
        mainLight.shadow.camera.left = -15;
        mainLight.shadow.camera.right = 15;
        mainLight.shadow.camera.top = 15;
        mainLight.shadow.camera.bottom = -15;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);
        
        // Colored point lights for atmosphere
        const colors = [0x0088ff, 0x88ff00, 0xff8800];
        const positions = [
            new THREE.Vector3(-10, 5, 5),
            new THREE.Vector3(10, 5, 5),
            new THREE.Vector3(0, -10, 5)
        ];
        
        this.pointLights = [];
        
        for (let i = 0; i < colors.length; i++) {
            const light = new THREE.PointLight(colors[i], 0.5, 20);
            light.position.copy(positions[i]);
            this.scene.add(light);
            this.pointLights.push(light);
        }
    }
    
    setupEnvironment() {
        // Create skybox
        this.createSkybox();
        
        // Create grid floor
        this.createGridFloor();
        
        // Create walls
        this.createWalls();
    }
    
    createSkybox() {
        // Create procedural skybox
        const skyboxGeometry = new THREE.BoxGeometry(200, 200, 200);
        const skyboxMaterials = [];
        
        for (let i = 0; i < 6; i++) {
            // Create canvas for each face
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Fill with gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, 512);
            gradient.addColorStop(0, '#000510');
            gradient.addColorStop(1, '#001030');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 512, 512);
            
            // Add stars
            for (let j = 0; j < 100; j++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const radius = Math.random() * 2;
                const opacity = Math.random();
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.fill();
            }
            
            // Add nebula
            if (i === 2 || i === 3) {
                ctx.beginPath();
                const nebulaX = 256;
                const nebulaY = 256;
                const nebulaRadius = 200;
                
                const nebulaGradient = ctx.createRadialGradient(
                    nebulaX, nebulaY, 0,
                    nebulaX, nebulaY, nebulaRadius
                );
                
                nebulaGradient.addColorStop(0, 'rgba(100, 50, 255, 0.2)');
                nebulaGradient.addColorStop(0.5, 'rgba(50, 100, 255, 0.1)');
                nebulaGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = nebulaGradient;
                ctx.fillRect(0, 0, 512, 512);
            }
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            skyboxMaterials.push(new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.BackSide
            }));
        }
        
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
        this.scene.add(skybox);
    }
    
    createGridFloor() {
        // Create grid helper
        const gridSize = 50;
        const gridDivisions = 50;
        const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x0088ff, 0x004488);
        gridHelper.position.y = -15;
        this.scene.add(gridHelper);
        
        // Create floor plane
        const floorGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
        const floorMaterial = new THREE.MeshPhongMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.5,
            shininess: 100
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -15;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }
    
    createWalls() {
        // Create walls with current dimensions
        this.updateWalls();
    }
    
    setupEventListeners() {
        // Start button
        this.startButton.addEventListener('click', () => this.startGame());
        
        // Restart button
        this.restartButton.addEventListener('click', () => this.restartGame());
        
        // Keyboard controls
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        
        // Mouse click to release ball
        document.addEventListener('click', (event) => {
            // Don't trigger if clicking on a button
            if (event.target.closest('button') || event.target.closest('.control-button')) return;
            this.releaseBall();
        });
        
        // Touch to release ball
        document.addEventListener('touchstart', (event) => {
            // Don't trigger if touching a button
            if (event.target.closest('button') || event.target.closest('.control-button')) return;
            this.releaseBall();
        });
        
        // Mute button
        const muteButton = document.getElementById('mute-button');
        muteButton.addEventListener('click', () => {
            const isMuted = this.audioManager.toggleMute();
            muteButton.textContent = isMuted ? '🔇' : '🔊';
            muteButton.classList.toggle('muted', isMuted);
        });
    }
    
    handleKeyDown(event) {
        switch (event.key) {
            case ' ':
            case 'Spacebar':
                this.releaseBall();
                break;
            case 'p':
            case 'P':
                this.togglePause();
                break;
            case 'm':
            case 'M':
                this.audioManager.toggleMute();
                break;
        }
    }
    
    releaseBall() {
        if (this.state !== 'playing') return;
        
        // Release any attached balls
        let ballReleased = false;
        
        this.balls.forEach(ball => {
            if (ball.isAttached()) {
                ball.release();
                ballReleased = true;
            }
        });
        
        return ballReleased;
    }
    
    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
        } else if (this.state === 'paused') {
            this.state = 'playing';
        }
    }
    
    startGame() {
        // Initialize audio
        this.audioManager.init().then(() => {
            // Hide start screen
            this.startScreen.classList.add('hidden');
            
            // Reset game state
            this.resetGame();
            
            // Start music
            this.audioManager.startMusic();
            
            // Generate initial level
            this.brickManager.generateLevel(this.difficulty);
            
            // Set game state to playing
            this.state = 'playing';
        });
    }
    
    restartGame() {
        // Hide game over screen
        this.gameOverScreen.classList.add('hidden');
        
        // Reset game state
        this.resetGame();
        
        // Generate initial level
        this.brickManager.generateLevel(this.difficulty);
        
        // Set game state to playing
        this.state = 'playing';
    }
    
    resetGame() {
        // Reset score and combo
        this.score = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.scoreValue.textContent = '0';
        
        // Reset difficulty
        this.difficulty = 1;
        this.difficultyTimer = 0;
        
        // Reset balls
        this.ballsRemaining = 3;
        this.ballsValue.textContent = this.ballsRemaining;
        
        // Clear existing balls
        this.balls.forEach(ball => ball.dispose());
        this.balls = [];
        
        // Create initial ball
        this.createInitialBall();
        
        // Reset paddle
        this.paddle.reset();
        
        // Clear power-ups
        this.powerUpManager.clearPowerUps();
        
        // Clear bricks
        this.brickManager.clearBricks();
    }
    
    createInitialBall() {
        const ball = new Ball(
            this.scene,
            this.audioManager,
            this.particleSystem,
            new THREE.Vector3(0, -11, 0)
        );
        
        // Attach ball to paddle
        ball.attachToPaddle(this.paddle);
        
        this.balls.push(ball);
    }
    
    gameOver() {
        // Set game state
        this.state = 'gameOver';
        
        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore.toString());
            this.highScoreValue.textContent = Utils.formatNumber(this.highScore);
        }
        
        // Show game over screen
        this.finalScore.textContent = Utils.formatNumber(this.score);
        this.gameOverScreen.classList.remove('hidden');
        
        // Play game over sound
        this.audioManager.playGameOver();
    }
    
    onWindowResize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update game dimensions
        this.updateGameDimensions();
        
        // Recreate walls with new dimensions
        this.updateWalls();
    }
    
    updateGameDimensions() {
        // Calculate game width based on aspect ratio and height
        const aspectRatio = window.innerWidth / window.innerHeight;
        this.height = 30; // Keep height constant
        this.width = Math.min(30, this.height * aspectRatio * 0.7); // Limit max width
    }
    
    updateWalls() {
        // Remove existing walls
        if (this.leftWall) this.scene.remove(this.leftWall);
        if (this.rightWall) this.scene.remove(this.rightWall);
        if (this.topWall) this.scene.remove(this.topWall);
        
        // Create new walls with updated dimensions
        const wallMaterial = new THREE.MeshPhongMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        
        // Left wall
        const leftWallGeometry = new THREE.PlaneGeometry(1, this.height);
        this.leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        this.leftWall.position.set(-this.width / 2 - 0.5, 0, 0);
        this.leftWall.rotation.y = Math.PI / 2;
        this.scene.add(this.leftWall);
        
        // Right wall
        const rightWallGeometry = new THREE.PlaneGeometry(1, this.height);
        this.rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
        this.rightWall.position.set(this.width / 2 + 0.5, 0, 0);
        this.rightWall.rotation.y = -Math.PI / 2;
        this.scene.add(this.rightWall);
        
        // Top wall
        const topWallGeometry = new THREE.PlaneGeometry(this.width, 1);
        this.topWall = new THREE.Mesh(topWallGeometry, wallMaterial);
        this.topWall.position.set(0, this.height / 2 + 0.5, 0);
        this.topWall.rotation.x = Math.PI / 2;
        this.scene.add(this.topWall);
    }
    
    animate(time = 0) {
        requestAnimationFrame((t) => this.animate(t));
        
        // Calculate delta time
        const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1); // Cap at 0.1 seconds
        this.lastTime = time;
        
        // Skip update if game is not playing
        if (this.state !== 'playing') {
            // Still render the scene
            this.renderer.render(this.scene, this.camera);
            return;
        }
        
        // Update game
        this.update(deltaTime);
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
        
        // Update music intensity based on gameplay
        if (this.state === 'playing' && this.audioManager.initialized) {
            const brickRatio = 1 - (this.brickManager.getDestructibleBrickCount() / 50);
            const comboFactor = Math.min(this.combo / 10, 1);
            const intensity = Math.max(brickRatio, comboFactor);
            this.audioManager.setMusicIntensity(intensity);
        }
    }
    
    update(deltaTime) {
        // Store game dimensions in scene for other objects to access
        this.scene.userData.gameWidth = this.width;
        this.scene.userData.gameHeight = this.height;
        
        // Update paddle
        this.paddle.update(deltaTime, this.width);
        
        // Update balls
        this.updateBalls(deltaTime);
        
        // Update bricks
        this.brickManager.update(deltaTime);
        
        // Update power-ups
        this.powerUpManager.update(deltaTime, this.paddle);
        
        // Update particles
        this.particleSystem.update(deltaTime);
        
        // Update combo timer
        if (this.combo > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }
        
        // Update difficulty
        this.difficultyTimer += deltaTime;
        if (this.difficultyTimer >= 30) { // Increase difficulty every 30 seconds
            this.difficultyTimer = 0;
            this.difficulty += 0.5;
            
            // Regenerate some bricks
            this.brickManager.regenerateBricks(this.difficulty, 5);
            
            // Play level up sound
            this.audioManager.playLevelUp();
        }
        
        // Update music intensity based on combo and remaining bricks
        const brickRatio = 1 - (this.brickManager.getDestructibleBrickCount() / 50);
        const comboFactor = Math.min(this.combo / 10, 1);
        const intensity = Math.max(brickRatio, comboFactor);
        this.audioManager.setMusicIntensity(intensity);
        
        // Check if we need to regenerate bricks
        if (this.brickManager.getBrickCount() < 10) {
            this.brickManager.regenerateBricks(this.difficulty, 10);
        }
        
        // Update point lights
        this.updateLights(deltaTime);
        
        // Check for laser collisions with bricks
        this.checkLaserBrickCollisions();
    }
    
    updateBalls(deltaTime) {
        // Apply power-up effects to all balls
        const slowMotion = this.powerUpManager.isPowerUpActive('slowMotion');
        const fireball = this.powerUpManager.isPowerUpActive('fireball');
        const brickBuster = this.powerUpManager.isPowerUpActive('brickBuster');
        const magnetic = this.powerUpManager.isPowerUpActive('magneticPaddle');
        
        // Update each ball
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            
            // Apply power-up effects
            ball.setSlowMotion(slowMotion);
            ball.setFireball(fireball);
            ball.setBrickBuster(brickBuster);
            ball.setMagnetic(magnetic);
            
            // Update ball
            const ballLost = ball.update(deltaTime, this.paddle, this.width, this.height);
            
            // Check if ball is lost
            if (ballLost) {
                // Remove ball
                ball.dispose();
                this.balls.splice(i, 1);
                
                // Check if shield is active
                if (this.paddle.hasShield()) {
                    // Deactivate shield
                    this.paddle.deactivateShield();
                    
                    // Create new ball
                    const newBall = new Ball(
                        this.scene,
                        this.audioManager,
                        this.particleSystem,
                        new THREE.Vector3(0, -11, 0)
                    );
                    
                    // Attach ball to paddle
                    newBall.attachToPaddle(this.paddle);
                    
                    this.balls.push(newBall);
                    
                    // Deactivate shield power-up
                    this.powerUpManager.deactivatePowerUp('shield');
                    
                    continue;
                }
                
                // If no balls left, lose a life
                if (this.balls.length === 0) {
                    this.ballsRemaining--;
                    this.ballsValue.textContent = this.ballsRemaining;
                    
                    // Check for game over
                    if (this.ballsRemaining <= 0) {
                        this.gameOver();
                        return;
                    }
                    
                    // Create new ball
                    this.createInitialBall();
                }
            }
            
            // Check brick collisions
            this.checkBallBrickCollisions(ball);
        }
        
        // Handle multi-ball power-up
        if (this.powerUpManager.isPowerUpActive('multiBall') && this.balls.length === 1) {
            // Split the existing ball into 3
            const newBalls = this.balls[0].split();
            this.balls.push(...newBalls);
            
            // Deactivate multi-ball power-up
            this.powerUpManager.deactivatePowerUp('multiBall');
        }
    }
    
    checkBallBrickCollisions(ball) {
        // Check collision with each brick
        for (let i = this.brickManager.bricks.length - 1; i >= 0; i--) {
            const brick = this.brickManager.bricks[i];
            
            if (ball.checkBrickCollision(brick)) {
                // Hit brick
                const points = this.brickManager.hitBrick(brick, ball);
                
                // Add points to score
                if (points > 0) {
                    // Apply combo multiplier
                    const comboMultiplier = 1 + this.combo * 0.1;
                    const finalPoints = Math.floor(points * comboMultiplier);
                    
                    this.score += finalPoints;
                    this.scoreValue.textContent = Utils.formatNumber(this.score);
                    
                    // Increase combo
                    this.combo++;
                    this.comboTimer = 5; // Reset combo timer (5 seconds)
                }
                
                // If ball has brick buster, don't bounce
                if (ball.brickBuster) {
                    // Restore original velocity direction
                    ball.velocity.normalize().multiplyScalar(ball.speed);
                } else if (!ball.fireball) {
                    // Only break one brick if not fireball
                    break;
                }
            }
        }
    }
    
    checkLaserBrickCollisions() {
        // Only check if laser cannon power-up is active
        if (!this.powerUpManager.isPowerUpActive('laserCannon')) return;
        
        // Get all active lasers
        const lasers = this.paddle.getLasers();
        
        // Check each laser against each brick
        for (const laser of lasers) {
            // Create a ray from laser position upward
            const raycaster = new THREE.Raycaster(
                laser.position.clone(),
                new THREE.Vector3(0, 1, 0),
                0,
                20
            );
            
            // Get all intersected bricks
            const intersects = raycaster.intersectObjects(this.brickManager.bricks);
            
            // Hit the first brick
            if (intersects.length > 0) {
                const brick = intersects[0].object;
                
                // Hit brick
                const points = this.brickManager.hitBrick(brick, { velocity: new THREE.Vector3(0, 10, 0) });
                
                // Add points to score
                if (points > 0) {
                    this.score += points;
                    this.scoreValue.textContent = Utils.formatNumber(this.score);
                }
            }
        }
    }
    
    updateLights(deltaTime) {
        // Animate point lights
        const time = Date.now() * 0.001;
        
        this.pointLights.forEach((light, index) => {
            // Oscillate intensity
            light.intensity = 0.5 + 0.2 * Math.sin(time * (1 + index * 0.1));
            
            // Move lights slightly
            const radius = 10 + index * 2;
            const speed = 0.2 + index * 0.05;
            light.position.x = Math.sin(time * speed) * radius;
            light.position.z = Math.cos(time * speed) * radius;
        });
    }
}
