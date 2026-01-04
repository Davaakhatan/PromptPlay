import { useState, useCallback } from 'react';
import type { GameSpec } from '@promptplay/shared-types';
import { aiPlaytestService, PlaytestResult, PlaytestIssue } from '../services/AIPlaytestService';
import { BrainIcon, PlayIcon, CloseIcon, CheckCircleIcon, AlertTriangleIcon, InfoIcon } from './Icons';

interface AIPlaytestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  gameSpec: GameSpec | null;
}

export default function AIPlaytestPanel({
  isOpen,
  onClose,
  gameSpec,
}: AIPlaytestPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<PlaytestResult | null>(null);

  const handleRunPlaytest = useCallback(async () => {
    if (!gameSpec) return;

    setIsRunning(true);
    setResult(null);

    try {
      const playtestResult = await aiPlaytestService.runPlaytest(gameSpec);
      setResult(playtestResult);
    } catch (error) {
      console.error('Playtest error:', error);
    } finally {
      setIsRunning(false);
    }
  }, [gameSpec]);

  if (!isOpen) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    if (score >= 40) return 'bg-orange-500/20';
    return 'bg-red-500/20';
  };

  const getSeverityIcon = (severity: PlaytestIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return <CloseIcon size={16} className="text-red-400" />;
      case 'warning':
        return <AlertTriangleIcon size={16} className="text-yellow-400" />;
      case 'info':
        return <InfoIcon size={16} className="text-blue-400" />;
    }
  };

  const getSeverityBg = (severity: PlaytestIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <BrainIcon size={24} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">AI Playtest</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <CloseIcon size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!result && !isRunning && (
            <div className="text-center py-12">
              <BrainIcon size={48} className="mx-auto mb-4 text-purple-400/50" />
              <h3 className="text-lg font-medium text-white mb-2">
                AI-Powered Game Analysis
              </h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                The AI will analyze your game structure, simulate gameplay, and
                provide feedback on playability, issues, and suggestions for improvement.
              </p>
              <button
                onClick={handleRunPlaytest}
                disabled={!gameSpec}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                <PlayIcon size={20} />
                Run Playtest
              </button>
            </div>
          )}

          {isRunning && (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Analyzing your game...
              </h3>
              <p className="text-gray-400">
                Simulating gameplay and checking for issues
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Score Card */}
              <div className={`rounded-xl p-6 ${getScoreBgColor(result.score)}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Quality Score</h3>
                  <div className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}
                  </div>
                </div>
                <p className="text-gray-300">{result.summary}</p>
              </div>

              {/* Playability Metrics */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
                  Playability
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Player Movement"
                    value={result.playability.playerCanMove}
                  />
                  <MetricCard
                    label="Player Jumping"
                    value={result.playability.playerCanJump}
                  />
                  <MetricCard
                    label="Collisions"
                    value={result.playability.hasCollisions}
                  />
                  <MetricCard
                    label="Has Goal"
                    value={result.playability.hasGoal}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Difficulty</div>
                    <div className="text-sm font-medium text-white capitalize">
                      {result.playability.difficultyEstimate}
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Est. Playtime</div>
                    <div className="text-sm font-medium text-white">
                      {result.playability.estimatedPlaytime}s
                    </div>
                  </div>
                </div>
              </div>

              {/* Issues */}
              {result.issues.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
                    Issues Found ({result.issues.length})
                  </h3>
                  <div className="space-y-2">
                    {result.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`rounded-lg border p-3 ${getSeverityBg(issue.severity)}`}
                      >
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white">
                              {issue.message}
                            </div>
                            {issue.suggestion && (
                              <div className="text-xs text-gray-400 mt-1">
                                Suggestion: {issue.suggestion}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
                    Suggestions
                  </h3>
                  <ul className="space-y-2">
                    {result.suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-gray-300"
                      >
                        <span className="text-purple-400 mt-1">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Re-run button */}
              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={handleRunPlaytest}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium transition-colors"
                >
                  <PlayIcon size={16} />
                  Run Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-3 flex items-center gap-3">
      {value ? (
        <CheckCircleIcon size={20} className="text-green-400 flex-shrink-0" />
      ) : (
        <CloseIcon size={20} className="text-red-400 flex-shrink-0" />
      )}
      <div className="text-sm text-white">{label}</div>
    </div>
  );
}
