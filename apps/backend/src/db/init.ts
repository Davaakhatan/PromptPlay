/**
 * Database Initialization Script
 * Run with: npm run db:init
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getDb } from './index.js';
import { v4 as uuid } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure directories exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('[Init] Created data directory');
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('[Init] Created uploads directory');
}

// Initialize database
initDb();

// Seed demo data
const db = getDb();

// Check if we need to seed
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

if (userCount.count === 0) {
  console.log('[Init] Seeding demo data...');

  // Create demo user
  const demoUserId = uuid();
  db.prepare(`
    INSERT INTO users (id, email, name, avatar, password_hash)
    VALUES (?, ?, ?, ?, ?)
  `).run(demoUserId, 'demo@promptplay.dev', 'Demo User', 'DU', 'demo_hash');

  // Create demo games
  const games = [
    {
      id: uuid(),
      slug: 'coin-rush',
      title: 'Coin Rush',
      description: 'Collect coins and avoid obstacles in this fast-paced platformer!',
      genre: 'platformer',
      tags: JSON.stringify(['arcade', 'casual', 'coins']),
      is_featured: 1,
    },
    {
      id: uuid(),
      slug: 'space-defender',
      title: 'Space Defender',
      description: 'Defend Earth from waves of alien invaders!',
      genre: 'shooter',
      tags: JSON.stringify(['action', 'space', 'shooter']),
      is_featured: 1,
    },
    {
      id: uuid(),
      slug: 'puzzle-quest',
      title: 'Puzzle Quest',
      description: 'Solve mind-bending puzzles in this relaxing adventure.',
      genre: 'puzzle',
      tags: JSON.stringify(['puzzle', 'casual', 'relaxing']),
      is_featured: 0,
    },
  ];

  const insertGame = db.prepare(`
    INSERT INTO games (id, slug, title, description, author_id, game_spec, genre, tags, is_featured, plays, likes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const game of games) {
    insertGame.run(
      game.id,
      game.slug,
      game.title,
      game.description,
      demoUserId,
      JSON.stringify({ name: game.title, entities: [] }),
      game.genre,
      game.tags,
      game.is_featured,
      Math.floor(Math.random() * 1000),
      Math.floor(Math.random() * 100)
    );
  }

  // Create demo assets
  const assets = [
    {
      id: uuid(),
      name: 'Pixel Hero Sprite Pack',
      description: 'A collection of pixel art hero sprites with animations.',
      category: 'sprite',
      tags: JSON.stringify(['pixel', 'hero', 'character', 'animation']),
      license: 'free',
    },
    {
      id: uuid(),
      name: 'Platformer Tileset',
      description: 'Complete tileset for platformer games with ground, platforms, and decorations.',
      category: 'sprite',
      tags: JSON.stringify(['tileset', 'platformer', 'pixel']),
      license: 'free',
    },
    {
      id: uuid(),
      name: 'Enemy AI Prefab',
      description: 'Pre-built enemy AI with patrol and chase behaviors.',
      category: 'prefab',
      tags: JSON.stringify(['enemy', 'ai', 'patrol']),
      license: 'free',
    },
  ];

  const insertAsset = db.prepare(`
    INSERT INTO assets (id, name, description, category, author_id, tags, license, file_path, downloads)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const asset of assets) {
    insertAsset.run(
      asset.id,
      asset.name,
      asset.description,
      asset.category,
      demoUserId,
      asset.tags,
      asset.license,
      `/uploads/${asset.id}.json`,
      Math.floor(Math.random() * 500)
    );
  }

  console.log('[Init] Demo data seeded successfully');
}

console.log('[Init] Database ready!');
