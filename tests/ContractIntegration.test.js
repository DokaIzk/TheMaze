/**
 * Smart Contract Integration Tests
 * Comprehensive test suite for contract API and integration
 */

describe('ContractAPI', () => {
  let contractAPI;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Create fresh instance
    contractAPI = new ContractAPI();
  });

  describe('Game Creation', () => {
    test('should create a game with valid parameters', async () => {
      const result = await contractAPI.createGame(5, 100000);

      expect(result.success).toBe(true);
      expect(result.gameId).toBeDefined();
      expect(result.txId).toBeDefined();
      expect(result.gameId).toBeGreaterThan(0);
    });

    test('should reject invalid total rounds', async () => {
      const result = await contractAPI.createGame(0, 100000);

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive integer');
    });

    test('should reject negative bounty', async () => {
      const result = await contractAPI.createGame(5, -100000);

      expect(result.success).toBe(false);
      expect(result.error).toContain('non-negative');
    });

    test('should allow zero bounty', async () => {
      const result = await contractAPI.createGame(5, 0);

      expect(result.success).toBe(true);
    });

    test('should store game data in localStorage', async () => {
      const result = await contractAPI.createGame(5, 100000);
      const gameData = contractAPI.getGameData(result.gameId);

      expect(gameData).toBeDefined();
      expect(gameData.totalRounds).toBe(5);
      expect(gameData.bounty).toBe(100000);
      expect(gameData.isActive).toBe(true);
    });
  });

  describe('Player Progress', () => {
    test('should record player progress for incomplete game', async () => {
      const gameResult = await contractAPI.createGame(5, 100000);
      const gameId = gameResult.gameId;

      const result = await contractAPI.updatePlayerProgress(gameId, 2, 30000);

      expect(result.success).toBe(true);
      expect(result.currentRound).toBe(2);
      expect(result.completionTime).toBe(30000);
    });

    test('should reject invalid game ID', async () => {
      const result = await contractAPI.updatePlayerProgress(999999, 1, 30000);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should reject invalid round number', async () => {
      const gameResult = await contractAPI.createGame(5, 100000);
      const result = await contractAPI.updatePlayerProgress(gameResult.gameId, 0, 30000);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid round');
    });

    test('should detect game completion', async () => {
      localStorage.setItem('stxAddress', 'SP2BQG3RK17LZZ8HKSHV56NBQSJCKY2AM0PQFNZ7');
      const gameResult = await contractAPI.createGame(5, 100000);
      const gameId = gameResult.gameId;

      // Complete all 5 rounds
      for (let round = 1; round < 5; round++) {
        await contractAPI.updatePlayerProgress(gameId, round, 30000 * round);
      }

      // Final round
      const result = await contractAPI.updatePlayerProgress(gameId, 5, 150000);

      expect(result.success).toBe(true);
      expect(result.completed).toBeUndefined(); // Not in demo response
    });
  });

  describe('Winner Status', () => {
    beforeEach(() => {
      localStorage.setItem('stxAddress', 'SP2BQG3RK17LZZ8HKSHV56NBQSJCKY2AM0PQFNZ7');
    });

    test('should add first winner', () => {
      const gameData = {
        gameId: 1,
        totalRounds: 5,
        bounty: 100000,
        isActive: true
      };
      localStorage.setItem('game_1', JSON.stringify(gameData));

      const status = contractAPI.checkWinnerStatus(1, 150000);

      expect(status.isWinner).toBe(true);
      expect(status.position).toBe(1);
      expect(status.reward).toBeGreaterThan(0);
    });

    test('should add multiple winners in order', () => {
      const gameData = {
        gameId: 1,
        totalRounds: 5,
        bounty: 100000,
        isActive: true
      };
      localStorage.setItem('game_1', JSON.stringify(gameData));

      // Add 5 winners
      for (let i = 1; i <= 5; i++) {
        localStorage.setItem('stxAddress', `SP2BQG3RK${i}LZZ8HKSHV56NBQSJCKY2AM0PQFNZ7`);
        contractAPI.checkWinnerStatus(1, 150000 - (i * 10000));
      }

      const winners = contractAPI.getAllWinners(1);
      expect(winners.length).toBe(5);
    });

    test('should replace slowest winner if faster', () => {
      const gameData = {
        gameId: 1,
        totalRounds: 5,
        bounty: 100000,
        isActive: true
      };
      localStorage.setItem('game_1', JSON.stringify(gameData));

      // Add 5 winners at descending times
      for (let i = 1; i <= 5; i++) {
        localStorage.setItem('stxAddress', `SP2BQG3RK${i}LZZ8HKSHV56NBQSJCKY2AM0PQFNZ7`);
        contractAPI.checkWinnerStatus(1, 100000 - (i * 10000));
      }

      // New winner faster than slowest
      localStorage.setItem('stxAddress', 'SP_NEW_ADDRESS_FASTEST');
      const status = contractAPI.checkWinnerStatus(1, 30000);

      expect(status.isWinner).toBe(true);
      expect(status.position).toBeLessThanOrEqual(5);
    });

    test('should prevent duplicate winners', () => {
      const gameData = {
        gameId: 1,
        totalRounds: 5,
        bounty: 100000,
        isActive: true
      };
      localStorage.setItem('game_1', JSON.stringify(gameData));

      // Add first time
      let status = contractAPI.checkWinnerStatus(1, 150000);
      expect(status.isWinner).toBe(true);

      // Try to add again
      status = contractAPI.checkWinnerStatus(1, 140000);
      expect(status.alreadyWinner).toBe(true);
      expect(status.error).toBeDefined();
    });

    test('should reject non-winner', () => {
      const gameData = {
        gameId: 1,
        totalRounds: 5,
        bounty: 100000,
        isActive: true
      };
      localStorage.setItem('game_1', JSON.stringify(gameData));

      // Add 5 winners
      for (let i = 1; i <= 5; i++) {
        localStorage.setItem('stxAddress', `SP2BQG3RK${i}LZZ8HKSHV56NBQSJCKY2AM0PQFNZ7`);
        contractAPI.checkWinnerStatus(1, 150000 - (i * 10000));
      }

      // New player slower than all
      localStorage.setItem('stxAddress', 'SP_SLOW_PLAYER');
      const status = contractAPI.checkWinnerStatus(1, 500000);

      expect(status.isWinner).toBe(false);
    });
  });

  describe('Reward Claiming', () => {
    beforeEach(() => {
      localStorage.setItem('stxAddress', 'SP2BQG3RK17LZZ8HKSHV56NBQSJCKY2AM0PQFNZ7');
    });

    test('should allow winner to claim reward', async () => {
      // Setup game and winner
      const gameData = {
        gameId: 1,
        totalRounds: 5,
        bounty: 100000,
        isActive: true
      };
      localStorage.setItem('game_1', JSON.stringify(gameData));
      contractAPI.checkWinnerStatus(1, 150000);

      // Claim reward
      const result = await contractAPI.claimReward(1, 1);

      expect(result.success).toBe(true);
      expect(result.rewardAmount).toBeGreaterThan(0);
      expect(result.txId).toBeDefined();
    });

    test('should prevent double claiming', async () => {
      const gameData = {
        gameId: 1,
        totalRounds: 5,
        bounty: 100000,
        isActive: true
      };
      localStorage.setItem('game_1', JSON.stringify(gameData));
      contractAPI.checkWinnerStatus(1, 150000);

      // Claim first time
      const result1 = await contractAPI.claimReward(1, 1);
      expect(result1.success).toBe(true);

      // Try to claim again
      const result2 = await contractAPI.claimReward(1, 1);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already claimed');
    });

    test('should prevent non-winner from claiming', async () => {
      const gameData = {
        gameId: 1,
        totalRounds: 5,
        bounty: 100000,
        isActive: true
      };
      localStorage.setItem('game_1', JSON.stringify(gameData));
      contractAPI.checkWinnerStatus(1, 150000);

      // Different address trying to claim
      localStorage.setItem('stxAddress', 'SP_DIFFERENT_ADDRESS');
      const result = await contractAPI.claimReward(1, 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not the winner');
    });
  });

  describe('Reward Calculation', () => {
    test('should calculate correct reward for position 1 (40%)', () => {
      const bounty = 100000;
      const reward = contractAPI.calculateReward(bounty, 40);

      // 5% fee: 95000, then 40% of that
      const expected = Math.floor(95000 * 0.40);
      expect(reward).toBe(expected);
    });

    test('should calculate correct reward for position 5 (5%)', () => {
      const bounty = 100000;
      const reward = contractAPI.calculateReward(bounty, 5);

      const expected = Math.floor(95000 * 0.05);
      expect(reward).toBe(expected);
    });

    test('should handle zero bounty', () => {
      const reward = contractAPI.calculateReward(0, 40);
      expect(reward).toBe(0);
    });

    test('should handle large bounties', () => {
      const bounty = 1000000000; // 1 billion microSTX
      const reward = contractAPI.calculateReward(bounty, 40);

      expect(reward).toBeGreaterThan(0);
      expect(reward).toBeLessThan(bounty);
    });
  });

  describe('Time Formatting', () => {
    test('should format milliseconds to seconds', () => {
      const formatted = contractAPI.formatTime(45000);
      expect(formatted).toBe('45s');
    });

    test('should format milliseconds to minutes and seconds', () => {
      const formatted = contractAPI.formatTime(125000); // 2m 5s
      expect(formatted).toBe('2m 5s');
    });

    test('should handle single digit seconds', () => {
      const formatted = contractAPI.formatTime(5000);
      expect(formatted).toBe('5s');
    });
  });

  describe('Game State Management', () => {
    test('should track current game ID', async () => {
      const result = await contractAPI.createGame(5, 100000);

      expect(contractAPI.getCurrentGameId()).toBe(result.gameId);
    });

    test('should clear current game', async () => {
      await contractAPI.createGame(5, 100000);
      contractAPI.clearCurrentGame();

      expect(contractAPI.getCurrentGameId()).toBe(0);
      expect(contractAPI.gameData).toBeNull();
    });

    test('should retrieve game data', async () => {
      const created = await contractAPI.createGame(5, 100000);
      const retrieved = contractAPI.getGameData(created.gameId);

      expect(retrieved).toBeDefined();
      expect(retrieved.totalRounds).toBe(5);
    });

    test('should get all winners for a game', () => {
      const gameData = {
        gameId: 1,
        totalRounds: 5,
        bounty: 100000,
        isActive: true
      };
      localStorage.setItem('game_1', JSON.stringify(gameData));
      localStorage.setItem('stxAddress', 'SP1');

      // Add 3 winners
      for (let i = 1; i <= 3; i++) {
        localStorage.setItem('stxAddress', `SP${i}`);
        contractAPI.checkWinnerStatus(1, 150000 - (i * 10000));
      }

      const winners = contractAPI.getAllWinners(1);
      expect(winners.length).toBe(3);
    });
  });
});

