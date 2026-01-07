/**
 * PromptPlay Backend Server
 * REST API + WebSocket for collaboration
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDb, closeDb } from './db/index.js';
import { setupAuthRoutes } from './middleware/auth.js';
import gamesRouter from './routes/games.js';
import assetsRouter from './routes/assets.js';
import { CollaborationService } from './services/collaboration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Initialize Express
const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'PromptPlay API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      games: '/api/games/*',
      assets: '/api/assets/*',
      collaboration: 'ws://host/ws',
    },
  });
});

// Initialize database
console.log('[Server] Initializing database...');
initDb();

// Setup routes
setupAuthRoutes(app);
app.use('/api/games', gamesRouter);
app.use('/api/assets', assetsRouter);

// WebSocket server for collaboration
const wss = new WebSocketServer({ server, path: '/ws' });
const collaborationService = new CollaborationService(wss);

// Collaboration stats endpoint
app.get('/api/collab/stats', (req, res) => {
  res.json({
    success: true,
    data: collaborationService.getStats(),
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║       PromptPlay Backend Server               ║
╠═══════════════════════════════════════════════╣
║  REST API:  http://${HOST}:${PORT}/api             ║
║  WebSocket: ws://${HOST}:${PORT}/ws                ║
║  Health:    http://${HOST}:${PORT}/health          ║
╚═══════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  closeDb();
  server.close(() => {
    console.log('[Server] Goodbye!');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n[Server] Received SIGTERM');
  closeDb();
  server.close(() => {
    process.exit(0);
  });
});

export { app, server, collaborationService };
