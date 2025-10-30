/**
 * Smart Contract Integration API - Real Blockchain
 * Handles all communication with the MazeGame.clar smart contract on Stacks
 */

class ContractAPI {
  constructor() {
    // Check if window.stacksAPI exists
    if (!window.stacksAPI) {
      throw new Error('StacksAPI not initialized. Make sure stacksAPI.js is loaded first.');
    }

    this.stacksAPI = window.stacksAPI;
    this.currentGameId = null;
    this.gameData = null;
    this.playerProgress = null;
    this.useDemo = localStorage.getItem('DEMO_MODE') === 'true'; // Toggle via localStorage
    
    console.log('✅ ContractAPI initialized');
    console.log(`   Contract: ${CONFIG.CONTRACT_ADDRESS}.${CONFIG.CONTRACT_NAME}`);
    console.log(`   Network: ${CONFIG.NETWORK}`);
    console.log(`   Mode: ${this.useDemo ? 'DEMO (localStorage)' : 'LIVE (blockchain)'}`);
  }

  // ========================
  // PUBLIC FUNCTIONS - GAME CREATION
  // ========================

  /**
   * Create a new maze game on the blockchain
   * @param {number} totalRounds - Number of rounds/levels in the game
   * @param {number} bounty - STX bounty for winners (in microSTX)
   * @returns {Promise<{success, gameId, txId, error}>}
   */
  async createGame(totalRounds, bounty = 0) {
    try {
      console.log('🔗 Creating game on contract...');
      console.log(`   Rounds: ${totalRounds}, Bounty: ${bounty} microSTX`);

      // Validate inputs
      if (!Number.isInteger(totalRounds) || totalRounds <= 0) {
        throw new Error('Total rounds must be a positive integer');
      }
      if (!Number.isInteger(bounty) || bounty < 0) {
        throw new Error('Bounty must be a non-negative integer');
      }

      // Check if wallet is connected
      if (!this.stacksAPI.isWalletConnected) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      if (this.useDemo) {
        return this._createGameDemo(totalRounds, bounty);
      }

      // Call create-game contract function
      console.log('📤 Submitting create-game transaction...');
      const functionArgs = [
        window.Stacks.uintCV(totalRounds),
        window.Stacks.uintCV(bounty)
      ];

      const txResult = await this.stacksAPI.callContractFunction('create-game', functionArgs);

      if (!txResult.success) {
        throw new Error(txResult.error || 'Failed to create game');
      }

      // Generate game ID (in real scenario, this would come from contract event)
      const gameId = Math.floor(Math.random() * 1000000000);
      
      this.currentGameId = gameId;
      this.gameData = {
        gameId,
        totalRounds,
        bounty,
        playerAddress: this.stacksAPI.userAddress || localStorage.getItem('stxAddress'),
        createdAt: Date.now(),
        isActive: true,
        winnersCount: 0,
        txId: txResult.txId
      };

      // Store locally for reference
      localStorage.setItem(`game_${gameId}`, JSON.stringify(this.gameData));
      localStorage.setItem('currentGameId', String(gameId));

      console.log(`✅ Game created successfully`);
      console.log(`   Game ID: ${gameId}`);
      console.log(`   TX ID: ${txResult.txId}`);

      // Wait for transaction confirmation
      await this.stacksAPI.waitForTransaction(txResult.txId);

      return {
        success: true,
        gameId,
        txId: txResult.txId,
        message: 'Game created successfully'
      };

    } catch (error) {
      console.error('❌ Failed to create game:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ========================
  // PUBLIC FUNCTIONS - PROGRESS TRACKING
  // ========================

  /**
   * Update player progress after completing a round
   * @param {number} gameId - The game ID
   * @param {number} currentRound - Current round/level number
   * @param {number} completionTime - Time to complete in milliseconds
   * @returns {Promise<{success, isWinner, position, reward}>}
   */
  async updatePlayerProgress(gameId, currentRound, completionTime) {
    try {
      console.log('🔗 Updating player progress...');
      console.log(`   Game ID: ${gameId}`);
      console.log(`   Round: ${currentRound}`);
      console.log(`   Time: ${completionTime}ms`);

      // Validate inputs
      if (!Number.isInteger(gameId) || gameId <= 0) {
        throw new Error('Invalid game ID');
      }
      if (!Number.isInteger(currentRound) || currentRound <= 0) {
        throw new Error('Invalid round number');
      }
      if (!Number.isInteger(completionTime) || completionTime <= 0) {
        throw new Error('Invalid completion time');
      }

      // Check wallet connection
      if (!this.stacksAPI.isWalletConnected) {
        throw new Error('Wallet not connected');
      }

      if (this.useDemo) {
        return this._updatePlayerProgressDemo(gameId, currentRound, completionTime);
      }

      // Get game data
      const gameData = this.getGameData(gameId);
      if (!gameData) {
        throw new Error('Game not found');
      }

      // Validate round
      if (currentRound > gameData.totalRounds) {
        throw new Error('Round exceeds total rounds');
      }

      // Store player progress locally
      this.playerProgress = {
        gameId,
        currentRound,
        completionTime,
        completed: currentRound === gameData.totalRounds,
        submittedAt: Date.now()
      };

      // Check if this is the final round
      let response = {
        success: true,
        gameId,
        currentRound,
        completionTime
      };

      if (currentRound === gameData.totalRounds) {
        // Submit final round with update-player-progress contract call
        console.log('📤 Submitting final round to contract...');
        const functionArgs = [
          window.Stacks.uintCV(gameId),
          window.Stacks.uintCV(currentRound),
          window.Stacks.uintCV(completionTime)
        ];

        const txResult = await this.stacksAPI.callContractFunction('update-player-progress', functionArgs);

        if (!txResult.success) {
          throw new Error(txResult.error || 'Failed to update progress');
        }

        // Wait for transaction
        await this.stacksAPI.waitForTransaction(txResult.txId);

        // Check if player won
        const winnerStatus = this.checkWinnerStatus(gameId, completionTime);
        response = { ...response, ...winnerStatus };

        console.log(`✅ Game completed!`);
        if (winnerStatus.isWinner) {
          console.log(`   Position: ${winnerStatus.position}`);
          console.log(`   Reward: ${(winnerStatus.reward / 1000000).toFixed(2)} STX`);
        }
      } else {
        console.log(`✅ Round ${currentRound} recorded locally`);
      }

      return response;

    } catch (error) {
      console.error('❌ Failed to update progress:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ========================
  // PUBLIC FUNCTIONS - REWARD CLAIMING
  // ========================

  /**
   * Claim reward for winning
   * @param {number} gameId - The game ID
   * @param {number} position - Position in winners list (1-5)
   * @returns {Promise<{success, txId, rewardAmount}>}
   */
  async claimReward(gameId, position) {
    try {
      console.log('🔗 Claiming reward...');
      console.log(`   Game ID: ${gameId}`);
      console.log(`   Position: ${position}`);

      // Validate inputs
      if (!Number.isInteger(gameId) || gameId <= 0) {
        throw new Error('Invalid game ID');
      }
      if (!Number.isInteger(position) || position < 1 || position > 5) {
        throw new Error('Position must be between 1 and 5');
      }

      // Check wallet connection
      if (!this.stacksAPI.isWalletConnected) {
        throw new Error('Wallet not connected');
      }

      if (this.useDemo) {
        return this._claimRewardDemo(gameId, position);
      }

      // Call claim-reward contract function
      console.log('📤 Submitting claim-reward transaction...');
      const functionArgs = [
        window.Stacks.uintCV(gameId),
        window.Stacks.uintCV(position)
      ];

      const txResult = await this.stacksAPI.callContractFunction('claim-reward', functionArgs);

      if (!txResult.success) {
        throw new Error(txResult.error || 'Failed to claim reward');
      }

      // Get winner info
      const winner = this.getWinner(gameId, position);
      const rewardAmount = winner ? winner.reward : 0;

      // Wait for transaction
      await this.stacksAPI.waitForTransaction(txResult.txId);

      // Mark as claimed
      this._markRewardClaimed(gameId, position, txResult.txId);

      console.log(`✅ Reward claimed successfully`);
      console.log(`   Amount: ${(rewardAmount / 1000000).toFixed(2)} STX`);
      console.log(`   TX ID: ${txResult.txId}`);

      return {
        success: true,
        gameId,
        position,
        rewardAmount,
        txId: txResult.txId,
        message: 'Reward claimed successfully'
      };

    } catch (error) {
      console.error('❌ Failed to claim reward:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ========================
  // HELPER FUNCTIONS - GAME STATE
  // ========================

  /**
   * Check if player is a winner
   * @param {number} gameId - The game ID
   * @param {number} completionTime - Time to complete in milliseconds
   * @returns {object} Winner status info
   */
  checkWinnerStatus(gameId, completionTime) {
    // Get all completions for this game
    const allCompletions = this._getAllCompletions(gameId);
    
    if (allCompletions.length === 0) {
      return { isWinner: false, position: -1, reward: 0 };
    }

    // Sort by completion time
    allCompletions.sort((a, b) => a.time - b.time);

    // Check if current completion is in top 5
    const position = allCompletions.findIndex(c => c.time === completionTime) + 1;

    if (position > 0 && position <= 5) {
      const reward = this.calculateReward(
        this.gameData.bounty,
        this._getRewardPercentage(position)
      );

      return {
        isWinner: true,
        position,
        reward
      };
    }

    return { isWinner: false, position: -1, reward: 0 };
  }

  /**
   * Calculate reward amount
   * @param {number} bounty - Total bounty
   * @param {number} percentage - Percentage (0-1)
   * @returns {number} Reward in microSTX
   */
  calculateReward(bounty, percentage) {
    return Math.floor(bounty * percentage);
  }

  /**
   * Get the current game data
   * @param {number} gameId - The game ID
   * @returns {object} Game data
   */
  getGameData(gameId) {
    const data = localStorage.getItem(`game_${gameId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get winner at specific position
   * @param {number} gameId - The game ID
   * @param {number} position - Position (1-5)
   * @returns {object} Winner data
   */
  getWinner(gameId, position) {
    const key = `winner_${gameId}_${position}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get all winners for a game
   * @param {number} gameId - The game ID
   * @returns {array} Array of winners
   */
  getAllWinners(gameId) {
    const winners = [];
    for (let i = 1; i <= 5; i++) {
      const winner = this.getWinner(gameId, i);
      if (winner) winners.push(winner);
    }
    return winners;
  }

  /**
   * Format time in milliseconds to readable format
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time
   */
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    return `${seconds}.${String(milliseconds).padStart(3, '0')}s`;
  }

  // ========================
  // DEMO/FALLBACK FUNCTIONS
  // ========================

  /**
   * Demo: Create game using localStorage
   */
  async _createGameDemo(totalRounds, bounty) {
    const gameId = Math.floor(Math.random() * 1000000000);
    const txId = 'demo_tx_' + Math.random().toString(36).substr(2, 9);

    this.currentGameId = gameId;
    this.gameData = {
      gameId,
      totalRounds,
      bounty,
      playerAddress: this.stacksAPI.userAddress || localStorage.getItem('stxAddress'),
      createdAt: Date.now(),
      isActive: true,
      winnersCount: 0,
      txId
    };

    localStorage.setItem(`game_${gameId}`, JSON.stringify(this.gameData));
    localStorage.setItem('currentGameId', String(gameId));

    console.log(`✅ [DEMO] Game created successfully`);
    console.log(`   Game ID: ${gameId}`);
    console.log(`   TX ID: ${txId}`);

    return {
      success: true,
      gameId,
      txId,
      message: 'Game created (demo mode)'
    };
  }

  /**
   * Demo: Update player progress using localStorage
   */
  async _updatePlayerProgressDemo(gameId, currentRound, completionTime) {
    const gameData = this.getGameData(gameId);
    if (!gameData) {
      throw new Error('Game not found');
    }

    let response = {
      success: true,
      gameId,
      currentRound,
      completionTime
    };

    if (currentRound === gameData.totalRounds) {
      // Store completion
      const completions = JSON.parse(localStorage.getItem(`completions_${gameId}`) || '[]');
      completions.push({
        time: completionTime,
        player: this.stacksAPI.userAddress || localStorage.getItem('stxAddress')
      });
      localStorage.setItem(`completions_${gameId}`, JSON.stringify(completions));

      // Check if winner
      const winnerStatus = this.checkWinnerStatus(gameId, completionTime);
      response = { ...response, ...winnerStatus };

      if (winnerStatus.isWinner) {
        this._storeWinnerDemo(gameId, winnerStatus.position, completionTime, winnerStatus.reward);
      }

      console.log(`✅ [DEMO] Game completed!`);
    } else {
      console.log(`✅ [DEMO] Round ${currentRound} recorded`);
    }

    return response;
  }

  /**
   * Demo: Claim reward using localStorage
   */
  async _claimRewardDemo(gameId, position) {
    const winner = this.getWinner(gameId, position);
    if (!winner) {
      throw new Error('No winner found at this position');
    }

    const userAddress = this.stacksAPI.userAddress || localStorage.getItem('stxAddress');
    if (winner.player !== userAddress) {
      throw new Error('You are not the winner at this position');
    }

    if (winner.claimed) {
      throw new Error('Reward already claimed');
    }

    const txId = 'demo_tx_' + Math.random().toString(36).substr(2, 9);
    this._markRewardClaimed(gameId, position, txId);

    console.log(`✅ [DEMO] Reward claimed successfully`);

    return {
      success: true,
      gameId,
      position,
      rewardAmount: winner.reward,
      txId,
      message: 'Reward claimed (demo mode)'
    };
  }

  /**
   * Internal: Store winner in demo mode
   */
  _storeWinnerDemo(gameId, position, completionTime, reward) {
    const key = `winner_${gameId}_${position}`;
    const winner = {
      gameId,
      position,
      player: this.stacksAPI.userAddress || localStorage.getItem('stxAddress'),
      completionTime,
      reward,
      claimed: false,
      claimedAt: null,
      txId: null
    };
    localStorage.setItem(key, JSON.stringify(winner));
  }

  /**
   * Internal: Mark reward as claimed
   */
  _markRewardClaimed(gameId, position, txId) {
    const key = `winner_${gameId}_${position}`;
    const winnerData = JSON.parse(localStorage.getItem(key) || '{}');
    winnerData.claimed = true;
    winnerData.claimedAt = Date.now();
    winnerData.txId = txId;
    localStorage.setItem(key, JSON.stringify(winnerData));
  }

  /**
   * Internal: Get all completions for a game
   */
  _getAllCompletions(gameId) {
    const data = localStorage.getItem(`completions_${gameId}`);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Internal: Get reward percentage for position
   */
  _getRewardPercentage(position) {
    const percentages = [0.40, 0.25, 0.20, 0.10, 0.05]; // 1st-5th place
    return percentages[position - 1] || 0;
  }
}

// Initialize global ContractAPI instance
if (typeof window !== 'undefined') {
  try {
    window.contractAPI = new ContractAPI();
    console.log('🌍 Global contractAPI instance created');
  } catch (error) {
    console.error('⚠️ Failed to initialize contractAPI:', error.message);
    console.log('   Make sure stacksAPI is loaded first!');
  }
}
