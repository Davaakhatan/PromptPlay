/**
 * Marketplace Assets API Routes
 */

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, timestampToIso, parseJsonField } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

interface AssetRow {
  id: string;
  name: string;
  description: string;
  category: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  tags: string | null;
  license: string;
  preview_url: string | null;
  file_path: string;
  file_size: number;
  downloads: number;
  rating: number;
  rating_count: number;
  created_at: number;
  updated_at: number;
}

function formatAsset(row: AssetRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    author: {
      id: row.author_id,
      name: row.author_name,
      avatar: row.author_avatar,
    },
    tags: parseJsonField<string[]>(row.tags, []),
    license: row.license,
    previewUrl: row.preview_url,
    size: row.file_size,
    downloads: row.downloads,
    rating: row.rating,
    ratingCount: row.rating_count,
    createdAt: timestampToIso(row.created_at),
    updatedAt: timestampToIso(row.updated_at),
  };
}

// Search assets
router.get('/', optionalAuth, (req, res) => {
  const db = getDb();

  const {
    q: query,
    category,
    tags,
    author,
    license,
    minRating,
    sortBy = 'newest',
    sortOrder = 'desc',
    page = '1',
    limit = '12',
  } = req.query;

  let sql = `
    SELECT a.*, u.name as author_name, u.avatar as author_avatar
    FROM assets a
    JOIN users u ON a.author_id = u.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (query) {
    sql += ` AND (a.name LIKE ? OR a.description LIKE ?)`;
    params.push(`%${query}%`, `%${query}%`);
  }

  if (category) {
    sql += ` AND a.category = ?`;
    params.push(category);
  }

  if (tags) {
    const tagList = (tags as string).split(',');
    for (const tag of tagList) {
      sql += ` AND a.tags LIKE ?`;
      params.push(`%"${tag.trim()}"%`);
    }
  }

  if (author) {
    sql += ` AND u.name LIKE ?`;
    params.push(`%${author}%`);
  }

  if (license) {
    sql += ` AND a.license = ?`;
    params.push(license);
  }

  if (minRating) {
    sql += ` AND a.rating >= ?`;
    params.push(parseFloat(minRating as string));
  }

  // Sorting
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
  switch (sortBy) {
    case 'downloads':
      sql += ` ORDER BY a.downloads ${order}`;
      break;
    case 'rating':
      sql += ` ORDER BY a.rating ${order}, a.rating_count DESC`;
      break;
    case 'name':
      sql += ` ORDER BY a.name ${order}`;
      break;
    default:
      sql += ` ORDER BY a.created_at ${order}`;
  }

  // Count total
  const countSql = sql.replace(/SELECT a\.\*, u\.name as author_name, u\.avatar as author_avatar/, 'SELECT COUNT(*) as total');
  const countResult = db.prepare(countSql.split('ORDER BY')[0]).get(...params) as { total: number };
  const total = countResult.total;

  // Pagination
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
  const offset = (pageNum - 1) * limitNum;

  sql += ` LIMIT ? OFFSET ?`;
  params.push(limitNum, offset);

  const rows = db.prepare(sql).all(...params) as AssetRow[];

  res.json({
    assets: rows.map(formatAsset),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// Get featured assets
router.get('/featured', (req, res) => {
  const db = getDb();

  const rows = db.prepare(`
    SELECT a.*, u.name as author_name, u.avatar as author_avatar
    FROM assets a
    JOIN users u ON a.author_id = u.id
    ORDER BY a.downloads DESC
    LIMIT 6
  `).all() as AssetRow[];

  res.json(rows.map(formatAsset));
});

// Get popular tags
router.get('/tags', (req, res) => {
  const db = getDb();

  const rows = db.prepare('SELECT tags FROM assets').all() as Array<{ tags: string | null }>;

  const tagCounts = new Map<string, number>();
  for (const row of rows) {
    const tags = parseJsonField<string[]>(row.tags, []);
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const result = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  res.json(result);
});

// Get single asset
router.get('/:id', optionalAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const row = db.prepare(`
    SELECT a.*, u.name as author_name, u.avatar as author_avatar
    FROM assets a
    JOIN users u ON a.author_id = u.id
    WHERE a.id = ?
  `).get(id) as AssetRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  res.json(formatAsset(row));
});

// Download asset
router.post('/:id/download', optionalAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const row = db.prepare(`
    SELECT a.*, u.name as author_name, u.avatar as author_avatar
    FROM assets a
    JOIN users u ON a.author_id = u.id
    WHERE a.id = ?
  `).get(id) as AssetRow | undefined;

  if (!row) {
    res.status(404).json({ success: false, error: 'Asset not found' });
    return;
  }

  // Increment download count
  db.prepare('UPDATE assets SET downloads = downloads + 1 WHERE id = ?').run(id);

  res.json({
    success: true,
    asset: formatAsset(row),
    data: Buffer.from(JSON.stringify({ assetId: id, placeholder: true })).toString('base64'),
  });
});

// Upload asset
router.post('/', requireAuth, (req, res) => {
  const db = getDb();

  const {
    name,
    description,
    category,
    tags,
    license = 'free',
    data,
    thumbnail,
  } = req.body;

  if (!name || name.length < 3) {
    res.status(400).json({ success: false, error: 'Name must be at least 3 characters' });
    return;
  }

  if (!description || description.length < 10) {
    res.status(400).json({ success: false, error: 'Description must be at least 10 characters' });
    return;
  }

  if (!category) {
    res.status(400).json({ success: false, error: 'Category is required' });
    return;
  }

  const id = uuid();
  const filePath = `/uploads/assets/${id}.json`;
  const fileSize = data ? Buffer.byteLength(data, 'base64') : 0;

  db.prepare(`
    INSERT INTO assets (
      id, name, description, category, author_id,
      tags, license, preview_url, file_path, file_size
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    description,
    category,
    req.user!.id,
    JSON.stringify(tags || []),
    license,
    thumbnail || null,
    filePath,
    fileSize
  );

  res.status(201).json({ success: true, assetId: id });
});