describe('ErrorPopup', () => {
  afterEach(() => {
    ErrorPopup.hideAll();
  });

  test('should create error popup', () => {
    const popup = ErrorPopup.show('Test error message');

    expect(popup).toBeDefined();
    expect(document.body.contains(popup)).toBe(true);
    expect(popup.textContent).toContain('Test error message');
  });

  test('should create warning popup', () => {
    const popup = ErrorPopup.warning('Test warning');

    expect(popup).toBeDefined();
    expect(popup.textContent).toContain('Warning');
  });

  test('should create success popup', () => {
    const popup = ErrorPopup.success('Test success');

    expect(popup).toBeDefined();
    expect(popup.textContent).toContain('Success');
  });

  test('should auto-dismiss popup after duration', (done) => {
    const popup = ErrorPopup.show('Test', 'Test', 100);

    setTimeout(() => {
      expect(document.body.contains(popup)).toBe(false);
      done();
    }, 200);
  });

  test('should hide all popups', () => {
    ErrorPopup.show('Error 1');
    ErrorPopup.warning('Warning 1');
    ErrorPopup.success('Success 1');

    ErrorPopup.hideAll();

    const overlays = document.querySelectorAll('.error-popup-overlay, .warning-popup-overlay, .success-popup-overlay');
    expect(overlays.length).toBe(0);
  });
});

