# ✅ The Maze - Quick Start Guide

## Start the Game

```bash
cd frontend
npm start
# Open http://localhost:3000 in your browser
```

## Test Wallet Connection

1. **Click "Connect Wallet" button**
   - You'll see: `🔗 Connecting wallet (demo mode)...`
   - After ~500ms: ✅ Wallet connected with demo address
   - Example: `SPXY4K2G8ZBJNP2R4F8X9M5QWER7YZ2K1L3M4N5`

2. **Check console** (F12 → Console)
   ```
   ✅ StacksAPI instance created (demo mode)
   🔗 Connecting wallet (demo mode)...
   ✅ Restored previous wallet connection: SPXY4K2G8ZBJNP2R4F8X9M5QWER7YZ2K1L3M4N5
   ```

3. **Reload the page** (F5)
   - Your wallet stays connected! ✅
   - Address persists from localStorage

## Play a Game

1. Select difficulty level (1-10)
2. Complete the maze puzzle
3. Watch the blockchain transaction simulations:
   ```
   📊 Demo: Updating progress: Game 1, Level 5, Time 12s, Score 450
   ✅ Demo progress updated: demo-update-a1b2c3d4e5
   
   🏆 Demo: Submitting final score: Game 1, Score 5000, Level 10
   ✅ Demo score submitted: demo-score-x8y9z0a1b2
   ```

## What's Different from Production?

| Feature | Demo Mode | Production |
|---------|-----------|-----------|
| Wallet Connection | Instant (localStorage) | 🧩 Leather/Hiro wallet popup |
| Transactions | Fake IDs (demo-xxx) | Real blockchain TXIDs |
| Persistence | localStorage | Smart contract state |
| Speed | ⚡ Instant | ⏱️ Network-dependent |
| Requirements | None | HTTPS + Stacks network |

## Debugging

### Check Wallet Storage
```javascript
// In browser console:
localStorage.getItem('themaze:wallet')
// Output: {"address":"SP...","publicKey":"test-public-key-xxx","connectedAt":"2025-10-17T..."}
```

### Clear Wallet (Start Fresh)
```javascript
// In browser console:
localStorage.removeItem('themaze:wallet')
location.reload()
```

### Check StacksAPI Status
```javascript
// In browser console:
window.stacksAPI.isUserConnected()    // true/false
window.stacksAPI.getUserAddress()     // "SP..."
window.stacksAPI.userPublicKey        // "test-public-key-xxx"
```

## Common Issues

### "StacksAPI instance created but wallet won't connect"
**Solution**: Check browser console for errors. If localStorage is disabled, it will fail.

### "Wallet address changes on each reload"
**Solution**: This is normal in demo mode if localStorage is cleared. Check Settings → Privacy.

### "Transaction IDs look fake"
**✅ Correct!** In demo mode, all transactions return IDs like `demo-tx-xxxxx`. This is expected.

## Next Steps: Production Deployment

When ready to deploy with real Stacks.js:

1. **Add @stacks/connect to `index.html`**
2. **Update `connectWallet()` in `stacksAPI.js`**
3. **Deploy on HTTPS**
4. **See [WALLET_DEMO_MODE_GUIDE.md](./WALLET_DEMO_MODE_GUIDE.md) for details**

---

**Currently Running**: Demo Mode (localStorage)  
**Wallet Status**: ✅ Functional  
**Ready for Testing**: ✅ Yes  
**Ready for Production**: ⏳ Needs Stacks.js integration

