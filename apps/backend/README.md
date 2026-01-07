# PromptPlay Backend Server

REST API and WebSocket server for the PromptPlay game engine.

## Features

- **Games API** - Publish, share, and discover games
- **Marketplace API** - Browse and download community assets
- **Real-time Collaboration** - WebSocket-based collaborative editing
- **Authentication** - JWT-based auth system

## Quick Start

```bash
# Install dependencies
npm install

# Initialize database with demo data
npm run db:init

# Start development server
npm run dev
```

Server runs at `http://localhost:3001`

## API Endpoints

### Authentication

```
POST /api/auth/login     - Login/register user
GET  /api/auth/me        - Get current user (requires auth)
```

### Games

```
GET    /api/games              - List/search games
GET    /api/games/featured     - Get featured games
GET    /api/games/my           - Get user's games (requires auth)
GET    /api/games/:id          - Get game details
POST   /api/games              - Publish game (requires auth)
PUT    /api/games/:id          - Update game (requires auth)
DELETE /api/games/:id          - Delete game (requires auth)
POST   /api/games/:id/play     - Record game play
POST   /api/games/:id/like     - Like game (requires auth)
POST   /api/games/:id/unlike   - Unlike game (requires auth)
POST   /api/games/:id/rate     - Rate game (requires auth)
GET    /api/games/:id/comments - Get comments
POST   /api/games/:id/comments - Add comment (requires auth)
DELETE /api/games/:id/comments/:commentId - Delete comment (requires auth)
POST   /api/games/:id/report   - Report game (requires auth)
```

### Marketplace Assets

```
GET    /api/assets              - List/search assets
GET    /api/assets/featured     - Get featured assets
GET    /api/assets/tags         - Get popular tags
GET    /api/assets/:id          - Get asset details
POST   /api/assets/:id/download - Download asset
POST   /api/assets              - Upload asset (requires auth)
PUT    /api/assets/:id          - Update asset (requires auth)
DELETE /api/assets/:id          - Delete asset (requires auth)
POST   /api/assets/:id/rate     - Rate asset (requires auth)
```

### Collaboration

WebSocket endpoint: `ws://localhost:3001/ws?token=JWT_TOKEN`

**Messages:**
- `join` - Join collaboration session
- `leave` - Leave session
- `operation` - Document operation
- `cursor` - Cursor position update
- `selection` - Selection update
- `chat` - Chat message

## Environment Variables

```env
PORT=3001              # Server port
HOST=0.0.0.0          # Server host
CORS_ORIGIN=*         # CORS origins (comma-separated)
JWT_SECRET=secret     # JWT signing secret (change in production!)
```

## Database

SQLite database stored at `data/promptplay.db`

Tables:
- `users` - User accounts
- `games` - Published games
- `game_likes` - Game likes
- `game_ratings` - Game ratings
- `game_comments` - Game comments
- `game_reports` - Moderation reports
- `assets` - Marketplace assets
- `asset_ratings` - Asset ratings
- `collab_sessions` - Collaboration sessions
- `collab_participants` - Session participants

## Docker

```bash
# Build image
docker build -t promptplay-backend .

# Run container
docker run -p 3001:3001 -v ./data:/app/data promptplay-backend
```

## Production Deployment

1. Set secure `JWT_SECRET` environment variable
2. Configure `CORS_ORIGIN` for your frontend domain
3. Use reverse proxy (nginx) for SSL termination
4. Set up database backups for `data/` directory

## License

MIT
