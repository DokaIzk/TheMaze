// Smart contract interaction functions
class ContractCalls {
    constructor(stacksAPI) {
        this.stacksAPI = stacksAPI;
    }

    async registerPlayer() {
        if (!this.stacksAPI.isWalletConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const txOptions = {
                contractAddress: CONFIG.CONTRACT_ADDRESS,
                contractName: CONFIG.CONTRACT_NAME,
                functionName: 'register-player',
                functionArgs: [],
                senderKey: this.stacksAPI.userAddress,
                network: this.stacksAPI.network,
                postConditionMode: 1, // Allow
                fee: 1000 // 0.001 STX
            };

            const transaction = await StacksTransactions.makeContractCall(txOptions);
            const txId = await StacksConnect.openContractCall(txOptions);
            
            return { txId, transaction };
        } catch (error) {
            console.error('Error registering player:', error);
            throw error;
        }
    }

    async submitScore(score, levelReached) {
        if (!this.stacksAPI.isWalletConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const txOptions = {
                contractAddress: CONFIG.CONTRACT_ADDRESS,
                contractName: CONFIG.CONTRACT_NAME,
                functionName: 'submit-score',
                functionArgs: [
                    StacksTransactions.uintCV(score),
                    StacksTransactions.uintCV(levelReached)
                ],
                senderKey: this.stacksAPI.userAddress,
                network: this.stacksAPI.network,
                postConditionMode: 1, // Allow
                fee: 2000 // 0.002 STX
            };

            const transaction = await StacksTransactions.makeContractCall(txOptions);
            const txId = await StacksConnect.openContractCall(txOptions);
            
            return { txId, transaction };
        } catch (error) {
            console.error('Error submitting score:', error);
            throw error;
        }
    }

    async getPlayerScore(playerAddress = null) {
        const address = playerAddress || this.stacksAPI.userAddress;
        if (!address) {
            throw new Error('No address provided');
        }

        try {
            const txOptions = {
                contractAddress: CONFIG.CONTRACT_ADDRESS,
                contractName: CONFIG.CONTRACT_NAME,
                functionName: 'get-player-score',
                functionArgs: [StacksTransactions.principalCV(address)],
                network: this.stacksAPI.network,
                senderAddress: address
            };

            const result = await StacksTransactions.callReadOnlyFunction(txOptions);
            return StacksTransactions.cvToValue(result);
        } catch (error) {
            console.error('Error getting player score:', error);
            return 0;
        }
    }

    async getPlayerStats(playerAddress = null) {
        const address = playerAddress || this.stacksAPI.userAddress;
        if (!address) {
            throw new Error('No address provided');
        }

        try {
            const txOptions = {
                contractAddress: CONFIG.CONTRACT_ADDRESS,
                contractName: CONFIG.CONTRACT_NAME,
                functionName: 'get-player-stats',
                functionArgs: [StacksTransactions.principalCV(address)],
                network: this.stacksAPI.network,
                senderAddress: address
            };

            const result = await StacksTransactions.callReadOnlyFunction(txOptions);
            const stats = StacksTransactions.cvToValue(result);
            
            return stats || {
                score: 0,
                'games-played': 0,
                'last-played': 0
            };
        } catch (error) {
            console.error('Error getting player stats:', error);
            return {
                score: 0,
                'games-played': 0,
                'last-played': 0
            };
        }
    }

    async getLeaderboard(start = 1, count = 10) {
        try {
            const txOptions = {
                contractAddress: CONFIG.CONTRACT_ADDRESS,
                contractName: CONFIG.CONTRACT_NAME,
                functionName: 'get-leaderboard',
                functionArgs: [
                    StacksTransactions.uintCV(start),
                    StacksTransactions.uintCV(count)
                ],
                network: this.stacksAPI.network,
                senderAddress: this.stacksAPI.userAddress || CONFIG.CONTRACT_ADDRESS
            };

            const result = await StacksTransactions.callReadOnlyFunction(txOptions);
            const leaderboard = StacksTransactions.cvToValue(result);
            
            return leaderboard || [];
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    }

    async getTopPlayers() {
        try {
            const txOptions = {
                contractAddress: CONFIG.CONTRACT_ADDRESS,
                contractName: CONFIG.CONTRACT_NAME,
                functionName: 'get-top-players',
                functionArgs: [],
                network: this.stacksAPI.network,
                senderAddress: this.stacksAPI.userAddress || CONFIG.CONTRACT_ADDRESS
            };

            const result = await StacksTransactions.callReadOnlyFunction(txOptions);
            const topPlayers = StacksTransactions.cvToValue(result);
            
            return topPlayers || [];
        } catch (error) {
            console.error('Error getting top players:', error);
            return [];
        }
    }

    async isPlayerRegistered(playerAddress = null) {
        const address = playerAddress || this.stacksAPI.userAddress;
        if (!address) {
            return false;
        }

        try {
            const txOptions = {
                contractAddress: CONFIG.CONTRACT_ADDRESS,
                contractName: CONFIG.CONTRACT_NAME,
                functionName: 'is-player-registered',
                functionArgs: [StacksTransactions.principalCV(address)],
                network: this.stacksAPI.network,
                senderAddress: address
            };

            const result = await StacksTransactions.callReadOnlyFunction(txOptions);
            return StacksTransactions.cvToValue(result);
        } catch (error) {
            console.error('Error checking player registration:', error);
            return false;
        }
    }

    async getPlayerRank(playerAddress = null) {
        const address = playerAddress || this.stacksAPI.userAddress;
        if (!address) {
            throw new Error('No address provided');
        }

        try {
            const txOptions = {
                contractAddress: CONFIG.CONTRACT_ADDRESS,
                contractName: CONFIG.CONTRACT_NAME,
                functionName: 'get-player-rank',
                functionArgs: [StacksTransactions.principalCV(address)],
                network: this.stacksAPI.network,
                senderAddress: address
            };

            const result = await StacksTransactions.callReadOnlyFunction(txOptions);
            const rank = StacksTransactions.cvToValue(result);
            
            return rank || null;
        } catch (error) {
            console.error('Error getting player rank:', error);
            return null;
        }
    }

    // Helper function to handle score submission with user feedback
    async submitScoreWithFeedback(score, level, onStatusUpdate) {
        try {
            onStatusUpdate('Submitting score to blockchain...');
            
            // Check if player is registered
            const isRegistered = await this.isPlayerRegistered();
            
            if (!isRegistered) {
                onStatusUpdate('Registering player...');
                await this.registerPlayer();
                
                // Wait a bit for registration to process
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            // Submit the score
            const { txId } = await this.submitScore(score, level);
            
            if (txId) {
                onStatusUpdate('Transaction submitted. Waiting for confirmation...');
                
                // Wait for transaction confirmation
                const result = await this.stacksAPI.waitForTransaction(txId);
                
                if (result.success) {
                    onStatusUpdate('Score submitted successfully!');
                    return { success: true, txId };
                } else {
                    onStatusUpdate(`Transaction failed: ${result.status}`);
                    return { success: false, error: result.status };
                }
            }
            
        } catch (error) {
            console.error('Error submitting score:', error);
            onStatusUpdate(`Error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

// Create global instance
window.contractCalls = new ContractCalls(window.stacksAPI);
