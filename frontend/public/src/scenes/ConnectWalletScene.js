// Ensure StacksAPI is available before use
function ensureStacksAPILoaded() {
  return new Promise((resolve, reject) => {
    if (window.stacksAPI) {
      resolve(window.stacksAPI);
      return;
    }
    
    // Wait up to 5 seconds for StacksAPI to load
    let attempts = 0;
    const maxAttempts = 50; // 50 * 100ms = 5 seconds
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (window.stacksAPI) {
        clearInterval(checkInterval);
        console.log('✅ StacksAPI loaded after', attempts * 100, 'ms');
        resolve(window.stacksAPI);
        return;
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        reject(new Error('StacksAPI failed to load after 5 seconds'));
      }
    }, 100);
  });
}

// Connect Wallet Scene
class ConnectWalletScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ConnectWalletScene' });
        this.stacksAPI = null;
    }

    preload() {
        // Load the logo image (same as title scene)
        this.load.image('maze-logo', 'assets/images/maze-logo.png');
    }

    create() {
        // Set solid black background
        this.cameras.main.setBackgroundColor('#000000');
        
        // Clean up any lingering title overlay from previous scene
        const titleOverlay = document.getElementById('title-overlay');
        if (titleOverlay) {
            titleOverlay.remove();
        }
        
        // Ensure StacksAPI is loaded and cache it
        ensureStacksAPILoaded().then((stacksAPI) => {
            this.stacksAPI = stacksAPI;
            console.log('✅ StacksAPI cached in ConnectWalletScene');
        }).catch((error) => {
            console.error('❌ Failed to load StacksAPI:', error);
        });
        
        // Create the connect wallet button
        this.createConnectWalletButton();
        
        // Add entrance animation
        this.addEntranceAnimation();
        
        // Setup responsive layout
        this.setupResponsiveLayout();
    }
    
    createConnectWalletButton() {
        // Create flex container
        let container = document.getElementById('connect-wallet-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'connect-wallet-container';
            container.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 50px;
                z-index: 100;
            `;
            
            // Create logo element for flex container
            const logoImg = document.createElement('img');
            logoImg.src = 'assets/images/maze-logo.png';
            logoImg.style.cssText = `
                width: 120px;
                height: auto;
                transform: rotate(120deg);
                opacity: 0.95;
            `;
            
            // Create button
            const button = document.createElement('button');
            button.id = 'connect-wallet-btn';
            button.textContent = 'Connect Wallet';
            button.style.cssText = `
                background: linear-gradient(135deg, #8B5CF6, #A855F7);
                color: #000;
                border: none;
                padding: 16px 40px;
                font-size: 18px;
                font-weight: 600;
                border-radius: 12px;
                cursor: pointer;
                box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
                transition: all 0.3s ease;
                font-family: Arial, sans-serif;
                min-width: 200px;
            `;
            
            // Add hover effects
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = '0 12px 30px rgba(139, 92, 246, 0.4)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)';
            });
            
            // Add click handler
            button.addEventListener('click', () => {
                this.connectWallet();
            });
            
            container.appendChild(logoImg);
            container.appendChild(logoImg);
            container.appendChild(button);
            document.getElementById('game-container').appendChild(container);
        }
    }
    
    addEntranceAnimation() {
        // Fade in the entire container
        const container = document.getElementById('connect-wallet-container');
        if (container) {
            container.style.opacity = '0';
            container.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                container.style.transition = 'all 0.8s ease';
                container.style.opacity = '1';
                container.style.transform = 'translateY(0px)';
            }, 200);
        }
    }
    
    checkWalletConnection() {
        // If wallet is already connected, skip to maze creation
        if (window.stacksAPI && window.stacksAPI.isWalletConnected) {
            setTimeout(() => {
                this.proceedToMazeCreation();
            }, 1000);
        }
    }
    
    async connectWallet() {
        const button = document.getElementById('connect-wallet-btn');
        const originalText = button.textContent;

        try {
            // Update button state
            button.textContent = 'Opening wallet...';
            button.disabled = true;
            button.style.opacity = '0.7';

            // Prefer real stacksAPI connection when available
            if (window.stacksAPI && typeof window.stacksAPI.connectWallet === 'function') {
                const result = await window.stacksAPI.connectWallet();

                if (result && result.success) {
                    button.textContent = '✅ Connected!';
                    button.style.background = 'linear-gradient(135deg, #10B981, #059669)';

                    // Store wallet connection in registry
                    this.registry.set('walletConnected', true);
                    this.registry.set('userAddress', result.address);

                    // Ensure contractAPI uses live mode
                    if (window.contractAPI) window.contractAPI.useDemo = false;

                    console.log('✅ Wallet connected (real):', result.address);

                    // Proceed to maze creation after brief delay
                    setTimeout(() => this.proceedToMazeCreation(), 1500);
                    return;
                } else {
                    // If stacksAPI returned a structured failure, throw to trigger fallback
                    throw new Error(result && result.error ? result.error : 'Wallet connection failed');
                }
            }

            // If stacksAPI is not available, fall back to demo mode
            console.warn('⚠️ stacksAPI not available, falling back to demo wallet');
            const demoResult = await this.simulateWalletConnection();

            if (demoResult && demoResult.success) {
                button.textContent = 'Connected';
                button.style.background = '#A855F7';

                this.registry.set('walletConnected', true);
                this.registry.set('userAddress', demoResult.address);

                // Ensure contractAPI uses demo mode
                if (window.contractAPI) window.contractAPI.useDemo = true;

                console.log('✅ Demo wallet connected:', demoResult.address);

                setTimeout(() => this.proceedToMazeCreation(), 1200);
                return;
            }

        } catch (error) {
            console.error('Failed to connect wallet:', error);

            // // Show friendly error popup if available
            // if (window.ErrorPopup) {
            //     window.ErrorPopup.warning('Wallet connection failed — switched to Demo mode');
            // }

            // Try demo fallback automatically
            try {
                const fallback = await this.simulateWalletConnection();
                if (fallback && fallback.success) {
                    button.textContent = 'Connected';
                    button.style.background = '#A855F7';

                    this.registry.set('walletConnected', true);
                    this.registry.set('userAddress', fallback.address);

                    if (window.contractAPI) window.contractAPI.useDemo = true;

                    console.log('✅ Demo fallback connected:', fallback.address);

                    setTimeout(() => this.proceedToMazeCreation(), 1200);
                    return;
                }
            } catch (e) {
                console.error('Demo fallback also failed:', e);
            }

            // // Show inline error
            // button.textContent = '❌ ' + (error.message || 'Connection Failed');
            // button.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';

            // const errorMsg = document.getElementById('wallet-error') || document.createElement('div');
            // errorMsg.id = 'wallet-error';
            // errorMsg.textContent = error.message || 'Check console for details';
            // errorMsg.style.cssText = `
            //     color: #FF6B6B;
            //     font-size: 14px;
            //     margin-top: 20px;
            //     text-align: center;
            //     max-width: 300px;
            // `;
            // if (!document.getElementById('wallet-error')) {
            //     button.parentElement.appendChild(errorMsg);
            // }

            // // Reset button after delay
            // setTimeout(() => {
            //     button.textContent = originalText;
            //     button.style.background = 'linear-gradient(135deg, #8B5CF6, #A855F7)';
            //     button.disabled = false;
            //     button.style.opacity = '1';

            //     // Clear error message
            //     const errorEl = document.getElementById('wallet-error');
            //     if (errorEl) errorEl.remove();
            // }, 4000);

            // Allow users to proceed even if wallet connection fails
            button.textContent = originalText;
            button.disabled = false;
            button.style.opacity = '1';
            setTimeout(() => this.proceedToMazeCreation(), 1200);
        }
    }
    
    async simulateWalletConnection() {
        return new Promise((resolve) => {
            // Simulate connection delay
            setTimeout(() => {
                // Demo address for testing
                const demoAddress = 'SP2BQG3RK17LZZ8HKSHV56NBQSJCKY2AM0PQFNZ7';
                
                // Store in localStorage
                localStorage.setItem('stxAddress', demoAddress);
                
                resolve({
                    success: true,
                    address: demoAddress
                });
            }, 1500);
        });
    }

    proceedToMazeCreation() {
        // Fade out the entire container
        const container = document.getElementById('connect-wallet-container');
        if (container) {
            container.style.transition = 'all 0.5s ease';
            container.style.opacity = '0';
            container.style.transform = 'translateY(20px)';
        }
        
        // Transition to maze creation scene
        setTimeout(() => {
            // Clean up DOM elements
            if (container) {
                container.remove();
            }
            
            // Show UI overlay for next scene
            const uiOverlay = document.getElementById('ui-overlay');
            if (uiOverlay) {
                uiOverlay.style.display = 'flex';
            }
            
            // Start maze creation scene
            this.scene.start('MazeCreationScene');
        }, 500);
    }

    setupResponsiveLayout() {
        // Handle window resize events (same as TitleScene)
        window.addEventListener('resize', () => {
            // Update logo positioning
            const centerX = CONFIG.CANVAS_WIDTH / 2;
            const centerY = CONFIG.CANVAS_HEIGHT / 2;
            const isMobile = window.innerWidth <= 768;
            const isSmallMobile = window.innerWidth <= 480;
            
            const logoOffsetY = isSmallMobile ? -20 : isMobile ? -20 : -20;
            const logoScale = isSmallMobile ? 0.1 : isMobile ? 0.12 : 0.15;
            
            if (this.logo) {
                this.logo.setPosition(centerX, centerY + logoOffsetY);
                this.logo.setScale(logoScale);
            }
            
            // Update button positioning
            const button = document.getElementById('connect-wallet-btn');
            if (button) {
                const buttonFontSize = isSmallMobile ? '16px' : isMobile ? '17px' : '18px';
                const buttonPadding = isSmallMobile ? '14px 32px' : isMobile ? '15px 36px' : '16px 40px';
                const bottomSpacing = isSmallMobile ? '30px' : isMobile ? '35px' : '50px';
                const buttonMinWidth = isSmallMobile ? '160px' : isMobile ? '180px' : '200px';
                
                button.style.fontSize = buttonFontSize;
                button.style.padding = buttonPadding;
                button.style.bottom = bottomSpacing;
                button.style.minWidth = buttonMinWidth;
            }
        });
    }
}