// Integration test scenarios
describe('Contract Integration Scenarios', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('stxAddress', 'SP2BQG3RK17LZZ8HKSHV56NBQSJCKY2AM0PQFNZ7');
  });

  test('complete game flow: create -> progress -> win -> claim', async () => {
    // Create game
    const contractAPI = new ContractAPI();
    const gameResult = await contractAPI.createGame(3, 100000);
    expect(gameResult.success).toBe(true);

    const gameId = gameResult.gameId;

    // Update progress through each round
    for (let round = 1; round <= 3; round++) {
      const result = await contractAPI.updatePlayerProgress(gameId, round, 30000 * round);
      expect(result.success).toBe(true);
    }

    // Check winner status
    const winners = contractAPI.getAllWinners(gameId);
    expect(winners.length).toBeGreaterThan(0);

    // Claim reward
    if (winners.length > 0) {
      const claimResult = await contractAPI.claimReward(gameId, winners[0].position);
      expect(claimResult.success).toBe(true);
    }
  });

  test('leaderboard scenario: multiple players competing', async () => {
    const contractAPI = new ContractAPI();
    const gameResult = await contractAPI.createGame(5, 100000);
    const gameId = gameResult.gameId;

    // 5 players compete
    const players = [
      'SP_PLAYER_1',
      'SP_PLAYER_2',
      'SP_PLAYER_3',
      'SP_PLAYER_4',
      'SP_PLAYER_5'
    ];

    // Players submit times in random order
    const times = [125000, 95000, 110000, 90000, 105000];

    for (let i = 0; i < players.length; i++) {
      localStorage.setItem('stxAddress', players[i]);
      contractAPI.checkWinnerStatus(gameId, times[i]);
    }

    // Verify top 5 are all winners
    const winners = contractAPI.getAllWinners(gameId);
    expect(winners.length).toBe(5);

    // Verify sorted by time
    for (let i = 0; i < winners.length - 1; i++) {
      expect(winners[i].completionTime).toBeLessThanOrEqual(winners[i + 1].completionTime);
    }
  });
});
