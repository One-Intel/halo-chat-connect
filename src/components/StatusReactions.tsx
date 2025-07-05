
import React, { useState } from 'react';
import { Heart, ThumbsUp, Smile, Angry, CircleX, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReactToStatus } from '@/services/statusService';
import { toast } from '@/hooks/use-toast';

interface StatusReactionsProps {
  statusId: string;
  reactions: Record<string, string[]>; // emoji -> user_ids
  currentUserId: string;
  className?: string;
}

const REACTION_EMOJIS = [
  { emoji: '❤️', icon: Heart, name: 'love' },
  { emoji: '👍', icon: ThumbsUp, name: 'like' },
  { emoji: '😂', icon: Smile, name: 'laugh' },
  { emoji: '😮', icon: MessageSquare, name: 'wow' },
  { emoji: '😢', icon: CircleX, name: 'sad' },
  { emoji: '😡', icon: Angry, name: 'angry' },
];

const StatusReactions: React.FC<StatusReactionsProps> = ({
  statusId,
  reactions,
  currentUserId,
  className = ''
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [optimisticReactions, setOptimisticReactions] = useState(reactions);
  const reactMutation = useReactToStatus();

  const handleReaction = async (emoji: string) => {
    try {
      setIsReacting(true);
      
      // Optimistic update
      const newReactions = { ...optimisticReactions };
      const userReaction = getUserReaction();
      
      if (userReaction === emoji) {
        // Remove reaction
        if (newReactions[emoji]) {
          newReactions[emoji] = newReactions[emoji].filter(id => id !== currentUserId);
          if (newReactions[emoji].length === 0) {
            delete newReactions[emoji];
          }
        }
      } else {
        // Add new reaction (remove old one if exists)
        if (userReaction && newReactions[userReaction]) {
          newReactions[userReaction] = newReactions[userReaction].filter(id => id !== currentUserId);
          if (newReactions[userReaction].length === 0) {
            delete newReactions[userReaction];
          }
        }
        
        if (!newReactions[emoji]) {
          newReactions[emoji] = [];
        }
        newReactions[emoji].push(currentUserId);
      }
      
      setOptimisticReactions(newReactions);
      setShowPicker(false);
      
      await reactMutation.mutateAsync({ statusId, emoji });
      
      // Visual feedback
      toast({
        title: 'Reaction added!',
        description: `You reacted with ${emoji}`,
        duration: 2000,
      });
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticReactions(reactions);
      console.error('Reaction error:', error);
      toast({
        title: 'Error',
        description: 'Failed to add reaction',
        variant: 'destructive',
      });
    } finally {
      setIsReacting(false);
    }
  };

  const getUserReaction = () => {
    for (const [emoji, userIds] of Object.entries(optimisticReactions)) {
      if (userIds.includes(currentUserId)) {
        return emoji;
      }
    }
    return null;
  };

  const getTotalReactions = () => {
    return Object.values(optimisticReactions).reduce((total, userIds) => total + userIds.length, 0);
  };

  const userReaction = getUserReaction();
  const totalReactions = getTotalReactions();
  const hasUserReacted = !!userReaction;

  return (
    <div className={`relative ${className}`}>
      {/* Reaction Button with visual feedback */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPicker(!showPicker)}
        disabled={isReacting}
        className={`text-white hover:bg-white/20 flex items-center gap-2 transition-all duration-200 ${
          hasUserReacted ? 'bg-blue-500/30 scale-105 ring-2 ring-blue-400/50' : ''
        } ${isReacting ? 'animate-pulse' : ''}`}
      >
        {userReaction ? (
          <span className="text-lg animate-bounce">{userReaction}</span>
        ) : (
          <Heart className={`h-4 w-4 transition-colors duration-200 ${
            isReacting ? 'text-blue-400' : 'text-white'
          }`} />
        )}
        {totalReactions > 0 && (
          <span className={`transition-all duration-200 font-semibold ${
            hasUserReacted ? 'text-blue-200 scale-110' : 'text-white'
          }`}>
            {totalReactions}
          </span>
        )}
      </Button>

      {/* Reaction Picker with animation */}
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border p-3 flex gap-2 z-50 animate-scale-in">
          {REACTION_EMOJIS.map(({ emoji, name }) => {
            const isSelected = userReaction === emoji;
            return (
              <Button
                key={name}
                variant="ghost"
                size="sm"
                onClick={() => handleReaction(emoji)}
                disabled={isReacting}
                className={`h-10 w-10 p-0 text-lg hover:scale-125 transition-all duration-200 rounded-full ${
                  isSelected ? 'bg-blue-100 scale-125 ring-2 ring-blue-400' : 'hover:bg-gray-50'
                }`}
              >
                {emoji}
              </Button>
            );
          })}
        </div>
      )}

      {/* Reaction Display with improved styling */}
      {totalReactions > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(optimisticReactions).map(([emoji, userIds]) => (
            userIds.length > 0 && (
              <div
                key={emoji}
                className={`bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm text-white flex items-center gap-1 transition-all duration-300 border ${
                  userIds.includes(currentUserId) 
                    ? 'ring-2 ring-blue-300 bg-blue-500/40 border-blue-300 scale-105' 
                    : 'border-white/30 hover:bg-white/30'
                }`}
              >
                <span className="text-base">{emoji}</span>
                <span className="font-semibold text-xs">{userIds.length}</span>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusReactions;