// Update asset
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const existing = db.prepare('SELECT author_id FROM assets WHERE id = ?').get(id) as { author_id: string } | undefined;

  if (!existing) {
    res.status(404).json({ success: false, error: 'Asset not found' });
    return;
  }

  if (existing.author_id !== req.user!.id) {
    res.status(403).json({ success: false, error: 'Not authorized to update this asset' });
    return;
  }

  const { name, description, tags, license } = req.body;

  const updates: string[] = ['updated_at = unixepoch()'];
  const params: unknown[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (tags !== undefined) {
    updates.push('tags = ?');
    params.push(JSON.stringify(tags));
  }
  if (license !== undefined) {
    updates.push('license = ?');
    params.push(license);
  }

  params.push(id);

  db.prepare(`UPDATE assets SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json({ success: true });
});

// Delete asset
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const existing = db.prepare('SELECT author_id FROM assets WHERE id = ?').get(id) as { author_id: string } | undefined;

  if (!existing) {
    res.status(404).json({ success: false, error: 'Asset not found' });
    return;
  }

  if (existing.author_id !== req.user!.id) {
    res.status(403).json({ success: false, error: 'Not authorized to delete this asset' });
    return;
  }

  db.prepare('DELETE FROM assets WHERE id = ?').run(id);

  res.json({ success: true });
});

// Rate asset
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
    INSERT INTO asset_ratings (asset_id, user_id, rating)
    VALUES (?, ?, ?)
    ON CONFLICT(asset_id, user_id) DO UPDATE SET rating = ?
  `).run(id, req.user!.id, rating, rating);

  // Recalculate average
  const stats = db.prepare(`
    SELECT AVG(rating) as avg_rating, COUNT(*) as count
    FROM asset_ratings WHERE asset_id = ?
  `).get(id) as { avg_rating: number; count: number };

  db.prepare('UPDATE assets SET rating = ?, rating_count = ? WHERE id = ?').run(
    Math.round(stats.avg_rating * 10) / 10,
    stats.count,
    id
  );

  res.json({ success: true });
});

export default router;
