/**
 * Stacks.js Library Loader
 * Dynamically intercepts and properly assigns @stacks/connect UMD modules to window
 * 
 * This file must load BEFORE any Stacks.js CDN scripts
 */

(function() {
  'use strict';
  
  // Flag to track if libraries are loaded
  let stacksLibrariesLoaded = false;
  
  // Create a global object to hold Stacks.js modules
  window.stacksLib = window.stacksLib || {};
  
  console.log('📦 Stacks.js Library Loader v2 initializing...');
  
  /**
   * Wait for the @stacks/connect library to be loaded and available
   * The UMD bundle will execute and should export functions to the global scope
   */
  async function waitForStacksConnect(maxAttempts = 50, delayMs = 100) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check multiple possible locations
      if (typeof showConnect !== 'undefined') {
        console.log('✅ Found showConnect in global scope (attempt', attempt + 1, ')');
        return true;
      }
      
      if (window.StacksConnect?.showConnect) {
        console.log('✅ Found window.StacksConnect.showConnect');
        return true;
      }
      
      if (window.stacksConnect?.showConnect) {
        console.log('✅ Found window.stacksConnect.showConnect');
        return true;
      }
      
      // Search all globals for the library
      for (const key of Object.keys(window)) {
        try {
          const val = window[key];
          if (val && typeof val === 'object' && typeof val.showConnect === 'function') {
            console.log(`✅ Found showConnect in window.${key}`);
            return true;
          }
        } catch (e) {
          // Ignore cross-origin and other access errors
        }
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    console.warn('⚠️ Stacks.js library not found after', maxAttempts * delayMs, 'ms');
    return false;
  }
  
  /**
   * Extract the Stacks.js functions and assign to window.stacksLib
   */
  function extractStacksConnect() {
    // Priority 1: Direct global functions (from UMD IIFE execution)
    if (typeof showConnect === 'function') {
      window.stacksLib = window.stacksLib || {};
      window.stacksLib.showConnect = showConnect;
      window.stacksLib.openSTXTransfer = typeof openSTXTransfer === 'function' ? openSTXTransfer : undefined;
      window.stacksLib.openContractCall = typeof openContractCall === 'function' ? openContractCall : undefined;
      window.stacksLib.openContractDeploy = typeof openContractDeploy === 'function' ? openContractDeploy : undefined;
      window.stacksLib.disconnect = typeof disconnect === 'function' ? disconnect : undefined;
      window.stacksLib.isConnected = typeof isConnected === 'function' ? isConnected : undefined;
      window.stacksLib.makeContractCallToken = typeof makeContractCallToken === 'function' ? makeContractCallToken : undefined;
      window.stacksLib.makeSTXTransferToken = typeof makeSTXTransferToken === 'function' ? makeSTXTransferToken : undefined;
      console.log('✅ Extracted Stacks.js functions from global scope');
      return true;
    }
    
    // Priority 2: window.StacksConnect (some UMD bundle configurations)
    if (window.StacksConnect?.showConnect) {
      window.stacksLib = window.StacksConnect;
      console.log('✅ Assigned window.StacksConnect to window.stacksLib');
      return true;
    }
    
    // Priority 3: window.stacksConnect
    if (window.stacksConnect?.showConnect) {
      window.stacksLib = window.stacksConnect;
      console.log('✅ Assigned window.stacksConnect to window.stacksLib');
      return true;
    }
    
    // Priority 4: window.stacks.connect
    if (window.stacks?.connect?.showConnect) {
      window.stacksLib = window.stacks.connect;
      console.log('✅ Assigned window.stacks.connect to window.stacksLib');
      return true;
    }
    
    return false;
  }
  
  /**
   * Main initialization - waits for libraries to load then extracts them
   */
  async function initializeStacksLibraries() {
    try {
      console.log('⏳ Waiting for @stacks/connect to load from CDN...');
      
      // Wait for the library to be ready
      const found = await waitForStacksConnect(50, 200);
      
      if (found) {
        // Extract and assign the library
        if (extractStacksConnect()) {
          console.log('✅ Stacks.js libraries loaded and assigned to window.stacksLib');
          stacksLibrariesLoaded = true;
          
          // Fire a custom event for other components to listen for
          try {
            window.dispatchEvent(new CustomEvent('stacksLibrariesLoaded', { 
              detail: { stacksLib: window.stacksLib } 
            }));
          } catch (e) {
            // Event dispatch failed, continue anyway
          }
          
          return;
        }
      }
      
      // Library not found - log available globals for debugging
      const relevantGlobals = Object.keys(window)
        .filter(k => {
          try {
            const v = window[k];
            return typeof v === 'function' && (
              k.toLowerCase().includes('show') || 
              k.toLowerCase().includes('connect') ||
              k.toLowerCase().includes('stacks')
            );
          } catch (e) {
            return false;
          }
        })
        .slice(0, 15);
      
      console.warn('⚠️ Stacks.js library extraction failed');
      console.warn('Available function globals:', relevantGlobals.join(', ') || 'none');
      
    } catch (error) {
      console.error('❌ Error initializing Stacks.js:', error.message);
    }
  }
  
  /**
   * Expose a function to check if libraries are loaded
   */
  window.areStacksLibrariesLoaded = function() {
    return stacksLibrariesLoaded || (window.stacksLib && typeof window.stacksLib.showConnect === 'function');
  };
  
  /**
   * Get access to the Stacks library
   */
  window.getStacksLib = function() {
    return window.stacksLib;
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStacksLibraries);
  } else {
    // DOM already loaded
    initializeStacksLibraries();
  }
  
})();

