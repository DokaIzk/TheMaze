# StackRunner Game - Test Checklist

## Date: October 13, 2025
## Version: Mobile-Ready Build

---

## ✅ Core Functionality Tests

### Game Initialization
- [ ] Game loads without console errors
- [ ] Maze generates correctly (45x30 cells)
- [ ] Mouse sprite appears with pixel art design
- [ ] Main STX token (orange) appears with Stacks logo
- [ ] Mini STX tokens (blue) appear with Stacks logo
- [ ] UI displays score, level, and timer
- [ ] Timer starts counting down from 60 seconds

### Keyboard Controls (Desktop)
- [ ] W key moves mouse up
- [ ] A key moves mouse left
- [ ] S key moves mouse down
- [ ] D key moves mouse right
- [ ] Arrow Up moves mouse up
- [ ] Arrow Left moves mouse left
- [ ] Arrow Down moves mouse down
- [ ] Arrow Right moves mouse right
- [ ] P key pauses game
- [ ] P key unpauses game
- [ ] Click anywhere unpauses game

### Mobile Controls
- [ ] Swipe up moves mouse up (one cell)
- [ ] Swipe down moves mouse down (one cell)
- [ ] Swipe left moves mouse left (one cell)
- [ ] Swipe right moves mouse right (one cell)
- [ ] Tap pauses game
- [ ] Tap unpauses game
- [ ] Swipe animations are smooth

### Collision Detection
- [ ] Mouse cannot pass through walls
- [ ] Mouse stops at maze boundaries
- [ ] Wall collision works in all directions
- [ ] Mouse slides along walls when moving diagonally
- [ ] Collision detection works with both keyboard and swipe

### Game Mechanics
- [ ] Collecting main STX (orange) increases score
- [ ] Collecting main STX advances to next level
- [ ] New maze generates after collecting main STX
- [ ] Mini STX tokens (blue) add bonus points
- [ ] Timer adds bonus points when main STX collected
- [ ] Timer counts down correctly
- [ ] Game ends when timer reaches 0
- [ ] Game over screen displays final score

### Pause System
- [ ] P key toggles pause
- [ ] Pause overlay shows "PAUSED" text
- [ ] Game freezes when paused (timer, movement)
- [ ] Click to unpause works
- [ ] Window blur auto-pauses game
- [ ] Pause works during gameplay

### Visual Effects
- [ ] Mouse sprite has subtle pulsing glow
- [ ] STX tokens have rotation animation
- [ ] STX tokens have glow effect
- [ ] Maze walls have neon blue outline
- [ ] Floor tiles have dark cyberpunk aesthetic
- [ ] Sprites are crisp pixel art (no blurring)

---

## 🎨 Visual Quality Tests

### Sprite Quality
- [ ] Mouse sprite (12x12) is pixel-perfect
- [ ] Mouse has dark blue ears
- [ ] Mouse has gray-blue body
- [ ] Mouse has pink curved tail
- [ ] Mouse has white eyes
- [ ] Mouse has neon cyan glow stripe
- [ ] Main STX token (16x16) shows orange background
- [ ] Main STX has white Stacks asterisk logo
- [ ] Mini STX token (12x12) shows blue background
- [ ] Mini STX has white Stacks logo
- [ ] No sprite blurring or anti-aliasing artifacts

### Maze Rendering
- [ ] Maze is centered in viewport
- [ ] Walls have neon blue glow
- [ ] Paths are dark with subtle grid
- [ ] UI space at top (80px) is clear
- [ ] Maze fits within viewport without scrolling

---

## 📱 Mobile-Specific Tests

### Responsiveness
- [ ] Game fills entire mobile screen
- [ ] No horizontal scrolling
- [ ] No vertical scrolling
- [ ] UI elements are readable on small screens
- [ ] Touch targets are large enough

### Touch Interactions
- [ ] Single tap registers correctly
- [ ] Swipe gestures don't cause page scroll
- [ ] Multi-touch doesn't cause issues
- [ ] Zoom is disabled
- [ ] Double-tap doesn't zoom

### PWA Features
- [ ] manifest.json loads correctly
- [ ] App is installable on mobile
- [ ] App icon appears correctly
- [ ] Splash screen shows when launching

### Performance
- [ ] Game runs at 60 FPS on mobile
- [ ] No lag during movement
- [ ] No lag during level transitions
- [ ] Battery usage is reasonable

---

## 🔗 Blockchain Integration Tests

### Wallet Connection
- [ ] "Connect Wallet" button appears
- [ ] Hiro/Leather wallet extension detected
- [ ] Wallet connection successful
- [ ] Wallet address displays in UI
- [ ] Disconnect works correctly

### Score Submission
- [ ] Score submits to blockchain after game over
- [ ] Transaction confirmation appears
- [ ] Leaderboard updates with new score
- [ ] Multiple submissions work correctly
- [ ] Error handling for failed transactions

---

## 🐛 Known Issues

### Fixed Issues
✅ Collision detection - Fixed wall checking
✅ Keyboard input not working - Fixed event listeners
✅ Pause not unpausing - Changed to window events
✅ Maze off-center - Added UI space offset
✅ Player passing through walls - Rewrote collision system

### Current Issues
- [ ] None reported yet

---

## 🚀 Performance Metrics

### Target Metrics
- Frame Rate: 60 FPS
- Load Time: < 2 seconds
- First Interaction: < 1 second
- Memory Usage: < 100 MB

### Actual Metrics (to be measured)
- Frame Rate: _____
- Load Time: _____
- First Interaction: _____
- Memory Usage: _____

---

## 📝 Testing Notes

### Desktop Testing (Chrome/Firefox/Safari)
```
Browser: _____
OS: _____
Screen Resolution: _____
Issues Found: _____
```

### Mobile Testing (iOS/Android)
```
Device: _____
OS Version: _____
Browser: _____
Issues Found: _____
```

---

## ✨ Additional Features to Test

### Future Enhancements
- [ ] Sound effects for movement
- [ ] Sound effects for collection
- [ ] Background music
- [ ] Power-ups
- [ ] Different maze themes
- [ ] Multiplayer mode
- [ ] Daily challenges

---

## 🎯 Critical Path Test Scenario

1. Open game on desktop browser
2. Wait for game to load
3. Use WASD to navigate maze
4. Collect mini STX tokens
5. Find and collect main STX token
6. Verify level advances
7. Press P to pause
8. Press P to unpause
9. Continue until timer runs out
10. Verify game over screen
11. Check final score

**Status:** [ ] PASS / [ ] FAIL

---

## 📊 Test Results Summary

- Total Tests: 80+
- Tests Passed: _____
- Tests Failed: _____
- Tests Skipped: _____
- Success Rate: _____%

**Overall Status:** [ ] READY FOR PRODUCTION / [ ] NEEDS FIXES

---

## 👥 Tested By

- Name: _____
- Date: _____
- Signature: _____
