# Step 1: Fix Maze Overflow Issue

## Problem
When maze dimensions scale from 20×20 (Level 1) to 40×40 (Level 10), larger mazes overflow beyond the screen boundaries because they use a fixed cell size.

## Solution Implemented
Added dynamic cell size calculation in `generateNewLevel()` method:

### Key Changes:
1. **Dynamic Cell Size Calculation**: 
   - Calculates maximum cell size that fits within available screen space
   - Considers both width and height constraints
   - Uses the smaller dimension to ensure maze fits completely

2. **Screen Space Management**:
   - Accounts for UI space (80px top padding)
   - Adds padding (20px) to prevent maze from touching screen edges
   - Centers maze within available space

3. **Maze Visual Updates**:
   - Updated `createMazeVisuals()` to use `this.levelCellSize` instead of fixed `CONFIG.CELL_SIZE`
   - All wall drawing now uses the dynamic cell size

## Code Changes Made:

### In `generateNewLevel()`:
```javascript
// Calculate dynamic cell size to ensure maze fits
const maxCellSizeForWidth = Math.floor(usableWidth / mazeConfig.width);
const maxCellSizeForHeight = Math.floor(usableHeight / mazeConfig.height);
const dynamicCellSize = Math.max(8, Math.min(maxCellSizeForWidth, maxCellSizeForHeight));

// Store for use in maze rendering
this.levelCellSize = dynamicCellSize;
```

### In `createMazeVisuals()`:
```javascript
// Use dynamic cell size instead of CONFIG.CELL_SIZE
const worldX = x * this.levelCellSize + this.mazeOffsetX;
const worldY = y * this.levelCellSize + this.mazeOffsetY;
```

## Expected Behavior:
- **Level 1 (20×20)**: Large cells, maze fits comfortably with plenty of space
- **Level 5 (30×30)**: Medium cells, maze still fits well within screen
- **Level 10 (40×40)**: Smaller cells, maze fits exactly within available space

## What's Still Needed:
This fixes the visual maze overflow, but there are still issues with:
- Player/token positioning (still using CONFIG.CELL_SIZE)
- Movement system (collision detection still using CONFIG.CELL_SIZE)
- Entity sizing (not scaling proportionally)

## Testing:
Start the game and navigate through levels to verify:
1. ✅ Level 1 maze appears properly sized and centered
2. ✅ Higher levels don't overflow the screen
3. ✅ Maze walls render correctly at all sizes
4. ❌ Player movement may still have issues (expected - will fix in next steps)
5. ❌ Entity sizes may appear disproportionate (expected - will fix in next steps)
