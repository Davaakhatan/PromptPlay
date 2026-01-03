import { useState, useEffect, useCallback } from 'react';
import {
  gameSharing,
  type PublishedGame,
  type GameSearchParams,
} from '../services/GameSharingService';

interface CommunityGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayGame?: (game: PublishedGame) => void;
}

// Game card component
function GameCard({
  game,
  onPlay,
  onShare,
}: {
  game: PublishedGame;
  onPlay: () => void;
  onShare: () => void;
}) {
  const genreColors: Record<string, string> = {
    platformer: 'bg-blue-500',
    shooter: 'bg-red-500',
    puzzle: 'bg-purple-500',
    other: 'bg-gray-500',
  };

  return (
    <div className="bg-[#252542] rounded-xl overflow-hidden border border-white/10 hover:border-violet-500/50 transition-all group">
      {/* Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-violet-900/50 to-indigo-900/50 relative overflow-hidden">
        {game.thumbnail ? (
          <img
            src={game.thumbnail}
            alt={game.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {game.author.avatar || '🎮'}
          </div>
        )}

        {/* Featured badge */}
        {game.isFeatured && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500 text-yellow-900 text-[10px] font-bold rounded-full">
            FEATURED
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={onPlay}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-500 transition-colors"
          >
            ▶ Play
          </button>
          <button
            onClick={onShare}
            className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            title="Share"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-white text-sm truncate flex-1">{game.title}</h3>
          <span className={`px-1.5 py-0.5 text-[10px] font-medium text-white rounded ${genreColors[game.genre] || genreColors.other}`}>
            {game.genre}
          </span>
        </div>

        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{game.description}</p>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              {formatNumber(game.plays)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              {formatNumber(game.likes)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-yellow-500">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{game.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Author */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
          <span className="text-lg">{game.author.avatar || '👤'}</span>
          <span className="text-xs text-gray-400">{game.author.name}</span>
        </div>
      </div>
    </div>
  );
}

// Format number with K/M suffix
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function CommunityGallery({ isOpen, onClose, onPlayGame }: CommunityGalleryProps) {
  const [games, setGames] = useState<PublishedGame[]>([]);
  const [featuredGames, setFeaturedGames] = useState<PublishedGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [sortBy, setSortBy] = useState<GameSearchParams['sortBy']>('plays');
  const [shareModal, setShareModal] = useState<PublishedGame | null>(null);

  // Load games
  useEffect(() => {
    if (!isOpen) return;

    const loadGames = async () => {
      setIsLoading(true);
      try {
        const [featured, results] = await Promise.all([
          gameSharing.getFeaturedGames(),
          gameSharing.searchGames({
            query: searchQuery || undefined,
            genre: selectedGenre || undefined,
            sortBy,
          }),
        ]);
        setFeaturedGames(featured);
        setGames(results.games);
      } finally {
        setIsLoading(false);
      }
    };

    loadGames();
  }, [isOpen, searchQuery, selectedGenre, sortBy]);

  // Handle play
  const handlePlay = useCallback((game: PublishedGame) => {
    if (onPlayGame) {
      onPlayGame(game);
    } else {
      // Open in new tab
      window.open(game.embedUrl, '_blank');
    }
  }, [onPlayGame]);

  // Handle share
  const handleShare = useCallback((game: PublishedGame) => {
    setShareModal(game);
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a2e] rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-white/10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-violet-600/20 to-indigo-600/20">
          <div>
            <h2 className="text-xl font-bold text-white">Community Gallery</h2>
            <p className="text-sm text-gray-400">Discover and play games created by the community</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-white/10 flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full px-4 py-2 pl-10 bg-white/5 border border-white/20 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Genre filter */}
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All Genres</option>
            <option value="platformer">Platformer</option>
            <option value="shooter">Shooter</option>
            <option value="puzzle">Puzzle</option>
            <option value="other">Other</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as GameSearchParams['sortBy'])}
            className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="plays">Most Played</option>
            <option value="likes">Most Liked</option>
            <option value="rating">Top Rated</option>
            <option value="recent">Most Recent</option>
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : (
            <>
              {/* Featured section */}
              {!searchQuery && !selectedGenre && featuredGames.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-yellow-500">⭐</span> Featured Games
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featuredGames.slice(0, 3).map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        onPlay={() => handlePlay(game)}
                        onShare={() => handleShare(game)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All games */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  {searchQuery || selectedGenre ? 'Search Results' : 'All Games'}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({games.length} games)
                  </span>
                </h3>
                {games.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-4xl mb-4">🎮</p>
                    <p>No games found</p>
                    <p className="text-sm mt-2">Try a different search or filter</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {games.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        onPlay={() => handlePlay(game)}
                        onShare={() => handleShare(game)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#1e1e3a] rounded-xl w-full max-w-md border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white">Share "{shareModal.title}"</h3>
              <button
                onClick={() => setShareModal(null)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Social share buttons */}
              <div className="flex gap-2">
                {['twitter', 'facebook', 'reddit'].map((platform) => {
                  const links = gameSharing.getShareLinks(shareModal);
                  return (
                    <a
                      key={platform}
                      href={links[platform as keyof typeof links]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-white/10 text-white rounded-lg text-sm text-center hover:bg-white/20 transition-colors capitalize"
                    >
                      {platform}
                    </a>
                  );
                })}
              </div>

              {/* Copy link */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Game URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={gameSharing.getShareLinks(shareModal).copy}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-sm text-gray-300"
                  />
                  <button
                    onClick={() => copyToClipboard(gameSharing.getShareLinks(shareModal).copy)}
                    className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-500"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Embed code */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Embed Code</label>
                <div className="flex gap-2">
                  <textarea
                    readOnly
                    value={gameSharing.generateEmbedCode(shareModal.embedUrl, shareModal.title)}
                    rows={3}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-xs text-gray-300 resize-none font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(gameSharing.generateEmbedCode(shareModal.embedUrl, shareModal.title))}
                    className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-500 self-start"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunityGallery;
