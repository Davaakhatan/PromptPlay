export const RPG_PROMPT = `
For RPG (Role-Playing Game) games, include:
- Player entity with input, collider, sprite, transform, velocity, and stats
- NPC entities for dialogue and quests
- Enemy entities with AIBehavior (wander, chase, attack types)
- Interactable objects (chests, doors, signs)
- Inventory items (potions, weapons, armor)
- Environmental elements (trees, rocks, buildings)

Player Stats Component:
- health: 100 (current health points)
- maxHealth: 100 (maximum health)
- mana: 50 (magic points)
- maxMana: 50 (maximum mana)
- level: 1 (character level)
- experience: 0 (current XP)
- strength: 10 (physical damage modifier)
- defense: 5 (damage reduction)

Example entities:
- Player: center of map (x: 400, y: 300), input enabled, stats component
- NPC_Merchant: near town center, dialogue component, shop inventory
- NPC_QuestGiver: quest hub area, dialogue + quest component
- Enemy_Slime: various spawn points, low HP, simple AI (wander + chase)
- Enemy_Goblin: forest areas, medium HP, more aggressive AI
- Chest_Common: scattered locations, loot table reference
- Door: between areas, requires key or condition
- Tree: decoration, no collision or with collision for boundaries
- Building: town areas, collision boundaries

Color suggestions:
- Player: blue "#3b82f6ff"
- NPCs: green "#22c55eff"
- Enemies: red "#ef4444ff"
- Items/Chests: yellow "#eab308ff"
- Environment: brown "#92400eff" or green "#16a34aff"

Movement:
- 8-directional movement for top-down RPG
- Move speed: 3-5 for exploration
- Sprint speed: 6-8 when holding shift

Combat:
- Attack range: 30-50 pixels for melee
- Attack cooldown: 0.5-1 second
- Knockback on hit
`;
