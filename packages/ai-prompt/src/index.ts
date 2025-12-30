// Main export
export { OpenAIClient } from './OpenAIClient';

// Export validators
export { validateGameSpec, isValidGameSpec } from './validators/SpecValidator';

// Export prompt templates
export { SYSTEM_PROMPT } from './templates/base';
export { PLATFORMER_PROMPT } from './templates/platformer';
export { SHOOTER_PROMPT } from './templates/shooter';
export { PUZZLE_PROMPT } from './templates/puzzle';
