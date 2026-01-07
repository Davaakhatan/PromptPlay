/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'promptplay-dev-secret-change-in-production';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Auth middleware - requires authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  const user = verifyToken(token);

  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  req.user = user;
  next();
}

/**
 * Optional auth middleware - attaches user if token present
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}

/**
 * Simple login endpoint (for demo purposes)
 */
export function setupAuthRoutes(app: import('express').Application): void {
  // Demo login - creates or returns existing user
  app.post('/api/auth/login', (req, res) => {
    const { email, name } = req.body;

    if (!email || !name) {
      res.status(400).json({ success: false, error: 'Email and name required' });
      return;
    }

    const db = getDb();

    // Check if user exists
    let user = db.prepare('SELECT id, email, name, avatar FROM users WHERE email = ?').get(email) as AuthUser | undefined;

    if (!user) {
      // Create new user
      const { v4: uuid } = require('uuid');
      const id = uuid();
      const avatar = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

      db.prepare(`
        INSERT INTO users (id, email, name, avatar, password_hash)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, email, name, avatar, 'demo');

      user = { id, email, name, avatar };
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        user,
        token,
      },
    });
  });

  // Get current user
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({
      success: true,
      data: req.user,
    });
  });
}
