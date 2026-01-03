// Main export
export { OpenAIClient } from './OpenAIClient';

// Export validators
export { validateGameSpec, isValidGameSpec } from './validators/SpecValidator';

// Export prompt templates
export { SYSTEM_PROMPT, LEGACY_SYSTEM_PROMPT } from './templates/base';
export { PLATFORMER_PROMPT } from './templates/platformer';
export { SHOOTER_PROMPT } from './templates/shooter';
export { PUZZLE_PROMPT } from './templates/puzzle';

// Export schema helpers
export {
  ENTITY_PATTERNS,
  GENRE_DEFAULTS,
  COLOR_PALETTE,
  POSITIONING,
  getSchemaContext,
  getEntityExample,
  getGenreExample,
} from './schemas';
