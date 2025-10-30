/**
 * Stacks Wallet Integration - StacksRunner
 * 
 * Simple UMD-based wallet connection using @stacks/connect library
 * Works with CDN or local fallback
 * ES5 compatible, no imports/bundler needed
 */

(function() {
  'use strict';

  // Ensure we're in browser environment
  if (typeof window === 'undefined') {
    console.error('❌ StacksAPI: Browser environment required');
    return;
  }

  var StacksAPI = function() {
    this.userAddress = null;
    this.userPublicKey = null;
    this.contractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    this.contractName = 'stackrunner';
    this.initialized = false;
    
    // Initialize on creation
    this.init();
  };

  /**
   * Initialize - wait for @stacks/connect library to load
   */
  StacksAPI.prototype.init = function() {
    var self = this;
    var maxAttempts = 100; // 10 seconds (100 * 100ms)
    var attempts = 0;

    var checkLibrary = function() {
      // Check if window.StacksConnect exists (UMD export)
      if (typeof window.StacksConnect !== 'undefined' && window.StacksConnect.showConnect) {
        self.initialized = true;
        console.log('✅ StacksAPI: @stacks/connect library loaded successfully');
        self.loadExistingWallet();
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        console.error('❌ StacksAPI: @stacks/connect library failed to load after 10 seconds');
        return;
      }

      setTimeout(checkLibrary, 100);
    };

    checkLibrary();
  };

  /**
   * Load existing wallet from localStorage if available
   */
  StacksAPI.prototype.loadExistingWallet = function() {
    try {
      var stored = localStorage.getItem('stxAddress');
      var storedPublicKey = localStorage.getItem('stxPublicKey');
      
      if (stored) {
        this.userAddress = stored;
        this.userPublicKey = storedPublicKey;
        console.log('✅ StacksAPI: Loaded existing wallet from localStorage:', stored);
      }
    } catch (error) {
      console.warn('⚠️ StacksAPI: Could not load from localStorage:', error);
    }
  };

  /**
   * Connect to wallet - opens popup
   */
  StacksAPI.prototype.connectWallet = function() {
    var self = this;

    return new Promise(function(resolve, reject) {
      // Check if already connected
      if (self.userAddress) {
        console.log('✅ StacksAPI: Already connected as:', self.userAddress);
        resolve({ success: true, address: self.userAddress });
        return;
      }

      // Verify library is loaded
      if (!self.initialized || typeof window.StacksConnect === 'undefined') {
        console.error('❌ StacksAPI: Library not initialized');
        reject(new Error('@stacks/connect library not properly loaded. Please refresh the page.'));
        return;
      }

      // Get the showConnect function
      var showConnect = window.StacksConnect.showConnect;
      
      if (typeof showConnect !== 'function') {
        console.error('❌ StacksAPI: showConnect is not a function');
        reject(new Error('showConnect function not found in @stacks/connect library'));
        return;
      }

      console.log('🔗 StacksAPI: Opening wallet connection dialog...');

      // Call showConnect to show wallet modal
      try {
        showConnect({
          appDetails: {
            name: 'StacksRunner',
            icon: window.location.origin + '/assets/images/maze-logo.png'
          },
          onFinish: function() {
            console.log('✅ StacksAPI: Wallet connection dialog finished');
            self.loadUserData();
          },
          onCancel: function() {
            console.log('ℹ️ StacksAPI: Wallet connection cancelled by user');
            reject(new Error('User cancelled wallet connection'));
          }
        });
      } catch (error) {
        console.error('❌ StacksAPI: Error calling showConnect:', error);
        reject(error);
      }

      // Wait for user data to be available
      var checkUserData = function() {
        if (self.userAddress) {
          console.log('✅ StacksAPI: Wallet connected successfully:', self.userAddress);
          resolve({ success: true, address: self.userAddress });
          return;
        }
        
        setTimeout(checkUserData, 100);
      };

      // Start checking after a short delay
      setTimeout(checkUserData, 500);
    });
  };

  /**
   * Load user data after wallet connection
   */
  StacksAPI.prototype.loadUserData = function() {
    try {
      // Get the library
      var StacksConnect = window.StacksConnect;
      if (!StacksConnect) {
        console.error('❌ StacksAPI: StacksConnect not available');
        return;
      }

      // Try to get userSession from window
      if (window.userSession) {
        var userData = window.userSession.loadUserData ? window.userSession.loadUserData() : null;
        
        if (userData && userData.profile) {
          var profile = userData.profile;
          this.userAddress = profile.stxAddress && profile.stxAddress.mainnet 
            ? profile.stxAddress.mainnet 
            : profile.stxAddress && profile.stxAddress.testnet
            ? profile.stxAddress.testnet
            : null;
          this.userPublicKey = profile.publicKey;

          if (this.userAddress) {
            // Store in localStorage
            localStorage.setItem('stxAddress', this.userAddress);
            if (this.userPublicKey) {
              localStorage.setItem('stxPublicKey', this.userPublicKey);
            }
            console.log('📍 StacksAPI: User data loaded:', this.userAddress);
            return;
          }
        }
      }

      // Fallback: try to get from localStorage (StacksConnect stores it there)
      var storageKeys = Object.keys(localStorage);
      for (var i = 0; i < storageKeys.length; i++) {
        var key = storageKeys[i];
        if (key.includes('blockstack') || key.includes('stacks')) {
          try {
            var stored = localStorage.getItem(key);
            var data = JSON.parse(stored);
            
            if (data && data.userData && data.userData.profile) {
              var stxAddr = data.userData.profile.stxAddress;
              this.userAddress = stxAddr && stxAddr.mainnet ? stxAddr.mainnet : stxAddr && stxAddr.testnet ? stxAddr.testnet : null;
              this.userPublicKey = data.userData.profile.publicKey;

              if (this.userAddress) {
                localStorage.setItem('stxAddress', this.userAddress);
                if (this.userPublicKey) {
                  localStorage.setItem('stxPublicKey', this.userPublicKey);
                }
                console.log('📍 StacksAPI: User data loaded from storage:', this.userAddress);
                return;
              }
            }
          } catch (e) {
            // Continue searching
          }
        }
      }

      console.log('ℹ️ StacksAPI: No user data found');
    } catch (error) {
      console.error('❌ StacksAPI: Error loading user data:', error);
    }
  };

  /**
   * Check if wallet is connected
   */
  StacksAPI.prototype.isWalletConnected = function() {
    return this.userAddress !== null && this.userAddress !== undefined && this.userAddress !== '';
  };

  /**
   * Get user's STX address
   */
  StacksAPI.prototype.getUserAddress = function() {
    return this.userAddress;
  };

  /**
   * Disconnect wallet
   */
  StacksAPI.prototype.disconnect = function() {
    try {
      this.userAddress = null;
      this.userPublicKey = null;
      localStorage.removeItem('stxAddress');
      localStorage.removeItem('stxPublicKey');
      console.log('✅ StacksAPI: Wallet disconnected');
      return { success: true };
    } catch (error) {
      console.error('❌ StacksAPI: Disconnect failed:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Create singleton instance and expose globally
   */
  window.stacksAPI = new StacksAPI();
  console.log('✅ StacksAPI: Global instance created at window.stacksAPI');

})();
