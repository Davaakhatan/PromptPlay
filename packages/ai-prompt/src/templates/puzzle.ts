export const PUZZLE_PROMPT = `
For puzzle games (like Sokoban), include:
- Player entity with grid-based positioning (multiples of grid size, e.g., 64px)
- Movable block/box entities (can be pushed by player)
- Goal/target positions with sensor colliders
- Wall entities forming the puzzle grid
- Gravity should be { "x": 0, "y": 0 } for puzzle games
- Move speed can be higher (10-15) for snappy grid movement

Example entities:
- Player: starting position on grid (e.g., x: 128, y: 128)
- Boxes: grid-aligned positions, need to be pushed onto targets
- Walls: boundary and obstacles, grid-aligned, use "static" tag
- Targets: goal positions, grid-aligned, different color to show where boxes should go

Grid alignment:
- Use multiples of 64 for x and y positions
- Typical grid: 64x64 pixels per cell
- Playable area: 10x8 grid (640x512)

Color suggestions:
- Player: blue "#3498dbff"
- Boxes: brown "#8b4513ff"
- Walls: black "#2c3e50ff"
- Targets: green "#27ae60ff"
`;
