import React, { useState } from 'react';
import PropTypes from 'prop-types';

const REACTION_TYPES = {
  LIKE: { emoji: '👍', label: 'Like' },
  LOVE: { emoji: '❤️', label: 'Love' },
  CLAP: { emoji: '👏', label: 'Clap' },
  INSIGHTFUL: { emoji: '💡', label: 'Insightful' },
  HELPFUL: { emoji: '🎯', label: 'Helpful' },
  FIRE: { emoji: '🔥', label: 'Fire' }
};

const ReactionPicker = ({ onReact, currentReaction, reactionCounts, totalReactions, isLoading }) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleReaction = (type) => {
    onReact(type);
    setShowPicker(false);
  };

  const mostUsedReaction = Object.entries(reactionCounts || {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])[0];

  const displayReaction = currentReaction || (mostUsedReaction ? mostUsedReaction[0] : 'LIKE');

  return (
    <div className="relative inline-block">
      {/* Main reaction button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleReaction(currentReaction || 'LIKE')}
          onMouseEnter={() => setShowPicker(true)}
          disabled={isLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            currentReaction
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-500'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className="text-lg">{REACTION_TYPES[displayReaction]?.emoji}</span>
          {totalReactions > 0 && <span>{totalReactions}</span>}
        </button>
      </div>

      {/* Reaction picker dropdown */}
      {showPicker && !isLoading && (
        <div
          onMouseLeave={() => setShowPicker(false)}
          className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 flex gap-1 z-50"
        >
          {Object.entries(REACTION_TYPES).map(([type, { emoji, label }]) => {
            const count = reactionCounts?.[type] || 0;
            const isActive = currentReaction === type;

            return (
              <button
                key={type}
                onClick={() => handleReaction(type)}
                title={`${label}${count > 0 ? ` (${count})` : ''}`}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500' : ''
                }`}
              >
                <span className="text-2xl transform hover:scale-125 transition-transform">{emoji}</span>
                {count > 0 && (
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Reaction breakdown tooltip */}
      {totalReactions > 0 && (
        <div className="mt-2">
          <details className="text-xs text-gray-600 dark:text-gray-400">
            <summary className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-200">
              View reactions
            </summary>
            <div className="mt-2 space-y-1">
              {Object.entries(reactionCounts || {})
                .filter(([, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between gap-2">
                    <span>
                      {REACTION_TYPES[type]?.emoji} {REACTION_TYPES[type]?.label}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

ReactionPicker.propTypes = {
  onReact: PropTypes.func.isRequired,
  currentReaction: PropTypes.string,
  reactionCounts: PropTypes.object,
  totalReactions: PropTypes.number,
  isLoading: PropTypes.bool
};

ReactionPicker.defaultProps = {
  currentReaction: null,
  reactionCounts: {},
  totalReactions: 0,
  isLoading: false
};

export default ReactionPicker;
