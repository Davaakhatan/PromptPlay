import { useState, useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { soundManager, SoundAsset } from '../services/SoundManagerService';
import { PlayIcon, PauseIcon, TrashIcon, VolumeIcon, MusicIcon } from './Icons';

interface SoundLibraryProps {
  projectPath: string | null;
  onSoundSelect?: (soundId: string) => void;
}

// Icons for sound types
function SFXIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6l-4 4H4v4h4l4 4V6z" />
    </svg>
  );
}

function AmbientIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  );
}

export function SoundLibrary({ projectPath: _projectPath, onSoundSelect }: SoundLibraryProps) {
  const [sounds, setSounds] = useState<SoundAsset[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'sfx' | 'music' | 'ambient'>('all');
  const [volumes, setVolumes] = useState(soundManager.getVolumes());
  const [showVolumePanel, setShowVolumePanel] = useState(false);

  // Load sounds
  useEffect(() => {
    setSounds(soundManager.getSounds());
  }, []);

  // Handle adding new sound
  const handleAddSound = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'webm', 'm4a'] },
        ],
      });

      if (!selected) return;

      const files = Array.isArray(selected) ? selected : [selected];

      for (const file of files) {
        // Determine type based on filename hints
        const name = file.split('/').pop() || 'Untitled';
        let type: SoundAsset['type'] = 'sfx';
        const lowerName = name.toLowerCase();

        if (lowerName.includes('music') || lowerName.includes('bgm') || lowerName.includes('theme')) {
          type = 'music';
        } else if (lowerName.includes('ambient') || lowerName.includes('loop') || lowerName.includes('atmosphere')) {
          type = 'ambient';
        }

        await soundManager.loadSound(file, name, type);
      }

      setSounds(soundManager.getSounds());
    } catch (err) {
      console.error('Failed to add sound:', err);
    }
  }, []);

  // Play/stop sound preview
  const togglePlay = useCallback((sound: SoundAsset) => {
    if (playingId === sound.id) {
      soundManager.stopAll();
      setPlayingId(null);
    } else {
      soundManager.stopAll();
      if (sound.type === 'music') {
        soundManager.playMusic(sound.id);
      } else if (sound.type === 'ambient') {
        soundManager.playAmbient(sound.id);
      } else {
        soundManager.playSFX(sound.id);
      }
      setPlayingId(sound.id);
    }
  }, [playingId]);

  // Remove sound
  const handleRemove = useCallback((soundId: string) => {
    soundManager.removeSound(soundId);
    setSounds(soundManager.getSounds());
    if (playingId === soundId) {
      setPlayingId(null);
    }
  }, [playingId]);

  // Change sound type
  const handleTypeChange = useCallback((soundId: string, newType: SoundAsset['type']) => {
    const sound = sounds.find(s => s.id === soundId);
    if (!sound) return;

    soundManager.removeSound(soundId);
    soundManager.registerSound({ ...sound, type: newType, loop: newType !== 'sfx' });
    setSounds(soundManager.getSounds());
  }, [sounds]);

  // Update volume
  const handleVolumeChange = useCallback((type: 'master' | 'sfx' | 'music' | 'ambient', value: number) => {
    switch (type) {
      case 'master':
        soundManager.setMasterVolume(value);
        break;
      case 'sfx':
        soundManager.setSFXVolume(value);
        break;
      case 'music':
        soundManager.setMusicVolume(value);
        break;
      case 'ambient':
        soundManager.setAmbientVolume(value);
        break;
    }
    setVolumes(soundManager.getVolumes());
  }, []);

  // Filter sounds
  const filteredSounds = sounds.filter(s => filter === 'all' || s.type === filter);

  // Format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get icon for sound type
  const getTypeIcon = (type: SoundAsset['type']) => {
    switch (type) {
      case 'music':
        return <MusicIcon size={12} className="text-purple-400" />;
      case 'ambient':
        return <AmbientIcon size={12} className="text-cyan-400" />;
      default:
        return <SFXIcon size={12} className="text-green-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-subtle">
        <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
          <VolumeIcon size={14} />
          Sound Library
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowVolumePanel(!showVolumePanel)}
            className={`p-1.5 rounded text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-colors ${
              showVolumePanel ? 'bg-white/10 text-text-primary' : ''
            }`}
            title="Volume Settings"
          >
            <VolumeIcon size={14} />
          </button>
          <button
            onClick={handleAddSound}
            className="p-1.5 rounded text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-colors"
            title="Add Sound"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Volume Panel */}
      {showVolumePanel && (
        <div className="p-3 border-b border-subtle bg-subtle/30 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-16">Master</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volumes.master * 100}
                onChange={(e) => handleVolumeChange('master', parseInt(e.target.value) / 100)}
                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
              <span className="text-xs text-text-tertiary w-8 text-right">{Math.round(volumes.master * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-16">SFX</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volumes.sfx * 100}
                onChange={(e) => handleVolumeChange('sfx', parseInt(e.target.value) / 100)}
                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <span className="text-xs text-text-tertiary w-8 text-right">{Math.round(volumes.sfx * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-16">Music</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volumes.music * 100}
                onChange={(e) => handleVolumeChange('music', parseInt(e.target.value) / 100)}
                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-xs text-text-tertiary w-8 text-right">{Math.round(volumes.music * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-16">Ambient</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volumes.ambient * 100}
                onChange={(e) => handleVolumeChange('ambient', parseInt(e.target.value) / 100)}
                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-xs text-text-tertiary w-8 text-right">{Math.round(volumes.ambient * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 p-2 border-b border-subtle">
        {(['all', 'sfx', 'music', 'ambient'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              filter === type
                ? 'bg-white/10 text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Sound List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <VolumeIcon size={32} className="text-text-tertiary mb-3 opacity-50" />
            <p className="text-sm text-text-secondary">No sounds yet</p>
            <p className="text-xs text-text-tertiary mt-1">
              Click + to add audio files
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredSounds.map((sound) => (
              <div
                key={sound.id}
                className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
                  playingId === sound.id ? 'bg-white/10' : ''
                }`}
                onClick={() => onSoundSelect?.(sound.id)}
              >
                {/* Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay(sound);
                  }}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                    playingId === sound.id
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/5 text-text-tertiary hover:text-text-primary'
                  }`}
                >
                  {playingId === sound.id ? (
                    <PauseIcon size={12} />
                  ) : (
                    <PlayIcon size={12} />
                  )}
                </button>

                {/* Type Icon */}
                <div className="w-5 h-5 flex items-center justify-center">
                  {getTypeIcon(sound.type)}
                </div>

                {/* Name & Duration */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">{sound.name}</p>
                  <p className="text-[10px] text-text-tertiary">
                    {formatDuration(sound.duration)}
                  </p>
                </div>

                {/* Type Selector */}
                <select
                  value={sound.type}
                  onChange={(e) => handleTypeChange(sound.id, e.target.value as SoundAsset['type'])}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] bg-transparent border border-subtle rounded px-1 py-0.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                >
                  <option value="sfx">SFX</option>
                  <option value="music">Music</option>
                  <option value="ambient">Ambient</option>
                </select>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(sound.id);
                  }}
                  className="p-1 text-text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <TrashIcon size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Tips */}
      {sounds.length === 0 && (
        <div className="p-3 border-t border-subtle bg-subtle/20">
          <p className="text-[10px] text-text-tertiary">
            <strong>Tip:</strong> Name files with "music", "ambient", or "sfx" to auto-categorize them.
          </p>
        </div>
      )}
    </div>
  );
}

export default SoundLibrary;
