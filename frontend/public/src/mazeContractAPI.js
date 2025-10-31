// MazeContractAPI.js - Handles wallet and contract interactions
// Use global ethers from CDN
const ethers = window.ethers;

// Load ABI from JSON file (async)
let MazeGameBountyABI = null;
const ABI_PATH = 'src/contracts/MazeGameBounty.json';

function loadABI() {
    return fetch(ABI_PATH)
        .then(response => response.json())
        .then(json => { MazeGameBountyABI = json; });
}

const CONTRACT_ADDRESS = '0xC7D14837893B8a2D8011242b8891202Cd76eC1A1';

class MazeContractAPI {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.address = null;
        this.abiLoaded = false;
        loadABI().then(() => { this.abiLoaded = true; });
    }

    async connectWallet() {
        if (!window.ethereum) throw new Error('MetaMask not found');
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        this.address = await this.signer.getAddress();
        if (!MazeGameBountyABI) await loadABI();
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, MazeGameBountyABI, this.signer);
        return this.address;
    }

    async createGame(totalRounds, bountyEth) {
        if (!this.contract) throw new Error('Wallet not connected');
        try {
            const tx = await this.contract.createGame(totalRounds, { value: ethers.parseEther(bountyEth.toString()) });
            const receipt = await tx.wait();
            // Get gameId from event logs
            let gameId = null;
            let txId = tx.hash;
            for (const log of receipt.logs) {
                if (log.fragment && log.fragment.name === 'GameCreated') {
                    gameId = log.args.gameId.toString();
                }
            }
            return { success: true, gameId, txId };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updatePlayerProgress(gameId, currentRound, completionTime) {
        if (!this.contract) throw new Error('Wallet not connected');
        try {
            const tx = await this.contract.updatePlayerProgress(gameId, currentRound, completionTime);
            await tx.wait();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async claimReward(gameId, position) {
        if (!this.contract) throw new Error('Wallet not connected');
        try {
            const tx = await this.contract.claimReward(gameId, position);
            await tx.wait();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getGame(gameId) {
        if (!this.contract) throw new Error('Wallet not connected');
        return await this.contract.getGame(gameId);
    }

    async getPlayerProgress(gameId, address) {
        if (!this.contract) throw new Error('Wallet not connected');
        return await this.contract.getPlayerProgress(gameId, address);
    }
}

window.contractAPI = new MazeContractAPI();
