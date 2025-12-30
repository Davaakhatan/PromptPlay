export const PLATFORMER_PROMPT = `
For platformer games, include:
- Player entity with input, collider, sprite, transform, velocity
- Ground/platform entities with static colliders and "static" tag
- Collectible items (coins, apples, stars, etc.) with circle or box colliders
- Optional enemies with AIBehavior (patrol type)
- Jump force should be negative (e.g., -15 to -20) for upward movement
- Gravity should be positive (e.g., 1) for downward pull
- Move speed typically 5-10 for smooth movement

Example entities:
- Player: position near bottom-left (x: 100, y: 400), input component enabled
- Ground: spans full width at bottom (y: 580), use "static" tag
- Platforms: floating at various heights, different widths, use "static" tag
- Collectibles: scattered throughout level at reachable positions
- Optional enemies: patrol behavior, start on platforms

Color suggestions:
- Player: blue "#4a90e2ff"
- Ground/Platforms: gray "#7f8c8dff"
- Collectibles: yellow "#f1c40fff"
- Enemies: red "#e74c3cff"
`;
