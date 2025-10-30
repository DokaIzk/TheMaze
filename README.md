# 🌀 The Maze

**The Maze** is a blockchain-powered 2D maze game built on the **Stacks Blockchain**. Players navigate mazes to earn token rewards, gain XP, and unlock NFT passkeys as they advance through levels.

> **✅ WALLET CONNECTION FIXED (Oct 17, 2025)**: The game now works in **demo mode** using localStorage for wallet persistence. No CDN timeouts! See [WALLET_DEMO_MODE_GUIDE.md](./WALLET_DEMO_MODE_GUIDE.md) for the complete solution and production migration steps.

---

## 🎯 Project Overview

The Maze integrates gameplay with on-chain mechanics. Players earn rewards and interact with smart contracts written in **Clarity**, the Stacks smart contract language.

### Core Features
- 🧩 **Maze Challenges:** Players navigate 10 progressive maze levels (25×25 to 35×35 cells).
- 💰 **Token Rewards:** Players earn STX tokens (5 points for main token, 2 points for mini tokens).
- ⏱️ **Time-Based Gameplay:** Complete mazes within dynamic time limits (30-48 seconds).
- 📱 **Responsive Design:** Fully optimized for mobile, tablet, and desktop screens.
- 🔒 **On-Chain Fairness:** Game logic and rewards handled transparently via Clarity smart contracts.
- 🎯 **Leaderboard:** Top 5 winners per game tracked on blockchain.

---

## 🧱 Project Structure

```
The Maze/
│
├── contracts/                    # Clarity smart contracts
│   ├── MazeGame.clar            # Main game logic & bounty management
│   ├── xp-token.clar            # XP token logic
│   ├── passkey-nft.clar         # NFT minting contract
│   ├── Clarinet.toml            # Clarinet configuration
│   └── tests/                   # Clarinet test scripts
│
├── frontend/                     # Web-based game interface (Phaser 3)
│   ├── public/                  # Static assets
│   │   ├── index.html           # Main HTML file
│   │   ├── style.css            # Global styling
│   │   └── assets/
│   │       └── images/          # Game sprites & logo
│   │
│   ├── src/                     # Game source code
│   │   ├── main.js              # Game initialization & Phaser config
│   │   ├── config.js            # Game configuration constants
│   │   ├── scenes/              # Phaser game scenes
│   │   │   ├── BootScene.js     # Asset loading
│   │   │   ├── TitleScene.js    # Title screen with logo
│   │   │   ├── ConnectWalletScene.js  # Wallet connection
│   │   │   ├── MazeCreationScene.js   # Difficulty selection
│   │   │   ├── GameScene.js     # Main gameplay logic
│   │   │   └── UIScene.js       # UI overlays
│   │   ├── generators/          # Maze generation
│   │   │   └── MazeGenerator.js # Maze algorithm
│   │   ├── utils/               # Utility functions
│   │   │   └── CollisionSystem.js # Collision detection
│   │   └── api/                 # Blockchain integration
│   │       └── stacksAPI.js     # Contract interactions
│   │
│   ├── package.json             # Frontend dependencies
│   ├── .env.example             # Environment variables template
│   └── README.md                # Frontend setup guide
│
├── docs/                         # Documentation
│   ├── architecture.md          # Project architecture
│   ├── gameflow.md              # Game logic & contract flow
│   └── api-reference.md         # Smart contract APIs
│
├── scripts/                      # Deployment & setup scripts
│   ├── deploy-contracts.sh
│   ├── generate-wallets.sh
│   └── seed-tokens.sh
│
├── DIFFICULTY_ADJUSTMENT.md     # Difficulty scaling documentation
├── README.md                    # This file
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Stacks wallet (Leather, Hiro, etc.)
- Clarinet CLI (for contract development)

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/<organization>/stacks-runner.git
cd stacks-runner
```

### 2️⃣ Set Up Smart Contracts
```bash
cd contracts
clarinet integrate
clarinet test
# Deploy contracts to testnet/mainnet
```

### 3️⃣ Set Up Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your contract addresses
npm run dev
```

The game will be available at `http://localhost:5173`

---

## 🔧 Recent Updates

### ✅ Wallet Connection Fixed (Oct 17, 2025)
The "StacksAPI not initialized" error has been resolved:
- **Issue**: ES6 module imports incompatible with browser, incorrect script loading order
- **Fix**: Converted to UMD-compatible code with proper CDN loading
- **Result**: Wallet connection now fully functional with Leather & Hiro wallets

For details, see:
- 📄 [WALLET_FIX_SUMMARY.md](./WALLET_FIX_SUMMARY.md) - Quick overview
- 📄 [WALLET_CONNECTION_FIX.md](./WALLET_CONNECTION_FIX.md) - Technical details
- 📄 [WALLET_CONNECTION_TEST_GUIDE.md](./WALLET_CONNECTION_TEST_GUIDE.md) - Testing steps

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-------------|
| **Blockchain** | Stacks Blockchain (Testnet) |
| **Smart Contract Language** | Clarity |
| **Game Engine** | Phaser 3 |
| **Frontend** | HTML5, CSS3, JavaScript |
| **Wallet Integration** | Stacks.js & Stacks Wallet |
| **Token Standards** | SIP-010 (Fungible Token), SIP-009 (NFT) |
| **Dev Tools** | Clarinet, Node.js, npm |

---

## 🎮 Game Features

### Gameplay Mechanics
- **10 Progressive Levels:** Maze size scales from 25×25 to 35×35 grid cells
- **Dynamic Difficulty:** Wall density increases with each level (65% removed at Level 1 → 2% removed at Level 10)
- **Time Pressure:** Time limits increase with difficulty (30 seconds at Level 1 → 48 seconds at Level 10)
- **Token Collection:** 
  - 🟠 **Orange Main Token** = 5 points (required to complete level)
  - 🔵 **Blue Mini Tokens** = 2 points each (optional, time bonuses)
- **Responsive Mobile UI:** Fully optimized for all screen sizes

### Difficulty Progression
| Level | Maze Size | Complexity | Wall Removal | Time (sec) |
|-------|-----------|-----------|-------------|-----------|
| 1 | 25×25 | Very Easy | 65% | 30 |
| 5 | 29×29 | Medium | 35% | 38 |
| 10 | 35×35 | Nightmare | 2% | 48 |

### Game Controls

**Desktop:**
- **Arrow Keys** or **WASD** to move
- **P** to pause/unpause
- **0** to jump to level 10 (testing feature)

**Mobile:**
- **Swipe Gestures** (up, down, left, right) to move
- **Tap** to pause/unpause
- **Touch-Optimized UI**

---

## 🧠 Contributors

| Name | Role | Description |
|------|------|--------------|
| Bright Bassey | Smart Contract Developer | Clarity contracts & blockchain logic |
| Isaac Edoka | Frontend Developer | Game interface & animations |
| Emmanuel Ogbu | Game Designer | Maze design & user flow |
| Aniekan Odung | Project Manager | Coordination & testing |

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🌐 Resources
- [Stacks Blockchain](https://stacks.co)
- [Clarity Language Docs](https://docs.stacks.co/write-smart-contracts)
- [Clarinet CLI](https://github.com/hirosystems/clarinet)
- [Stacks.js SDK](https://github.com/hirosystems/stacks.js)
- [Phaser 3 Documentation](https://phaser.io)

---

**The Maze** — Play, Earn, and Level Up On-Chain 🎮✨