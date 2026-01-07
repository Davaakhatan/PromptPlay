export const RACING_PROMPT = `
For Racing games, include:
- Player vehicle entity with input, collider, sprite, transform, velocity
- AI opponent vehicles with racing AI behavior
- Track boundaries (walls, barriers)
- Checkpoints for lap tracking
- Finish line
- Power-up items (speed boost, shields, weapons)
- Environmental decorations (trees, buildings, crowds)

Vehicle Physics:
- acceleration: 0.5 (how fast the car speeds up)
- maxSpeed: 15 (top speed)
- turnSpeed: 3 (rotation speed in degrees)
- friction: 0.98 (natural slowdown)
- driftFactor: 0.95 (grip level, lower = more drift)
- brakeForce: 0.8 (deceleration when braking)

Example entities:
- PlayerCar: start line position, input enabled, vehicle physics
- AICar_1 to AICar_5: various start positions, racing AI
- Wall_Outer: track outer boundary, static collider
- Wall_Inner: track inner boundary, static collider
- Checkpoint_1 to Checkpoint_N: around track, trigger colliders
- FinishLine: start/finish position, trigger collider
- SpeedBoost: on track, gives temporary speed increase
- Tree, Building, Crowd: outside track, decoration only

Track Design:
- Track width: 150-200 pixels
- Checkpoint spacing: every major turn or straight
- Minimum 4 checkpoints per lap
- Clear racing line visible

Color suggestions:
- Player car: blue "#3b82f6ff"
- AI cars: various colors (red, green, yellow, purple)
- Track surface: gray "#4b5563ff"
- Track boundaries: red/white "#ef4444ff"
- Checkpoints: transparent blue "#3b82f620"
- Finish line: checkered black/white
- Speed boost: cyan "#06b6d4ff"

Controls:
- Up/W: Accelerate
- Down/S: Brake/Reverse
- Left/A: Turn left
- Right/D: Turn right
- Space: Handbrake/Drift
- Shift: Nitro boost (if available)

Camera:
- Follow player car
- Slight look-ahead in direction of movement
- Smooth rotation to match car angle
`;
