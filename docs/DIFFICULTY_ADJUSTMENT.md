# Difficulty and Size Adjustments

## Changes Made (Updated Progressive Difficulty)

### 1. Increased Maze Sizes
- **Minimum size**: 8×8 → **12×12** (Level 1)
- **Maximum size**: 15×15 → **20×20** (Level 10)
- Level 1 is now significantly larger and more challenging

### 2. Reduced Wall Removal (Increased Difficulty)
- **Level 1**: 40% → **15%** walls removed (much more complex)
- **Level 2**: 35% → **12%** 
- **Level 3**: 30% → **10%**
- **Level 4**: 25% → **8%**
- **Level 5**: 20% → **6%**
- **Level 6**: 15% → **4%**
- **Level 7**: 10% → **3%**
- **Level 8**: 5% → **2%**
- **Level 9**: 2% → **1%**
- **Level 10**: 0% → **0%** (unchanged - max complexity)

### 3. Increased Entity Sizes
- **Player (Mouse)**: 13px → **20px** (54% larger)
- **Main STX Token**: 24px → **32px** (33% larger)
- **Mini STX Token**: 18px → **24px** (33% larger)

## New Difficulty Progression

| Level | Maze Size | Complexity    | Wall Removal | Description |
|-------|-----------|---------------|--------------|-------------|
| 1     | 12×12     | Challenging   | 15%          | Still fairly difficult, good start |
| 2     | 13×13     | Challenging   | 12%          | Slightly harder |
| 3     | 14×14     | Hard          | 10%          | Getting difficult |
| 4     | 15×15     | Hard          | 8%           | Genuinely challenging |
| 5     | 16×16     | Very Hard     | 6%           | Very complex paths |
| 6     | 17×17     | Very Hard     | 4%           | Expert navigation needed |
| 7     | 18×18     | Extreme       | 3%           | Extremely challenging |
| 8     | 19×19     | Extreme       | 2%           | Nearly max complexity |
| 9     | 19×19     | Brutal        | 1%           | Almost no shortcuts |
| 10    | 20×20     | Nightmare     | 0%           | Pure maze, maximum challenge |

## Visual Impact

### Before:
- Small mazes felt cramped
- Player/tokens hard to see
- Level 1 too easy for experienced players

### After:
- ✅ Larger, more spacious mazes
- ✅ Player and tokens clearly visible
- ✅ Level 1 provides good challenge while being learnable
- ✅ Maintains strong progression to level 10
- ✅ Level 10 is a massive, complex nightmare maze

## Files Updated

### Both directories (frontend/src and frontend/public/src):
1. **config.js**
   - Increased `PLAYER_SIZE` from 13 to 20

2. **scenes/GameScene.js**
   - Updated `getMazeConfigForLevel()` with new size ranges
   - Reduced wall removal ratios
   - Increased main STX token size to 32px
   - Increased mini STX token size to 24px

## Testing Notes

- Level 1 should now feel challenging but fair
- Progression curve is steeper - each level significantly harder
- Visual elements (player/tokens) should be clearly visible
- Level 10 maze is MUCH larger (20×20 vs old 15×15)
