/**
 * Games API Routes
 */

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, timestampToIso, parseJsonField } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

interface GameRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  game_spec: string;
  thumbnail: string | null;
  screenshots: string | null;
  tags: string | null;
  genre: string | null;
  is_public: number;
  is_featured: number;
  allow_download: number;
  allow_embed: number;
  plays: number;
  likes: number;
  rating: number;
  rating_count: number;
  created_at: number;
  updated_at: number;
}

function formatGame(row: GameRow, baseUrl: string) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    author: {
      id: row.author_id,
      name: row.author_name,
      avatar: row.author_avatar,
    },
    thumbnail: row.thumbnail,
    screenshots: parseJsonField<string[]>(row.screenshots, []),
    tags: parseJsonField<string[]>(row.tags, []),
    genre: row.genre,
    stats: {
      plays: row.plays,
      likes: row.likes,
      rating: row.rating,
      ratingCount: row.rating_count,
    },
    isPublic: row.is_public === 1,
    isFeatured: row.is_featured === 1,
    allowDownload: row.allow_download === 1,
    allowEmbed: row.allow_embed === 1,
    embedUrl: `${baseUrl}/embed/${row.slug}`,
    createdAt: timestampToIso(row.created_at),
    updatedAt: timestampToIso(row.updated_at),
  };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// List/search games
