export const SHOOTER_PROMPT = `
For shooter games, include:
- Player entity with input, health, and ability to move in 8 directions
- Enemy entities with AIBehavior (chase type) and health
- Walls/boundaries with static colliders forming the arena
- Gravity should be { "x": 0, "y": 0 } for top-down shooters
- Move speed typically 8-12 for responsive movement

Example entities:
- Player: centered or bottom-center position, health component
- Enemies: chase behavior, spread around map, health component
- Walls: boundary of play area, use "static" tag
- (Note: Bullet spawning will be handled by game logic later)

AI Behavior:
- Chase enemies should have detectionRadius of 200-400
- Speed should be slightly slower than player (e.g., 6-8)

Color suggestions:
- Player: green "#2ecc71ff"
- Enemies: red "#e74c3cff"
- Walls: dark gray "#34495eff"
`;
