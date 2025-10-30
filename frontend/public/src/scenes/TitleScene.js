class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    preload() {
        // Load the logo image from assets/images directory
        this.load.image('maze-logo', 'assets/images/maze-logo.png');
    }

    create() {
        // Set solid black background
        this.cameras.main.setBackgroundColor('#000000');
        
        // UI overlay is hidden by default, no need to hide it here
        
        // Use actual canvas dimensions for responsive positioning
        const canvasWidth = this.cameras.main.width;
        const canvasHeight = this.cameras.main.height;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Responsive positioning and scaling
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        
        // Logo positioning - responsive to screen height (moved higher for mobile)
        const logoOffsetY = isSmallMobile ? -centerY * 0.7 : isMobile ? -centerY * 0.9 : -100;
        const logoScale = isSmallMobile ? 0.12 : isMobile ? 0.15 : 0.2;
        
        // Add the logo (centered, positioned responsively)
        this.logo = this.add.image(centerX, centerY + logoOffsetY, 'maze-logo');
        this.logo.setScale(logoScale);
        this.logo.setDepth(5);
        
        // Add subtle glow/pulse effect to logo
        this.tweens.add({
            targets: this.logo,
            alpha: { from: 0.9, to: 1.0 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Create DOM overlay for crisp text
        this.createTextOverlay();
        
        // Add entrance animations for logo only
        this.addEntranceAnimations();
        
        // Setup input handling
        this.setupInput();

        // Setup responsive layout
        this.setupResponsiveLayout();
    }
    
    createTextOverlay() {
        console.log('Creating text overlay...');
        
        // Create DOM overlay for crisp text
        const overlay = document.createElement('div');
        overlay.id = 'title-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 50;
        `;
        
        // Responsive text sizing and positioning
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        
        // Calculate responsive spacing based on screen size
        const titleFontSize = isSmallMobile ? '32px' : isMobile ? '40px' : '48px';
        const taglineFontSize = isSmallMobile ? '14px' : isMobile ? '16px' : '18px';
        const clickFontSize = isSmallMobile ? '12px' : isMobile ? '14px' : '16px';
        
        // Use absolute positioning to place text below logo
        const textTopPosition = isSmallMobile ? '50%' : isMobile ? '55%' : '70%';
        
        const bottomSpacing = isSmallMobile ? '40px' : isMobile ? '50px' : '60px';
        
        console.log(`Screen type: ${isSmallMobile ? 'Small Mobile' : isMobile ? 'Mobile' : 'Desktop'}`);
        console.log(`Text top position: ${textTopPosition}`);
        
        // Title text
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = `
            position: absolute;
            top: ${textTopPosition};
            left: 50%;
            transform: translateX(-50%);
            font-size: ${titleFontSize};
            font-family: Arial, sans-serif;
            color: #FFFFFF;
            font-weight: bold;
            text-align: center;
            padding: 0 20px;
            line-height: 1.2;
            white-space: nowrap;
        `;
        titleDiv.textContent = 'The Maze';
        
        // Tagline text  
        const taglineDiv = document.createElement('div');
        const taglineTopPosition = isSmallMobile ? '58%' : isMobile ? '63%' : '78%';
        taglineDiv.style.cssText = `
            position: absolute;
            top: ${taglineTopPosition};
            left: 50%;
            transform: translateX(-50%);
            font-size: ${taglineFontSize};
            font-family: Arial, sans-serif;
            color: #FFFFFF;
            text-align: center;
            opacity: 0.9;
            padding: 0 20px;
            line-height: 1.4;
            max-width: 90%;
        `;
        taglineDiv.textContent = 'navigate the network, solve the maze, and earn rewards';
        
        // Click instruction
        const clickDiv = document.createElement('div');
        clickDiv.style.cssText = `
            font-size: ${clickFontSize};
            font-family: Arial, sans-serif;
            color: #888888;
            position: absolute;
            bottom: ${bottomSpacing};
            text-align: center;
            width: 100%;
            animation: blink 2s infinite;
            padding: 0 20px;
        `;
        clickDiv.textContent = 'Click anywhere to continue';
        
        // Add CSS animation for blinking
        if (!document.getElementById('title-animations')) {
            const style = document.createElement('style');
            style.id = 'title-animations';
            style.textContent = `
                @keyframes blink {
                    0%, 50% { opacity: 0.3; }
                    51%, 100% { opacity: 0.8; }
                }
            `;
            document.head.appendChild(style);
        }
        
        overlay.appendChild(titleDiv);
        overlay.appendChild(taglineDiv);
        overlay.appendChild(clickDiv);
        
        const gameContainer = document.getElementById('game-container');
        console.log('Game container found:', !!gameContainer);
        console.log('Overlay created:', !!overlay);
        console.log('Title div content:', titleDiv.textContent);
        
        if (gameContainer) {
            gameContainer.appendChild(overlay);
            console.log('Overlay appended to game container');
        } else {
            console.error('Could not find game-container element');
        }
        
        // Store references for animations
        this.titleText = titleDiv;
        this.taglineText = taglineDiv;
        this.clickText = clickDiv;
    }
    
    addEntranceAnimations() {
        // Fade in the logo only
        this.logo.setAlpha(0);
        this.tweens.add({
            targets: this.logo,
            alpha: 1,
            duration: 1000,
            ease: 'Power2.easeOut'
        });
        
        // DOM elements will appear immediately with CSS transitions if needed
        // No Phaser tweening on DOM elements as they're not Phaser objects
    }
    
    setupInput() {
        // Handle click anywhere to continue
        this.input.on('pointerdown', () => {
            this.goToMazeCreation();
        });
        
        // Handle keyboard input (space or enter)
        this.input.keyboard.on('keydown-SPACE', () => {
            this.goToMazeCreation();
        });
        
        this.input.keyboard.on('keydown-ENTER', () => {
            this.goToMazeCreation();
        });
    }
    
    goToMazeCreation() {
        // Immediately remove title overlay to prevent it from showing in other scenes
        const titleOverlay = document.getElementById('title-overlay');
        if (titleOverlay) {
            titleOverlay.remove();
        }
        
        // Add exit animation before transitioning
        this.tweens.add({
            targets: this.logo,
            alpha: 0,
            duration: 500,
            ease: 'Power2.easeIn',
            onComplete: () => {
                // Transition to connect wallet scene
                this.scene.start('ConnectWalletScene');
            }
        });
    }

    setupResponsiveLayout() {
        // Handle window resize events - only if we're still in TitleScene
        window.addEventListener('resize', () => {
            // Only recreate overlay if we're still in the TitleScene
            if (this.scene.isActive('TitleScene')) {
                // Remove existing overlay
                const existingOverlay = document.getElementById('title-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }
                
                // Recreate text overlay with new responsive values
                this.createTextOverlay();
                
                // Update logo positioning using actual canvas dimensions
                const canvasWidth = this.cameras.main.width;
                const canvasHeight = this.cameras.main.height;
                const centerX = canvasWidth / 2;
                const centerY = canvasHeight / 2;
                const isMobile = window.innerWidth <= 768;
                const isSmallMobile = window.innerWidth <= 480;
                
                const logoOffsetY = isSmallMobile ? -centerY * 0.7 : isMobile ? -centerY * 0.9 : -100;
                const logoScale = isSmallMobile ? 0.12 : isMobile ? 0.15 : 0.2;
                
                if (this.logo) {
                    this.logo.setPosition(centerX, centerY + logoOffsetY);
                    this.logo.setScale(logoScale);
                }
            }
        });
    }
}