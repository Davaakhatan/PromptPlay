import { useState, useEffect, useCallback } from 'react';
import { marketplace, type MarketplaceAsset, type AssetCategory } from '../services/MarketplaceService';
import { useAuth } from '../hooks/useAuth';

interface MarketplaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportAsset?: (asset: MarketplaceAsset, data: string) => void;
}

type Tab = 'browse' | 'my-assets' | 'upload';

const CATEGORIES: { value: AssetCategory | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '🎮' },
  { value: 'prefab', label: 'Prefabs', icon: '📦' },
  { value: 'sprite', label: 'Sprites', icon: '🎨' },
  { value: 'template', label: 'Templates', icon: '📋' },
  { value: 'sound', label: 'Sounds', icon: '🔊' },
  { value: 'script', label: 'Scripts', icon: '📜' },
  { value: 'shader', label: 'Shaders', icon: '✨' },
];

export function MarketplaceDialog({ isOpen, onClose, onImportAsset }: MarketplaceDialogProps) {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [assets, setAssets] = useState<MarketplaceAsset[]>([]);
  const [featuredAssets, setFeaturedAssets] = useState<MarketplaceAsset[]>([]);
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'recent'>('downloads');

  // Upload form state
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState<AssetCategory>('prefab');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await marketplace.searchAssets({
        query: searchQuery || undefined,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        sortBy,
        limit: 50,
      });
      setAssets(result.assets);
    } catch (err) {
      console.error('Error loading assets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedTags, sortBy]);

  const loadFeatured = useCallback(async () => {
    try {
      const featured = await marketplace.getFeaturedAssets();
      setFeaturedAssets(featured);
      const tags = await marketplace.getPopularTags();
      setPopularTags(tags);
    } catch (err) {
      console.error('Error loading featured:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAssets();
      loadFeatured();
    }
  }, [isOpen, loadAssets, loadFeatured]);

  const handleDownload = async (asset: MarketplaceAsset) => {
    try {
      const result = await marketplace.downloadAsset(asset.id);
      if (result.success && result.data && onImportAsset) {
        onImportAsset(asset, result.data);
        onClose();
      }
    } catch (err) {
      console.error('Error downloading asset:', err);
    }
  };

  const handleUpload = async () => {
    if (!uploadName || !uploadDescription || !uploadFile) {
      setUploadError('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result as string;
        const base64 = data.split(',')[1];

        const result = await marketplace.uploadAsset({
          name: uploadName,
          description: uploadDescription,
          category: uploadCategory,
          tags: uploadTags.split(',').map((t) => t.trim()).filter(Boolean),
          license: 'free',
          data: base64,
        });

        if (result.success) {
          setUploadSuccess(true);
          setTimeout(() => {
            setUploadName('');
            setUploadDescription('');
            setUploadTags('');
            setUploadFile(null);
            setUploadSuccess(false);
            setActiveTab('browse');
          }, 2000);
        } else {
          setUploadError(result.error || 'Failed to upload asset');
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(uploadFile);
    } catch (err) {
      setUploadError('Failed to upload asset');
      setIsUploading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-panel border border-subtle rounded-xl shadow-2xl w-[900px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-xl">
              🛒
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Asset Marketplace</h2>
              <p className="text-sm text-text-secondary">Browse and share community assets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-subtle">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'browse'
                ? 'text-white border-b-2 border-orange-500'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Browse
          </button>
          {isAuthenticated && (
            <>
              <button
                onClick={() => setActiveTab('my-assets')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'my-assets'
                    ? 'text-white border-b-2 border-orange-500'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                My Assets
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'text-white border-b-2 border-orange-500'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                Upload
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {activeTab === 'browse' && (
            <>
              {/* Sidebar */}
              <div className="w-48 border-r border-subtle p-3 overflow-y-auto">
                {/* Categories */}
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                          selectedCategory === cat.value
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'text-text-secondary hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Popular Tags */}
                <div>
                  <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
                    Popular Tags
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {popularTags.slice(0, 10).map(({ tag }) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-surface text-text-secondary hover:text-white'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Search & Sort */}
                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-surface border border-subtle rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                    placeholder="Search assets..."
                  />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-[#1a1a2e] border border-subtle rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="downloads" className="bg-[#1a1a2e] text-white">Most Downloaded</option>
                    <option value="rating" className="bg-[#1a1a2e] text-white">Highest Rated</option>
                    <option value="recent" className="bg-[#1a1a2e] text-white">Most Recent</option>
                  </select>
                </div>

                {/* Featured */}
                {!searchQuery && selectedCategory === 'all' && selectedTags.length === 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-white mb-3">Featured</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {featuredAssets.slice(0, 3).map((asset) => (
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          onDownload={() => handleDownload(asset)}
                          featured
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Assets Grid */}
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-text-secondary">Loading assets...</p>
                  </div>
                ) : assets.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-4 text-2xl">
                      📦
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No Assets Found</h3>
                    <p className="text-text-secondary">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {assets.map((asset) => (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
                        onDownload={() => handleDownload(asset)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'upload' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-md mx-auto">
                {uploadSuccess ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">
                      ✅
                    </div>
                    <h3 className="text-lg font-medium text-white">Asset Uploaded!</h3>
                    <p className="text-text-secondary">Your asset is now available in the marketplace</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Upload Asset</h3>

                    {uploadError && (
                      <div className="bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
                        {uploadError}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Name *</label>
                      <input
                        type="text"
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                        placeholder="My Awesome Asset"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Description *</label>
                      <textarea
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 resize-none"
                        rows={3}
                        placeholder="A brief description of your asset..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Category</label>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value as AssetCategory)}
                        className="w-full bg-[#1a1a2e] border border-subtle rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                      >
                        {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                          <option key={cat.value} value={cat.value} className="bg-[#1a1a2e] text-white">
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Tags (comma-separated)</label>
                      <input
                        type="text"
                        value={uploadTags}
                        onChange={(e) => setUploadTags(e.target.value)}
                        className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                        placeholder="platformer, 2d, pixel"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-secondary mb-1">File *</label>
                      <input
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-orange-500 file:text-white file:cursor-pointer"
                      />
                    </div>

                    <button
                      onClick={handleUpload}
                      disabled={isUploading || !uploadName || !uploadDescription || !uploadFile}
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 text-white font-medium rounded-lg transition-colors"
                    >
                      {isUploading ? 'Uploading...' : 'Upload Asset'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  onDownload,
  featured = false,
}: {
  asset: MarketplaceAsset;
  onDownload: () => void;
  featured?: boolean;
}) {
  const categoryIcons: Record<AssetCategory, string> = {
    prefab: '📦',
    sprite: '🎨',
    template: '📋',
    sound: '🔊',
    script: '📜',
    shader: '✨',
  };

  return (
    <div
      className={`bg-surface border border-subtle rounded-lg overflow-hidden hover:border-orange-500/50 transition-colors group ${
        featured ? 'ring-1 ring-orange-500/30' : ''
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-800 relative flex items-center justify-center">
        <span className="text-4xl">{categoryIcons[asset.category]}</span>

        {/* Download overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={onDownload}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>

        {featured && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded">
            Featured
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-white truncate">{asset.name}</h3>
            <p className="text-xs text-text-tertiary">{asset.author.name}</p>
          </div>
          <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded capitalize">
            {asset.category}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {asset.downloads}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {asset.rating.toFixed(1)}
          </span>
          <span
            className={`ml-auto ${asset.license === 'free' || asset.license === 'cc0' ? 'text-green-400' : ''}`}
          >
            {asset.license === 'free' || asset.license === 'cc0' ? 'Free' : asset.license.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default MarketplaceDialog;
