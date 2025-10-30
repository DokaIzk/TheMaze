# StackRunner Game Assets

This directory contains visual and audio assets for the StackRunner game.

## Current Assets

The game currently uses procedurally generated colored shapes for all visual elements:

- **Player**: Green circle (generated via Phaser Graphics)
- **Main STX Token**: Orange circle with white border
- **Mini STX Token**: Blue circle with white border  
- **Walls**: Gray rectangles with subtle borders
- **Paths**: Dark rectangles

## Future Asset Additions

You can replace the generated graphics with custom sprites by:

1. Adding image files to this directory
2. Loading them in `BootScene.js` using `this.load.image()`
3. Updating the texture keys in the game scenes

### Recommended Asset Specifications

- **Player Sprite**: 24x24 pixels, PNG with transparency
- **STX Tokens**: 32x32 pixels (main), 20x20 pixels (mini)
- **Wall Tiles**: 32x32 pixels, tileable
- **UI Elements**: Various sizes, consistent color scheme

### Audio Assets

Future audio enhancements could include:

- Background music (looping, electronic/synthwave style)
- Collection sound effects
- Game over sound
- Level completion sound
- Ambient maze sounds

## Color Scheme

The game uses a neon/cyberpunk color palette:

- **Primary Green**: #00ff88 (player, UI elements)
- **Secondary Blue**: #00ccff (mini tokens, accents)
- **Warning Orange**: #ffaa00 (main STX token)
- **Error Red**: #ff4444 (game over, warnings)
- **Background**: #0f0f0f (dark)
- **Walls**: #333333 (gray)

## Asset Guidelines

When creating custom assets:

1. Maintain the neon/cyberpunk aesthetic
2. Use consistent lighting and shadows
3. Ensure good contrast against dark backgrounds
4. Keep file sizes optimized for web delivery
5. Use PNG format for sprites with transparency
6. Consider retina/high-DPI displays