router.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const {
    q: query,
    genre,
    tags,
    author,
    featured,
    sort = 'newest',
    page = '1',
    limit = '12',
  } = req.query;

  let sql = `
    SELECT g.*, u.name as author_name, u.avatar as author_avatar
    FROM games g
    JOIN users u ON g.author_id = u.id
    WHERE g.is_public = 1
  `;
  const params: unknown[] = [];

  if (query) {
    sql += ` AND (g.title LIKE ? OR g.description LIKE ?)`;
    params.push(`%${query}%`, `%${query}%`);
  }

  if (genre) {
    sql += ` AND g.genre = ?`;
    params.push(genre);
  }

  if (tags) {
    const tagList = (tags as string).split(',');
    for (const tag of tagList) {
      sql += ` AND g.tags LIKE ?`;
      params.push(`%"${tag}"%`);
    }
  }

  if (author) {
    sql += ` AND u.name LIKE ?`;
    params.push(`%${author}%`);
  }

  if (featured === 'true') {
    sql += ` AND g.is_featured = 1`;
  }

  // Sorting
  switch (sort) {
    case 'popular':
      sql += ` ORDER BY g.plays DESC`;
      break;
    case 'top_rated':
      sql += ` ORDER BY g.rating DESC, g.rating_count DESC`;
      break;
    case 'most_liked':
      sql += ` ORDER BY g.likes DESC`;
      break;
    default:
      sql += ` ORDER BY g.created_at DESC`;
  }

  // Count total
  const countSql = sql.replace(/SELECT g\.\*, u\.name as author_name, u\.avatar as author_avatar/, 'SELECT COUNT(*) as total');
  const countResult = db.prepare(countSql.split('ORDER BY')[0]).get(...params) as { total: number };
  const total = countResult.total;

  // Pagination
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
  const offset = (pageNum - 1) * limitNum;

  sql += ` LIMIT ? OFFSET ?`;
  params.push(limitNum, offset);

  const rows = db.prepare(sql).all(...params) as GameRow[];

  res.json({
    success: true,
    data: {
      games: rows.map(row => formatGame(row, baseUrl)),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// Get featured games
router.get('/featured', (req, res) => {
  const db = getDb();
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const rows = db.prepare(`
    SELECT g.*, u.name as author_name, u.avatar as author_avatar
    FROM games g
    JOIN users u ON g.author_id = u.id
    WHERE g.is_public = 1 AND g.is_featured = 1
    ORDER BY g.plays DESC
    LIMIT 6
  `).all() as GameRow[];

  res.json({
    success: true,
    data: rows.map(row => formatGame(row, baseUrl)),
  });
});

// Get user's games
router.get('/my', requireAuth, (req, res) => {
  const db = getDb();
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const { page = '1', limit = '12' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
  const offset = (pageNum - 1) * limitNum;

  const countResult = db.prepare(`
    SELECT COUNT(*) as total FROM games WHERE author_id = ?
  `).get(req.user!.id) as { total: number };

  const rows = db.prepare(`
    SELECT g.*, u.name as author_name, u.avatar as author_avatar
    FROM games g
    JOIN users u ON g.author_id = u.id
    WHERE g.author_id = ?
    ORDER BY g.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user!.id, limitNum, offset) as GameRow[];

  res.json({
    success: true,
    data: {
      games: rows.map(row => formatGame(row, baseUrl)),
      total: countResult.total,
      page: pageNum,
      totalPages: Math.ceil(countResult.total / limitNum),
    },
  });
});

// Get single game
router.get('/:idOrSlug', optionalAuth, (req, res) => {
  const db = getDb();
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const { idOrSlug } = req.params;

  const row = db.prepare(`
    SELECT g.*, u.name as author_name, u.avatar as author_avatar
    FROM games g
    JOIN users u ON g.author_id = u.id
    WHERE (g.id = ? OR g.slug = ?) AND (g.is_public = 1 OR g.author_id = ?)
  `).get(idOrSlug, idOrSlug, req.user?.id || '') as GameRow | undefined;

  if (!row) {
    res.status(404).json({ success: false, error: 'Game not found' });
    return;
  }

  res.json({
    success: true,
    data: formatGame(row, baseUrl),
  });
});

// Create game
router.post('/', requireAuth, (req, res) => {
  const db = getDb();
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const {
    gameSpec,
    title,
    description,
    tags,
    thumbnail,
    screenshots,
    genre,
    isPublic = true,
    allowDownload = true,
    allowEmbed = true,
  } = req.body;

  if (!title || title.length < 3) {
    res.status(400).json({ success: false, error: 'Title must be at least 3 characters' });
    return;
  }

  if (!description || description.length < 10) {
    res.status(400).json({ success: false, error: 'Description must be at least 10 characters' });
    return;
  }

  const id = uuid();
  let slug = generateSlug(title);

  // Ensure unique slug
  const existing = db.prepare('SELECT id FROM games WHERE slug = ?').get(slug);
  if (existing) {
    slug = `${slug}-${id.slice(0, 8)}`;
  }

  db.prepare(`
    INSERT INTO games (
      id, slug, title, description, author_id, game_spec,
      thumbnail, screenshots, tags, genre,
      is_public, allow_download, allow_embed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    slug,
    title,
    description,
    req.user!.id,
    JSON.stringify(gameSpec || {}),
    thumbnail || null,
    JSON.stringify(screenshots || []),
    JSON.stringify(tags || []),
    genre || null,
    isPublic ? 1 : 0,
    allowDownload ? 1 : 0,
    allowEmbed ? 1 : 0
  );

  const row = db.prepare(`
    SELECT g.*, u.name as author_name, u.avatar as author_avatar
    FROM games g
    JOIN users u ON g.author_id = u.id
    WHERE g.id = ?
  `).get(id) as GameRow;

  const game = formatGame(row, baseUrl);

  res.status(201).json({
    success: true,
    data: {
      game,
      url: `${baseUrl}/games/${slug}`,
      embedCode: `<iframe src="${baseUrl}/embed/${slug}" width="800" height="600"></iframe>`,
    },
  });
});

// Update game
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const { id } = req.params;

  const existing = db.prepare('SELECT author_id FROM games WHERE id = ?').get(id) as { author_id: string } | undefined;

  if (!existing) {
    res.status(404).json({ success: false, error: 'Game not found' });
    return;
  }

  if (existing.author_id !== req.user!.id) {
    res.status(403).json({ success: false, error: 'Not authorized to update this game' });
    return;
  }

  const {
    gameSpec,
    title,
    description,
    tags,
    thumbnail,
    screenshots,
    genre,
    isPublic,
    allowDownload,
    allowEmbed,
  } = req.body;

  const updates: string[] = ['updated_at = unixepoch()'];
  const params: unknown[] = [];

  if (gameSpec !== undefined) {
    updates.push('game_spec = ?');
    params.push(JSON.stringify(gameSpec));
  }
  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (tags !== undefined) {
    updates.push('tags = ?');
    params.push(JSON.stringify(tags));
  }
  if (thumbnail !== undefined) {
    updates.push('thumbnail = ?');
    params.push(thumbnail);
  }
  if (screenshots !== undefined) {
    updates.push('screenshots = ?');
    params.push(JSON.stringify(screenshots));
  }
  if (genre !== undefined) {
    updates.push('genre = ?');
    params.push(genre);
  }
  if (isPublic !== undefined) {
    updates.push('is_public = ?');
    params.push(isPublic ? 1 : 0);
  }
  if (allowDownload !== undefined) {
    updates.push('allow_download = ?');
    params.push(allowDownload ? 1 : 0);
  }
  if (allowEmbed !== undefined) {
    updates.push('allow_embed = ?');
    params.push(allowEmbed ? 1 : 0);
  }

  params.push(id);

  db.prepare(`UPDATE games SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare(`
    SELECT g.*, u.name as author_name, u.avatar as author_avatar
    FROM games g
    JOIN users u ON g.author_id = u.id
    WHERE g.id = ?
  `).get(id) as GameRow;

  res.json({
    success: true,
    data: {
      game: formatGame(row, baseUrl),
      url: `${baseUrl}/games/${row.slug}`,
    },
  });
});

// Delete game
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const existing = db.prepare('SELECT author_id FROM games WHERE id = ?').get(id) as { author_id: string } | undefined;

  if (!existing) {
    res.status(404).json({ success: false, error: 'Game not found' });
    return;
  }

  if (existing.author_id !== req.user!.id) {
    res.status(403).json({ success: false, error: 'Not authorized to delete this game' });
    return;
  }

  db.prepare('DELETE FROM games WHERE id = ?').run(id);

  res.json({ success: true });
});

// Record play
router.post('/:id/play', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const result = db.prepare('UPDATE games SET plays = plays + 1 WHERE id = ?').run(id);

  if (result.changes === 0) {
    res.status(404).json({ success: false, error: 'Game not found' });
    return;
  }

  const row = db.prepare('SELECT plays FROM games WHERE id = ?').get(id) as { plays: number };

  res.json({ success: true, data: { plays: row.plays } });
});

// Like game
router.post('/:id/like', requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;

  try {
    db.prepare('INSERT INTO game_likes (game_id, user_id) VALUES (?, ?)').run(id, req.user!.id);
    db.prepare('UPDATE games SET likes = likes + 1 WHERE id = ?').run(id);
  } catch {
    // Already liked, ignore
  }

  const row = db.prepare('SELECT likes FROM games WHERE id = ?').get(id) as { likes: number };

  res.json({ success: true, data: { likes: row.likes } });
});

// Unlike game
router.post('/:id/unlike', requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const result = db.prepare('DELETE FROM game_likes WHERE game_id = ? AND user_id = ?').run(id, req.user!.id);

  if (result.changes > 0) {
    db.prepare('UPDATE games SET likes = MAX(0, likes - 1) WHERE id = ?').run(id);
  }

  const row = db.prepare('SELECT likes FROM games WHERE id = ?').get(id) as { likes: number };

  res.json({ success: true, data: { likes: row.likes } });
});

// Rate game
router.post('/:id/rate', requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    return;
  }

  // Upsert rating
  db.prepare(`
    INSERT INTO game_ratings (game_id, user_id, rating)
    VALUES (?, ?, ?)
    ON CONFLICT(game_id, user_id) DO UPDATE SET rating = ?
  `).run(id, req.user!.id, rating, rating);

  // Recalculate average
  const stats = db.prepare(`
    SELECT AVG(rating) as avg_rating, COUNT(*) as count
    FROM game_ratings WHERE game_id = ?
  `).get(id) as { avg_rating: number; count: number };

  db.prepare('UPDATE games SET rating = ?, rating_count = ? WHERE id = ?').run(
    Math.round(stats.avg_rating * 10) / 10,
    stats.count,
    id
  );

  res.json({
    success: true,
    data: {
      rating: Math.round(stats.avg_rating * 10) / 10,
      ratingCount: stats.count,
    },
  });
});

// Get comments
router.get('/:id/comments', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
  const offset = (pageNum - 1) * limitNum;

  const countResult = db.prepare('SELECT COUNT(*) as total FROM game_comments WHERE game_id = ?').get(id) as { total: number };

  const rows = db.prepare(`
    SELECT c.*, u.name as author_name, u.avatar as author_avatar
    FROM game_comments c
    JOIN users u ON c.author_id = u.id
    WHERE c.game_id = ?
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(id, limitNum, offset) as Array<{
    id: string;
    content: string;
    author_id: string;
    author_name: string;
    author_avatar: string | null;
    likes: number;
    created_at: number;
  }>;

  res.json({
    success: true,
    data: {
      comments: rows.map(row => ({
        id: row.id,
        author: {
          id: row.author_id,
          name: row.author_name,
          avatar: row.author_avatar,
        },
        content: row.content,
        likes: row.likes,
        createdAt: timestampToIso(row.created_at),
      })),
      total: countResult.total,
    },
  });
});

// Add comment
router.post('/:id/comments', requireAuth, (req, res) => {
  const db = getDb();
  const { id: gameId } = req.params;
  const { content } = req.body;

  if (!content || content.length < 2) {
    res.status(400).json({ success: false, error: 'Comment is too short' });
    return;
  }

  const id = uuid();

  db.prepare(`
    INSERT INTO game_comments (id, game_id, author_id, content)
    VALUES (?, ?, ?, ?)
  `).run(id, gameId, req.user!.id, content);

  res.status(201).json({
    success: true,
    data: {
      id,
      author: {
        id: req.user!.id,
        name: req.user!.name,
        avatar: req.user!.avatar,
      },
      content,
      likes: 0,
      createdAt: new Date().toISOString(),
      isAuthor: true,
    },
  });
});

// Delete comment
router.delete('/:gameId/comments/:commentId', requireAuth, (req, res) => {
  const db = getDb();
  const { commentId } = req.params;

  const comment = db.prepare('SELECT author_id FROM game_comments WHERE id = ?').get(commentId) as { author_id: string } | undefined;

  if (!comment) {
    res.status(404).json({ success: false, error: 'Comment not found' });
    return;
  }

  if (comment.author_id !== req.user!.id) {
    res.status(403).json({ success: false, error: 'Not authorized to delete this comment' });
    return;
  }

  db.prepare('DELETE FROM game_comments WHERE id = ?').run(commentId);

  res.json({ success: true });
});

// Report game
router.post('/:id/report', requireAuth, (req, res) => {
  const db = getDb();
  const { id: gameId } = req.params;
  const { reason } = req.body;

  if (!reason || reason.length < 10) {
    res.status(400).json({ success: false, error: 'Please provide a detailed reason' });
    return;
  }

  const id = uuid();

  db.prepare(`
    INSERT INTO game_reports (id, game_id, reporter_id, reason)
    VALUES (?, ?, ?, ?)
  `).run(id, gameId, req.user!.id, reason);

  res.json({ success: true });
});

export default router;
