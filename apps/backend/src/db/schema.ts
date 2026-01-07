/**
 * Database Schema for PromptPlay Backend
 */

export const SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  password_hash TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author_id TEXT NOT NULL,
  game_spec TEXT NOT NULL,
  thumbnail TEXT,
  screenshots TEXT,
  tags TEXT,
  genre TEXT,
  is_public INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  allow_download INTEGER DEFAULT 1,
  allow_embed INTEGER DEFAULT 1,
  plays INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Game likes (many-to-many)
CREATE TABLE IF NOT EXISTS game_likes (
  game_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (game_id, user_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Game ratings
CREATE TABLE IF NOT EXISTS game_ratings (
  game_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (game_id, user_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Game comments
CREATE TABLE IF NOT EXISTS game_comments (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Game reports (moderation)
CREATE TABLE IF NOT EXISTS game_reports (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Marketplace assets
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  author_id TEXT NOT NULL,
  tags TEXT,
  license TEXT DEFAULT 'free',
  preview_url TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Asset ratings
CREATE TABLE IF NOT EXISTS asset_ratings (
  asset_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (asset_id, user_id),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Collaboration sessions
CREATE TABLE IF NOT EXISTS collab_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Collaboration participants
CREATE TABLE IF NOT EXISTS collab_participants (
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'editor',
  joined_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (session_id, user_id),
  FOREIGN KEY (session_id) REFERENCES collab_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_author ON games(author_id);
CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
CREATE INDEX IF NOT EXISTS idx_games_featured ON games(is_featured);
CREATE INDEX IF NOT EXISTS idx_games_public ON games(is_public);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_author ON assets(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_game ON game_comments(game_id);
CREATE INDEX IF NOT EXISTS idx_collab_project ON collab_sessions(project_id);
`;
