// Stacks API integration - Real Blockchain Connection
class StacksAPI {
    constructor() {
        this.isWalletConnected = false;
        this.userAddress = null;
        this.userSession = null;
        this.network = CONFIG.NETWORK === 'mainnet' ? 
            new StacksNetwork.StacksMainnet() : 
            new StacksNetwork.StacksTestnet();
        
        console.log('✅ StacksAPI initialized');
        console.log(`   Network: ${CONFIG.NETWORK}`);
        console.log(`   API URL: ${this.network.coreApiUrl}`);
        
        // Check if wallet was previously connected
        this.checkPreviousConnection();
    }

    checkPreviousConnection() {
        const savedAddress = localStorage.getItem('stxAddress');
        if (savedAddress) {
            this.isWalletConnected = true;
            this.userAddress = savedAddress;
            console.log('✅ Restored previous wallet connection:', this.userAddress);
        }
    }

    async connectWallet() {
        try {
            console.log('🔗 Initiating wallet connection...');
            
            // Check if @stacks/connect is available
            if (!window.StacksConnect) {
                throw new Error('@stacks/connect library not loaded. Please refresh the page.');
            }

            const appDetails = {
                name: "StackRunner",
                icon: window.location.origin + "/assets/images/maze-logo.png"
            };

            console.log('📱 Opening wallet connection dialog...');
            
            const authResponse = await window.StacksConnect.showConnect({
                appDetails,
                redirectTo: window.location.origin,
                onCancel: () => {
                    console.log('⚠️ Wallet connection cancelled by user');
                    return { success: false, error: 'User cancelled wallet connection' };
                }
            });

            if (authResponse && authResponse.userSession) {
                // Extract the STX address
                const userData = authResponse.userSession.loadUserData();
                const stxAddress = userData.profile.stxAddress[CONFIG.NETWORK];
                
                this.userAddress = stxAddress;
                this.isWalletConnected = true;
                this.userSession = authResponse.userSession;

                // Persist address to localStorage
                localStorage.setItem('stxAddress', stxAddress);
                localStorage.setItem('walletConnected', 'true');

                console.log('✅ Wallet connected successfully');
                console.log(`   Address: ${stxAddress}`);
                console.log(`   Network: ${CONFIG.NETWORK}`);

                return {
                    success: true,
                    address: stxAddress
                };
            } else {
                throw new Error('No authentication response received');
            }
            
        } catch (error) {
            console.error('❌ Error connecting wallet:', error);
            return {
                success: false,
                error: error.message || 'Failed to connect wallet'
            };
        }
    }

    async disconnectWallet() {
        try {
            console.log('🔓 Disconnecting wallet...');
            this.isWalletConnected = false;
            this.userAddress = null;
            this.userSession = null;
            
            localStorage.removeItem('stxAddress');
            localStorage.removeItem('walletConnected');
            
            console.log('✅ Wallet disconnected');
            return { success: true };
        } catch (error) {
            console.error('❌ Error disconnecting wallet:', error);
            return { success: false, error: error.message };
        }
    }

    async callContractFunction(functionName, args = [], amount = null) {
        try {
            if (!this.isWalletConnected || !this.userAddress) {
                throw new Error('Wallet not connected');
            }

            console.log(`🔗 Calling contract function: ${functionName}`);
            console.log(`   Function: ${this.constructor.name}.${functionName}`);
            console.log(`   Args: ${JSON.stringify(args)}`);

            const txOptions = {
                contractAddress: CONFIG.CONTRACT_ADDRESS,
                contractName: CONFIG.CONTRACT_NAME,
                functionName: functionName,
                functionArgs: args,
                userSession: this.userSession,
                network: this.network
            };

            if (amount) {
                txOptions.amount = amount;
            }

            const response = await window.StacksConnect.openContractCall(txOptions);

            if (response && response.txid) {
                console.log(`✅ Transaction submitted`);
                console.log(`   TX ID: ${response.txid}`);
                return {
                    success: true,
                    txId: response.txid
                };
            } else {
                throw new Error('No transaction ID returned');
            }

        } catch (error) {
            console.error('❌ Error calling contract function:', error);
            return {
                success: false,
                error: error.message || 'Contract call failed'
            };
        }
    }

    async getAccountBalance() {
        if (!this.userAddress) {
            throw new Error('Wallet not connected');
        }

        try {
            const response = await fetch(
                `${this.network.coreApiUrl}/extended/v1/address/${this.userAddress}/balances`
            );
            const data = await response.json();
            return data.stx.balance;
        } catch (error) {
            console.error('❌ Error fetching balance:', error);
            throw error;
        }
    }

    async getTransactionStatus(txId) {
        try {
            const response = await fetch(
                `${this.network.coreApiUrl}/extended/v1/tx/${txId}`
            );
            const data = await response.json();
            return data.tx_status;
        } catch (error) {
            console.error('❌ Error fetching transaction status:', error);
            throw error;
        }
    }

    async waitForTransaction(txId, maxWaitTime = 60000) {
        const startTime = Date.now();
        let checkCount = 0;
        
        console.log(`⏳ Waiting for transaction confirmation: ${txId}`);
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const status = await this.getTransactionStatus(txId);
                checkCount++;
                
                console.log(`   Check #${checkCount}: Status = ${status}`);
                
                if (status === 'success') {
                    console.log(`✅ Transaction confirmed!`);
                    return { success: true, status };
                } else if (status === 'abort_by_response' || status === 'abort_by_post_condition') {
                    console.error(`❌ Transaction failed with status: ${status}`);
                    return { success: false, status };
                }
                
                // Wait 2 seconds before checking again
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.warn(`⚠️ Error checking transaction status (attempt ${checkCount}):`, error.message);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.error(`❌ Transaction confirmation timeout after ${maxWaitTime}ms`);
        return { success: false, status: 'timeout' };
    }
}

// Initialize global StacksAPI instance
if (typeof window !== 'undefined') {
    window.stacksAPI = new StacksAPI();
    console.log('🌍 Global stacksAPI instance created');
}
