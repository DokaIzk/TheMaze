// Game Scene - Core gameplay logic
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // Game state
        this.gameState = {
            score: 0,
            level: 1,
            timeLeft: CONFIG.BASE_TIME,
            isGameOver: false,
            isPaused: false
        };
        
        // Game objects
        this.player = null;
        this.mainSTX = null;
        this.miniSTXs = [];
        this.walls = null;
        
        // Maze data
        this.maze = null;
        this.collisionGrid = null;
        
        // Input
        this.cursors = null;
        this.wasd = null;
        
        // Timer
        this.gameTimer = null;
        
        // User maze configuration (received from MazeCreationScene)
        this.userMazeConfig = null;
        
        // Level completion tracking for blockchain
        this.levelCompletions = [];
    }

    create(data) {
        
        // Set transparent background for better mobile visibility
        this.cameras.main.setBackgroundColor('#000000');
        
        // Clean up any lingering title overlay from previous scenes
        // const titleOverlay = document.getElementById('title-overlay');
        // if (titleOverlay) {
        //     titleOverlay.remove();
        // }
        
        // Show UI overlay for gameplay (score, level, timer) and reset values
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) {
            uiOverlay.style.display = 'flex';
            uiOverlay.style.visibility = 'visible';
            uiOverlay.style.opacity = '1';
            uiOverlay.style.pointerEvents = 'none';
        }
        
        // Ensure UI elements are visible
        const uiElements = document.querySelectorAll('.ui-element');
        uiElements.forEach(el => {
            el.style.visibility = 'visible';
            el.style.opacity = '1';
        });
        
        // Reset game state values to prevent title screen text from persisting
        this.gameState = {
            score: 0,
            level: 1,
            timeLeft: CONFIG.BASE_TIME,
            isGameOver: false,
            isPaused: false
        };
        
        // Store user maze configuration
        if (data && data.userMazeConfig) {
            this.userMazeConfig = data.userMazeConfig;
            
            // Adjust starting difficulty based on user selection
            this.adjustGameDifficulty();
        }
        
        // Ensure canvas has keyboard focus
        this.game.canvas.setAttribute('tabindex', '1');
        this.game.canvas.focus();
        
        // Initialize input
        this.setupInput();
        
        // Generate first maze (this will calculate proper responsive maze offset)
        this.generateNewLevel();
        
        // Start game timer
        this.startTimer();
        
        // Update UI
        this.updateUI();
        
        // Setup pause functionality
        this.setupPause();
    }

    setupInput() {
        // Arrow keys
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // WASD keys
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        
        // Mobile touch controls
        this.setupMobileControls();
        
        // Pause key - use global keyboard event to work even when scene is paused
        window.addEventListener('keydown', (event) => {
            if (event.key === 'p' || event.key === 'P') {
                this.togglePause();
            }
            // Jump to level 10 with "0" key (cheat/testing feature)
            if (event.key === '0' && !this.gameState.isGameOver) {
                this.jumpToLevel(10);
            }
        });
    }

    setupMobileControls() {
        // Touch/swipe gesture detection
        let startX, startY, startTime;
        let isPointerDown = false;
        let lastMoveX = 0, lastMoveY = 0;
        const minSwipeDistance = 50;
        const maxTapTime = 200; // milliseconds
        
        window.addEventListener('touchmove', (e) => { 
            e.preventDefault();
            const X = e.touches[0].clientX;
            const Y = e.touches[0].clientY;
         }, { passive: false });

        this.input.on('pointerdown', (pointer) => {
            if (this.gameState.isGameOver || this.gameState.isPaused) return;
            
            startX = pointer.x;
            startY = pointer.y;
            startTime = this.time.now;
            isPointerDown = true;
            lastMoveX = 0;
            lastMoveY = 0;
        });
        
        this.input.on('pointermove', (pointer) => {
            // Mobile drag movement with collision detection - continuous smooth movement
            if (isPointerDown && startX && startY && this.player && !this.gameState.isGameOver && !this.gameState.isPaused) {
                const deltaX = pointer.x - startX;
                const deltaY = pointer.y - startY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // Only move if dragged significant distance
                if (distance > 20 && distance < minSwipeDistance) {
                    // Normalize the movement direction - use small incremental steps for collision
                    const angle = Math.atan2(deltaY, deltaX);
                    const speed = CONFIG.PLAYER_SPEED / 120; // Slower incremental movement
                    const moveX = Math.cos(angle) * speed;
                    const moveY = Math.sin(angle) * speed;
                    
                    // Apply incremental movement with full collision detection
                    const mazeRelativeX = this.player.x - this.mazeOffsetX;
                    const mazeRelativeY = this.player.y - this.mazeOffsetY;
                    
                    const newPosition = CollisionSystem.getValidMovePosition(
                        mazeRelativeX, mazeRelativeY,
                        moveX, moveY,
                        this.getScaledPlayerSize(), this.getScaledPlayerSize(),
                        this.collisionGrid, this.levelCellSize || CONFIG.CELL_SIZE,
                        this.maze.grid
                    );
                    
                    // Only update if position actually changed (collision allowed it)
                    const worldX = newPosition.x + this.mazeOffsetX;
                    const worldY = newPosition.y + this.mazeOffsetY;
                    
                    if (worldX !== this.player.x || worldY !== this.player.y) {
                        this.player.setPosition(worldX, worldY);
                        lastMoveX = moveX;
                        lastMoveY = moveY;
                    }
                }
            }
        });
        
        this.input.on('pointerup', (pointer) => {
            if (!startX || !startY) return;
            isPointerDown = false;
            
            const deltaX = pointer.x - startX;
            const deltaY = pointer.y - startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const timeDiff = this.time.now - startTime;
            
            // Check for tap (short touch without movement)
            if (distance < 20 && timeDiff < maxTapTime) {
                this.togglePause();
                startX = startY = startTime = null;
                return;
            }
            
            // Only handle swipes on touch devices or when distance is significant
            if (distance < minSwipeDistance) {
                // Reset variables for short movements
                startX = startY = startTime = null;
                return;
            }
            
            // Determine swipe direction with collision detection
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (deltaX > 0) {
                    this.movePlayer('right');
                } else {
                    this.movePlayer('left');
                }
            } else {
                // Vertical swipe
                if (deltaY > 0) {
                    this.movePlayer('down');
                } else {
                    this.movePlayer('up');
                }
            }
            
            startX = startY = startTime = null;
        });
    }

    movePlayer(direction) {
        if (!this.player || this.gameState.isGameOver || this.gameState.isPaused) return;
        
        const moveDistance = this.levelCellSize || CONFIG.CELL_SIZE; // Move one cell at a time on mobile
        let deltaX = 0, deltaY = 0;
        
        switch(direction) {
            case 'up': deltaY = -moveDistance; break;
            case 'down': deltaY = moveDistance; break;
            case 'left': deltaX = -moveDistance; break;
            case 'right': deltaX = moveDistance; break;
        }
        
        // Same collision logic as keyboard movement
        const mazeRelativeX = this.player.x - this.mazeOffsetX;
        const mazeRelativeY = this.player.y - this.mazeOffsetY;
        
        const newPosition = CollisionSystem.getValidMovePosition(
            mazeRelativeX, mazeRelativeY,
            deltaX, deltaY,
            this.getScaledPlayerSize(), this.getScaledPlayerSize(),
            this.collisionGrid, this.levelCellSize || CONFIG.CELL_SIZE,
            this.maze.grid  // Pass the maze grid for wall checking
        );
        
        // Smooth animation to new position
        this.tweens.add({
            targets: this.player,
            x: newPosition.x + this.mazeOffsetX,
            y: newPosition.y + this.mazeOffsetY,
            duration: 150,
            ease: 'Power2'
        });
    }

    generateNewLevel() {
        // Clear existing objects
        this.clearLevel();
        
        // Calculate maze dimensions based on level (progressive scaling)
        const mazeConfig = this.getMazeConfigForLevel(this.gameState.level);
        
        // Generate maze with level-appropriate complexity
        this.maze = new MazeGenerator(
            mazeConfig.width, 
            mazeConfig.height, 
            mazeConfig.removeWallsRatio  // Pass complexity parameter
        );
        this.maze.generate();
        this.collisionGrid = this.maze.toCollisionGrid();
        
        // Calculate dynamic cell size with mobile optimization
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
    
        // Responsive sizing - works for any screen size
        const uiSpaceTop = 45; // Fixed top margin for UI area
        const horizontalPadding = 10; // 10px padding on left/right
        const verticalMargin = 45; // 45px gap above maze
        
        // Calculate available space based on actual screen/canvas size
        const screenWidth = isMobile ? window.innerWidth : CONFIG.CANVAS_WIDTH;
        const screenHeight = isMobile ? window.innerHeight : CONFIG.CANVAS_HEIGHT;
        
        const availableWidth = screenWidth - (horizontalPadding * 2);
        const availableHeight = screenHeight - uiSpaceTop - verticalMargin;
        
        // Calculate dynamic cell size that fits both width and height
        let dynamicCellSize;
        let mazePixelWidth;
        let mazePixelHeight;
        
        // Calculate cell sizes for both dimensions
        const cellSizeForWidth = Math.floor(availableWidth / mazeConfig.width);
        const cellSizeForHeight = Math.floor(availableHeight / mazeConfig.height);
        
        // Use the smaller one to ensure maze fits in both dimensions
        dynamicCellSize = Math.min(cellSizeForWidth, cellSizeForHeight);
        dynamicCellSize = Math.max(4, dynamicCellSize); // Minimum 4px per cell
        
        // Calculate final maze dimensions
        mazePixelWidth = mazeConfig.width * dynamicCellSize;
        mazePixelHeight = mazeConfig.height * dynamicCellSize;
        
        // Position maze - centered horizontally with padding, positioned below UI
        this.mazeOffsetX = horizontalPadding + (availableWidth - mazePixelWidth) / 2;
        this.mazeOffsetY = uiSpaceTop + verticalMargin;
        
        // Store the dynamic cell size for this level (temporary solution)
        this.levelCellSize = dynamicCellSize;
        
        
        // Create visual representation
        this.createMazeVisuals();
        
        // Place player at start
        this.createPlayer();
        
        // Place main STX token
        this.createMainSTX();
        
        // Place mini STX tokens
        this.createMiniSTXs();
        
        // Update timer for level
        this.updateLevelTimer();
    }

    getMazeConfigForLevel(level) {
        // Progressive difficulty scaling from level 1 to 10
        // Level 1: Simple maze with fewer walls (easier)
        // Level 10: Complex maze with more walls (harder)
        
        const minSize = 20;  // Starting maze size
        const maxSize = 40;  // Maximum maze size
        
        // Calculate maze dimensions (linear progression)
        const sizeRange = maxSize - minSize;
        const sizeProgress = Math.min((level - 1) / 9, 1); // 0 to 1 over 10 levels
        const mazeSize = Math.floor(minSize + (sizeRange * sizeProgress));
        
        // Complexity settings - INVERTED: Level 1 has MORE walls removed (easier), Level 10 has NONE removed (hardest)
        const complexityLevels = [
            { level: 1, name: 'Very Easy', removeWalls: 0.65 },      // 65% walls removed = very open, very easy
            { level: 2, name: 'Very Easy', removeWalls: 0.58 },      // 58% walls removed = still very open
            { level: 3, name: 'Easy', removeWalls: 0.50 },           // 50% walls removed = easy
            { level: 4, name: 'Easy', removeWalls: 0.42 },           // 42% walls removed = still easy
            { level: 5, name: 'Medium', removeWalls: 0.35 },         // 35% walls removed = getting harder
            { level: 6, name: 'Medium', removeWalls: 0.28 },         // 28% walls removed = moderate
            { level: 7, name: 'Hard', removeWalls: 0.15 },           // 15% walls removed = challenging
            { level: 8, name: 'Very Hard', removeWalls: 0.08 },      // 8% walls removed = very hard
            { level: 9, name: 'Extreme', removeWalls: 0.04 },        // 4% walls removed = extreme
            { level: 10, name: 'Nightmare', removeWalls: 0.02 }       // 2% walls removed = maximum walls but passable
        ];
        
        const complexityIndex = Math.min(level - 1, complexityLevels.length - 1);
        const complexity = complexityLevels[complexityIndex];
        
        return {
            width: mazeSize,
            height: mazeSize,
            complexity: complexity.name,
            removeWallsRatio: complexity.removeWalls
        };
    }

    clearLevel() {
        // Remove existing game objects
        if (this.mazeGraphics) {
            this.mazeGraphics.destroy();
        }
        if (this.player) {
            this.player.destroy();
        }
        if (this.mainSTX) {
            this.mainSTX.destroy();
        }
        this.miniSTXs.forEach(miniSTX => miniSTX.destroy());
        this.miniSTXs = [];
    }

    createMazeVisuals() {        
        // Create graphics object for drawing lines
        this.mazeGraphics = this.add.graphics();
        this.mazeGraphics.setDepth(1);
        
        // Set line style - thicker lines on mobile for better visibility
        const isMobile = window.innerWidth <= 768;
        const lineWidth = isMobile ? 3 : 2;
        this.mazeGraphics.lineStyle(lineWidth, 0x8B5CF6, 1.0);
        
        // Draw maze walls as lines instead of filled cells
        if (!this.maze || !this.maze.grid) {
            console.error('Maze or maze grid is not available!');
            return;
        }
        
        if (!this.levelCellSize) {
            console.error('levelCellSize is not set!');
            return;
        }
        
        for (let y = 0; y < this.maze.height; y++) {
            for (let x = 0; x < this.maze.width; x++) {
                const cell = this.maze.grid[y][x];
                if (!cell) {
                    console.error('Cell is undefined at', x, y);
                    continue;
                }
                
                const worldX = x * this.levelCellSize + this.mazeOffsetX;
                const worldY = y * this.levelCellSize + this.mazeOffsetY;
                
                // Draw walls as lines around each cell
                if (cell.walls && cell.walls.top) {
                    this.mazeGraphics.moveTo(worldX, worldY);
                    this.mazeGraphics.lineTo(worldX + this.levelCellSize, worldY);
                }
                
                if (cell.walls && cell.walls.right) {
                    this.mazeGraphics.moveTo(worldX + this.levelCellSize, worldY);
                    this.mazeGraphics.lineTo(worldX + this.levelCellSize, worldY + this.levelCellSize);
                }
                
                if (cell.walls && cell.walls.bottom) {
                    this.mazeGraphics.moveTo(worldX + this.levelCellSize, worldY + this.levelCellSize);
                    this.mazeGraphics.lineTo(worldX, worldY + this.levelCellSize);
                }
                
                if (cell.walls && cell.walls.left) {
                    this.mazeGraphics.moveTo(worldX, worldY + this.levelCellSize);
                    this.mazeGraphics.lineTo(worldX, worldY);
                }
            }
        }
        
        // Stroke all the lines at once
        this.mazeGraphics.strokePath();
        
        // Add purple glow effect to the entire maze
        this.tweens.add({
            targets: this.mazeGraphics,
            alpha: { from: 0.7, to: 1.0 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    hasAdjacentWall(x, y) {
        // Check if there's a wall adjacent to this position
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1] // left, right, up, down
        ];
        
        for (let [dx, dy] of directions) {
            const checkX = x + dx;
            const checkY = y + dy;
            
            if (checkX >= 0 && checkX < this.collisionGrid[0].length &&
                checkY >= 0 && checkY < this.collisionGrid.length &&
                this.collisionGrid[checkY][checkX] === 1) {
                return true;
            }
        }
        return false;
    }

    createPlayer() {
        // Find a valid starting position (preferably top-left area)
        let startPos;
        let attempts = 0;
        
        // Try to find a position in the top-left quadrant first
        do {
            startPos = this.maze.getRandomEmptyPosition(this.collisionGrid);
            attempts++;
        } while (attempts < 10 && (startPos.x > this.collisionGrid[0].length / 2 || startPos.y > this.collisionGrid.length / 2));
        
        // If we couldn't find a good starting position, use any valid position
        if (attempts >= 10) {
            startPos = this.maze.getRandomEmptyPosition(this.collisionGrid);
        }
        
        const worldPos = CollisionSystem.getWorldPosition(startPos.x, startPos.y, this.levelCellSize || CONFIG.CELL_SIZE);
        
        // Apply maze offset for centering
        const centeredX = worldPos.x + this.mazeOffsetX;
        const centeredY = worldPos.y + this.mazeOffsetY;
        
        this.player = this.add.image(centeredX, centeredY, 'player');
        this.player.setDisplaySize(this.getScaledPlayerSize(), this.getScaledPlayerSize());
        this.player.setDepth(10); // Ensure player is above maze tiles
        
        // Add subtle glow effect to the mouse
        this.tweens.add({
            targets: this.player,
            alpha: { from: 0.9, to: 1.0 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createMainSTX() {
        // Place main STX token at a random empty position
        let attempts = 0;
        let position;
        
        do {
            position = this.maze.getRandomEmptyPosition(this.collisionGrid);
            attempts++;
        } while (attempts < 50 && this.isPositionTooCloseToPlayer(position));
        
        const worldPos = CollisionSystem.getWorldPosition(position.x, position.y, this.levelCellSize || CONFIG.CELL_SIZE);
        
        // Apply maze offset for centering
        const centeredX = worldPos.x + this.mazeOffsetX;
        const centeredY = worldPos.y + this.mazeOffsetY;
      
        this.mainSTX = this.add.image(centeredX, centeredY, 'main-stx');
        this.mainSTX.setDisplaySize(this.getScaledMainSTXSize(), this.getScaledMainSTXSize());
        this.mainSTX.setDepth(5); // Above maze, below player
        
        // Add pulsing animation
        this.tweens.add({
            targets: this.mainSTX,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createMiniSTXs() {
        const numMiniSTXs = Math.max(1, 4 - this.gameState.level);
        
        for (let i = 0; i < numMiniSTXs; i++) {
            let attempts = 0;
            let position;
            
            do {
                position = this.maze.getRandomEmptyPosition(this.collisionGrid);
                attempts++;
            } while (attempts < 20 && (
                this.isPositionTooCloseToPlayer(position) ||
                this.isPositionTooCloseToMainSTX(position) ||
                this.isPositionTooCloseToOtherMiniSTXs(position)
            ));
            
            const worldPos = CollisionSystem.getWorldPosition(position.x, position.y, this.levelCellSize || CONFIG.CELL_SIZE);
            
            // Apply maze offset for centering
            const centeredX = worldPos.x + this.mazeOffsetX;
            const centeredY = worldPos.y + this.mazeOffsetY;
            
            const miniSTX = this.add.image(centeredX, centeredY, 'mini-stx');
            miniSTX.setDisplaySize(this.getScaledMiniSTXSize(), this.getScaledMiniSTXSize());
            miniSTX.setDepth(5); // Above maze, below player
            
            // Add floating animation
            this.tweens.add({
                targets: miniSTX,
                y: centeredY - 5,
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            this.miniSTXs.push(miniSTX);
        }
    }

    isPositionTooCloseToPlayer(position) {
        if (!this.player) return false;
        
        // Convert world position to maze-relative position
        const playerMazeX = this.player.x - this.mazeOffsetX;
        const playerMazeY = this.player.y - this.mazeOffsetY;
        const playerGrid = CollisionSystem.getGridPosition(playerMazeX, playerMazeY, this.levelCellSize || CONFIG.CELL_SIZE);
        const distance = Math.abs(position.x - playerGrid.x) + Math.abs(position.y - playerGrid.y);
        
        return distance < 5; // Manhattan distance
    }

    isPositionTooCloseToMainSTX(position) {
        if (!this.mainSTX) return false;
        
        // Convert world position to maze-relative position
        const stxMazeX = this.mainSTX.x - this.mazeOffsetX;
        const stxMazeY = this.mainSTX.y - this.mazeOffsetY;
        const stxGrid = CollisionSystem.getGridPosition(stxMazeX, stxMazeY, this.levelCellSize || CONFIG.CELL_SIZE);
        const distance = Math.abs(position.x - stxGrid.x) + Math.abs(position.y - stxGrid.y);
        
        return distance < 3;
    }

    isPositionTooCloseToOtherMiniSTXs(position) {
        return this.miniSTXs.some(miniSTX => {
            // Convert world position to maze-relative position
            const miniMazeX = miniSTX.x - this.mazeOffsetX;
            const miniMazeY = miniSTX.y - this.mazeOffsetY;
            const miniGrid = CollisionSystem.getGridPosition(miniMazeX, miniMazeY, this.levelCellSize || CONFIG.CELL_SIZE);
            const distance = Math.abs(position.x - miniGrid.x) + Math.abs(position.y - miniGrid.y);
            return distance < 3;
        });
    }

    update() {
        if (this.gameState.isGameOver || this.gameState.isPaused) {
            return;
        }
        
        // Ensure UI overlay stays visible during gameplay
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay && uiOverlay.style.display !== 'flex') {
            uiOverlay.style.display = 'flex';
        }
        
        this.handleInput();
        this.checkCollisions();
        this.updateUI();
    }

    handleInput() {
        if (!this.player) return;
        
        let deltaX = 0;
        let deltaY = 0;
        
        // Check input - use delta time for smooth movement
        const speed = CONFIG.PLAYER_SPEED / 60; // pixels per frame at 60fps
        
        // Check input
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            deltaX = -speed;
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            deltaX = speed;
        }
        
        if (this.cursors.up.isDown || this.wasd.W.isDown) {
            deltaY = -speed;
        } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            deltaY = speed;
        }
        
        // Move player with collision detection
        if (deltaX !== 0 || deltaY !== 0) {
            this.movePlayerWithCollision(deltaX, deltaY);
        }
    }

    movePlayerWithCollision(deltaX, deltaY) {
        if (!this.player) return;
        
        // Convert world position to maze-relative position for collision detection
        const mazeRelativeX = this.player.x - this.mazeOffsetX;
        const mazeRelativeY = this.player.y - this.mazeOffsetY;
        
        const newPosition = CollisionSystem.getValidMovePosition(
            mazeRelativeX, mazeRelativeY,
            deltaX, deltaY,
            this.getScaledPlayerSize(), this.getScaledPlayerSize(),
            this.collisionGrid, this.levelCellSize || CONFIG.CELL_SIZE,
            this.maze.grid  // Pass the maze grid for wall checking
        );
        
        // Convert back to world coordinates
        const worldX = newPosition.x + this.mazeOffsetX;
        const worldY = newPosition.y + this.mazeOffsetY;
        
        this.player.setPosition(worldX, worldY);
    }

    checkCollisions() {
        if (!this.player) return;
        
        // Check main STX collision
        if (this.mainSTX && CollisionSystem.checkPointCollision(
            this.player.x, this.player.y,
            this.mainSTX.x, this.mainSTX.y, 25
        )) {
            this.collectMainSTX();
        }
        
        // Check mini STX collisions
        this.miniSTXs.forEach((miniSTX, index) => {
            if (CollisionSystem.checkPointCollision(
                this.player.x, this.player.y,
                miniSTX.x, miniSTX.y, 20
            )) {
                this.collectMiniSTX(index);
            }
        });
    }

    collectMainSTX() {
        // Track level completion for blockchain
        this.trackLevelCompletion();
        
        // Add score
        const levelBonus = CONFIG.MAIN_STX_POINTS * this.gameState.level;
        const timeBonus = Math.floor(this.gameState.timeLeft * CONFIG.TIME_BONUS_MULTIPLIER);
        this.gameState.score += levelBonus + timeBonus;
        
        // Remove main STX
        this.mainSTX.destroy();
        this.mainSTX = null;
        
        // Check if player completed final level (Level 10)
        if (this.gameState.level >= 10) {
            console.log('🎉 GAME WON! Player completed all levels!');
            this.gameWon();
            return;
        }
        
        // Level up
        this.gameState.level++;
        
        // Generate new level
        this.time.delayedCall(500, () => {
            this.generateNewLevel();
        });
    }

    collectMiniSTX(index) {
        // Add score and time
        this.gameState.score += CONFIG.MINI_STX_POINTS;
        this.gameState.timeLeft += CONFIG.MINI_STX_TIME_BONUS;
        
        // Remove mini STX
        this.miniSTXs[index].destroy();
        this.miniSTXs.splice(index, 1);
    }

    startTimer() {
        this.gameTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    updateTimer() {
        if (this.gameState.isPaused) return;
        
        this.gameState.timeLeft--;
        
        if (this.gameState.timeLeft <= 0) {
            this.gameOver();
        }
    }

    updateLevelTimer() {
        // Timer INCREASES with level (more time for harder mazes)
        const newTime = Math.min(
            CONFIG.BASE_TIME + (this.gameState.level - 1) * CONFIG.TIME_DECREASE_PER_LEVEL,
            CONFIG.BASE_TIME + 18  // Cap at 48 seconds (30 + 9*2)
        );
        this.gameState.timeLeft = newTime;
    }

    updateUI() {
        // Update DOM elements
        const scoreElement = document.getElementById('score');
        const levelElement = document.getElementById('level');
        const timerElement = document.getElementById('timer');
        
        if (scoreElement) {
            scoreElement.textContent = this.gameState.score;
            scoreElement.style.color = '#FFFFFF'; // White score number
        }
        if (levelElement) {
            levelElement.textContent = this.gameState.level;
            levelElement.style.color = '#FFFFFF'; // White level number
        }
        if (timerElement) {
            timerElement.textContent = this.gameState.timeLeft;
            // Change color when time is low
            if (this.gameState.timeLeft <= 5) {
                timerElement.style.color = '#ff4444';
            } else {
                timerElement.style.color = '#FFFFFF';
            }
        }
    }

    togglePause() {
        this.gameState.isPaused = !this.gameState.isPaused;
        
        if (this.gameState.isPaused) {
            this.scene.pause();
            this.showPauseOverlay();
        } else {
            this.scene.resume();
            this.hidePauseOverlay();
        }
    }

    showPauseOverlay() {
        // Create or show pause overlay
        let pauseOverlay = document.getElementById('pause-overlay');
        if (!pauseOverlay) {
            pauseOverlay = document.createElement('div');
            pauseOverlay.id = 'pause-overlay';
            pauseOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 200;
                cursor: pointer;
            `;
            pauseOverlay.innerHTML = `
                <div style="font-size: 48px; color: #8B5CF6; margin-bottom: 20px; text-shadow: 0 0 20px #8B5CF6;">PAUSED</div>
                <div style="font-size: 18px; color: #888;">Press P to Resume</div>
                <div style="font-size: 14px; color: #666; margin-top: 10px;">or click anywhere</div>
            `;
            
            // Allow clicking to unpause
            pauseOverlay.addEventListener('click', () => {
                if (this.gameState.isPaused) {
                    this.togglePause();
                }
            });
            
            document.getElementById('game-container').appendChild(pauseOverlay);
        } else {
            pauseOverlay.style.display = 'flex';
        }
    }

    hidePauseOverlay() {
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay) {
            pauseOverlay.style.display = 'none';
        }
    }

    setupPause() {
        // Handle window focus/blur for auto-pause
        window.addEventListener('blur', () => {
            if (!this.gameState.isGameOver) {
                this.gameState.isPaused = true;
                this.scene.pause();
            }
        });
        
        window.addEventListener('focus', () => {
            // Don't auto-resume, let player manually resume
        });
    }

    gameOver() {
        console.log('Game Over! Final Score:', this.gameState.score);
        
        this.gameState.isGameOver = true;
        
        // Stop timer
        if (this.gameTimer) {
            this.gameTimer.destroy();
        }
        
        // Hide UI overlay when game ends
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) {
            uiOverlay.style.display = 'none';
        }
        
        // Show game over screen with winner info if applicable
        this.showGameOverScreen();
        
        // Submit score to blockchain
        this.submitScore();
    }

    showGameOverScreen() {
        const gameOverScreen = document.getElementById('game-over-screen');
        const finalScoreElement = document.getElementById('final-score');
        const submissionStatus = document.getElementById('submission-status');
        
        if (finalScoreElement) {
            finalScoreElement.textContent = this.gameState.score;
        }
        
        // Check if player is a winner
        if (this.userMazeConfig?.winnerPosition) {
            // Winner - show reward info
            const title = document.querySelector('.game-over-title');
            if (title) {
                title.textContent = '🏆 Congratulations!';
                title.style.color = '#10b981';
            }
            
            if (submissionStatus) {
                const rewardInSTX = this.userMazeConfig.winnerReward / 1000000; // Convert from microSTX
                submissionStatus.innerHTML = `
                    <div style="color: #10b981; font-size: 16px;">
                        <strong>Position:</strong> #${this.userMazeConfig.winnerPosition}<br>
                        <strong>Reward:</strong> ${rewardInSTX.toFixed(2)} STX
                    </div>
                `;
            }
            
            // Add claim reward button
            this.addClaimRewardButton();
        }
        
        if (gameOverScreen) {
            gameOverScreen.style.display = 'flex';
        }
        
        // Setup restart button
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.onclick = () => this.restartGame();
        }
    }
    
    addClaimRewardButton() {
        const gameOverScreen = document.getElementById('game-over-screen');
        if (!gameOverScreen) return;
        
        // Check if button already exists
        if (document.getElementById('claim-reward-btn')) return;
        
        const claimButton = document.createElement('button');
        claimButton.id = 'claim-reward-btn';
        claimButton.textContent = '💰 Claim Reward';
        claimButton.style.cssText = `
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            padding: 12px 30px;
            font-size: 16px;
            font-weight: bold;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 15px;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
            transition: all 0.3s ease;
        `;
        
        claimButton.addEventListener('mouseenter', () => {
            claimButton.style.transform = 'translateY(-2px)';
            claimButton.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
        });
        
        claimButton.addEventListener('mouseleave', () => {
            claimButton.style.transform = 'translateY(0)';
            claimButton.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
        });
        
        claimButton.addEventListener('click', async () => {
            await this.claimReward();
        });
        
        // Find restart button and insert before it
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.parentNode.insertBefore(claimButton, restartButton);
        } else {
            gameOverScreen.appendChild(claimButton);
        }
    }
    
    async claimReward() {
        const claimButton = document.getElementById('claim-reward-btn');
        if (!claimButton) return;
        
        try {
            claimButton.disabled = true;
            claimButton.textContent = '⏳ Processing...';
            
            const result = await window.contractAPI.claimReward(
                this.userMazeConfig.gameId,
                this.userMazeConfig.winnerPosition
            );
            
            if (result.success) {
                claimButton.style.background = 'linear-gradient(135deg, #059669, #047857)';
                claimButton.textContent = '✅ Reward Claimed!';
                ErrorPopup.success(`Claimed ${(result.rewardAmount / 1000000).toFixed(2)} STX!\nTX: ${result.txId}`, 5000);
            } else {
                throw new Error(result.error || 'Failed to claim reward');
            }
        } catch (error) {
            console.error('❌ Failed to claim reward:', error);
            ErrorPopup.show(error.message, '❌ Claim Failed', 5000);
            claimButton.disabled = false;
            claimButton.textContent = '💰 Claim Reward';
        }
    }

    async submitScore() {
        // Check if this is victory screen or game over screen
        const submissionStatus = document.getElementById('victory-submission-status') || document.getElementById('submission-status');
        
        if (!window.stacksAPI.isWalletConnected) {
            if (submissionStatus) {
                submissionStatus.textContent = 'Connect wallet to submit scores to leaderboard';
            }
            return;
        }
        
        try {
            await window.contractCalls.submitScoreWithFeedback(
                this.gameState.score,
                this.gameState.level,
                (status) => {
                    if (submissionStatus) {
                        submissionStatus.textContent = status;
                    }
                }
            );
        } catch (error) {
            console.error('Error submitting score:', error);
            if (submissionStatus) {
                submissionStatus.textContent = 'Error submitting score';
            }
        }
    }

    restartGame() {
        // Hide game over screen
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.style.display = 'none';
        }
        
        // Hide victory screen
        const victoryOverlay = document.getElementById('victory-overlay');
        if (victoryOverlay) {
            victoryOverlay.style.display = 'none';
        }
        
        // Return to maze creation scene instead of restarting directly
        this.scene.start('MazeCreationScene');
    }

    jumpToLevel(targetLevel) {
        if (targetLevel < 1 || targetLevel > 10) return;
        
        console.log(`Jumping to level ${targetLevel}`);
        
        // Update game state
        this.gameState.level = targetLevel;
        
        // Generate new level
        this.generateNewLevel();
        
        // Update UI
        this.updateUI();
    }

    gameWon() {
        console.log('🎉 Victory! Player completed all 10 levels!');
        
        this.gameState.isGameOver = true;
        
        // Stop timer
        if (this.gameTimer) {
            this.gameTimer.destroy();
        }
        
        // Hide UI overlay when game ends
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) {
            uiOverlay.style.display = 'none';
        }
        
        // Show victory screen
        this.showVictoryScreen();
        
        // Submit score to blockchain
        this.submitScore();
    }

    showVictoryScreen() {
        // Create victory overlay
        let victoryOverlay = document.getElementById('victory-overlay');
        if (!victoryOverlay) {
            victoryOverlay = document.createElement('div');
            victoryOverlay.id = 'victory-overlay';
            victoryOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #000000;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 300;
                animation: victoryFadeIn 1s ease-in-out;
            `;
            
            // Add CSS animation for dramatic entrance
            const style = document.createElement('style');
            style.textContent = `
                @keyframes victoryFadeIn {
                    0% { opacity: 0; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes victoryPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .victory-title {
                    animation: victoryPulse 2s ease-in-out infinite;
                }
            `;
            document.head.appendChild(style);
            
            victoryOverlay.innerHTML = `
                <div class="victory-title" style="font-size: 64px; color: #FFFFFF; margin-bottom: 20px; font-weight: bold; text-align: center;">
                    🎉 VICTORY! 🎉
                </div>
                <div style="font-size: 32px; color: #FFFFFF; margin-bottom: 30px; text-shadow: 0 0 20px #000000; text-align: center;">
                    Congratulations!
                </div>
                <div style="font-size: 20px; color: #FFFFFF; margin-bottom: 20px; text-shadow: 0 0 15px #000000; text-align: center;">
                    You've completed all 10 levels of the maze!
                </div>
                <div style="font-size: 48px; color: #8B5CF6; margin-bottom: 30px; text-shadow: 0 0 25px #000000; font-weight: bold;">
                    Final Score: ${this.gameState.score}
                </div>
                <div style="font-size: 16px; color: #FFFFFF; margin-bottom: 40px; text-shadow: 0 0 10px #000000; text-align: center; max-width: 400px;">
                    From the simple 20×20 mazes to the nightmare 40×40 challenge - you've mastered them all!
                </div>
                <button id="play-again-button" style="
                    background: #8B5CF6;
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    font-size: 18px;
                    border-radius: 10px;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(0, 204, 255, 0.4);
                    transition: all 0.3s ease;
                    font-weight: bold;
                " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(139, 92, 246, 0.3)';" 
                   onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 15px rgba(139, 92, 246, 0.3)';">
                    🎮 Play Again
                </button>
                <div id="victory-submission-status" style="margin-top: 20px; font-size: 14px; color: #FFFFFF; text-align: center;"></div>
            `;
            
            document.getElementById('game-container').appendChild(victoryOverlay);
        } else {
            victoryOverlay.style.display = 'flex';
        }
        
        // Setup play again button
        const playAgainButton = document.getElementById('play-again-button');
        if (playAgainButton) {
            playAgainButton.onclick = () => this.restartGame();
        }
    }

    // Helper methods for proportional entity scaling
    getScaledPlayerSize() {
        if (!this.levelCellSize) return CONFIG.PLAYER_SIZE;
        
        // Calculate scale factor based on cell size ratio
        const scaleFactor = this.levelCellSize / CONFIG.CELL_SIZE;
        
        // Scale player size but keep it reasonable (min 8px, max based on cell size)
        const scaledSize = Math.round(CONFIG.PLAYER_SIZE * scaleFactor);
        return Math.max(8, Math.min(scaledSize, this.levelCellSize * 0.8));
    }

    getScaledMainSTXSize() {
        if (!this.levelCellSize) return 32;
        
        const scaleFactor = this.levelCellSize / CONFIG.CELL_SIZE;
        const scaledSize = Math.round(32 * scaleFactor);
        return Math.max(12, Math.min(scaledSize, this.levelCellSize * 0.9));
    }

    getScaledMiniSTXSize() {
        if (!this.levelCellSize) return 24;
        
        const scaleFactor = this.levelCellSize / CONFIG.CELL_SIZE;
        const scaledSize = Math.round(24 * scaleFactor);
        return Math.max(10, Math.min(scaledSize, this.levelCellSize * 0.7));
    }

    adjustGameDifficulty() {
        if (!this.userMazeConfig) return;
        
        // Adjust starting level based on difficulty selection
        switch(this.userMazeConfig.difficulty) {
            case 'easy':
                this.gameState.level = 1; // Start at level 1
                break;
            case 'hard':
                this.gameState.level = 4; // Start at level 4
                break;
            case 'difficult':
                this.gameState.level = 8; // Start at level 8
                break;
        }
        
        console.log(`Starting at level ${this.gameState.level} based on difficulty: ${this.userMazeConfig.difficulty}`);
    }

    trackLevelCompletion() {
        // Track completion for blockchain submission
        const completion = {
            level: this.gameState.level,
            score: this.gameState.score,
            timeRemaining: this.gameState.timeLeft,
            timestamp: Date.now(),
            gameId: this.userMazeConfig?.gameId,
            userId: this.userMazeConfig?.userId
        };
        
        this.levelCompletions.push(completion);
        console.log('✅ Level completion tracked:', completion);
        
        // Submit progress to blockchain (asynchronously, don't block gameplay)
        this.submitLevelProgressToBlockchain(completion);
    }
    
    async submitLevelProgressToBlockchain(completion) {
        try {
            if (!this.userMazeConfig || !this.userMazeConfig.gameId) {
                console.warn('⚠️ No game ID available for progress submission');
                return;
            }
            
            // Calculate completion time (time spent on this round)
            const roundTime = (completion.timestamp - (this.levelCompletions.length > 1 ? 
                this.levelCompletions[this.levelCompletions.length - 2].timestamp : 
                this.userMazeConfig.createdAt)) || 30000;
            
            console.log(`📤 Submitting round ${completion.level} progress to blockchain...`);
            
            // Call contract API to update progress
            const result = await window.contractAPI.updatePlayerProgress(
                this.userMazeConfig.gameId,
                completion.level,
                roundTime
            );
            
            if (result.success) {
                console.log(`✅ Round ${completion.level} submitted to blockchain`);
                
                // Check if this completed the game
                if (result.isWinner !== undefined) {
                    // Player completed final round
                    if (result.isWinner) {
                        console.log(`🏆 Player is a winner! Position: ${result.position}`);
                        this.userMazeConfig.winnerPosition = result.position;
                        this.userMazeConfig.winnerReward = result.reward;
                    } else {
                        console.log(`📊 Game complete but not in top 5`);
                    }
                }
            } else {
                console.error(`❌ Failed to submit progress: ${result.error}`);
                if (result.error) {
                    ErrorPopup.warning(`Blockchain note: ${result.error}`, 3000);
                }
            }
        } catch (error) {
            console.error('❌ Error submitting progress to blockchain:', error);
            ErrorPopup.warning('Could not submit progress to blockchain', 3000);
        }
    }

    async gameWon() {
        console.log('🎉 Victory! Player completed all 10 levels!');
        
        this.gameState.isGameOver = true;
        
        // Stop timer
        if (this.gameTimer) {
            this.gameTimer.destroy();
        }
        
        // Submit all level completions to blockchain
        await this.submitCompletionsToBlockchain();
        
        // Check if bounty conditions are met
        this.checkBountyConditions();
        
        // Show victory screen
        this.showVictoryScreen();
    }

    async submitCompletionsToBlockchain() {
        if (!this.userMazeConfig || this.levelCompletions.length === 0) return;
        
        try {
            console.log('Submitting level completions to blockchain:', this.levelCompletions);
            
            // TODO: Batch submit all level completions
            // await window.contractCalls.submitLevelCompletions(
            //     this.userMazeConfig.gameId,
            //     this.userMazeConfig.userId,
            //     this.levelCompletions
            // );
            
            console.log('Level completions submitted successfully');
            
        } catch (error) {
            console.error('Error submitting level completions:', error);
            // Continue with game flow even if blockchain submission fails
        }
    }

    checkBountyConditions() {
        if (!this.userMazeConfig || this.userMazeConfig.bountyAmount <= 0) return;
        
        // Check if bountyConditions exists before accessing properties
        if (!this.userMazeConfig.bountyConditions) {
            console.log('No bounty conditions set');
            return;
        }
        
        const conditions = this.userMazeConfig.bountyConditions;
        let bountyEarned = false;
        
        // Check completion conditions
        if (conditions.completeAllLevels && this.gameState.level >= 10) {
            bountyEarned = true;
        }
        
        if (conditions.minimumScore && this.gameState.score >= conditions.minimumScore) {
            bountyEarned = true;
        }
        
        // TODO: Add time limit check if implemented
        
        if (bountyEarned) {
            console.log(`🎉 Bounty earned! ${this.userMazeConfig.bountyAmount} STX`);
            // TODO: Trigger bounty payment through smart contract
        }
    }
}
