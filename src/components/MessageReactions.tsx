
import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageReactionsProps {
  reactions: Array<{
    emoji: string;
    count: number;
    hasReacted: boolean;
  }>;
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  isOwnMessage: boolean;
}

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onAddReaction,
  onRemoveReaction,
  isOwnMessage,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center space-x-1 mt-1">
        {reactions.map(({ emoji, count, hasReacted }) => (
          <button
            key={emoji}
            onClick={() => hasReacted ? onRemoveReaction(emoji) : onAddReaction(emoji)}
            className={cn(
              "px-2 py-1 rounded-full text-xs flex items-center space-x-1 transition-all duration-200",
              hasReacted 
                ? `${isOwnMessage ? 'bg-blue-600/30 text-blue-100 ring-1 ring-blue-400' : 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'} scale-105` 
                : `${isOwnMessage ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'}`
            )}
          >
            <span className="text-sm">{emoji}</span>
            {count > 1 && (
              <span className={cn(
                "font-semibold text-xs",
                hasReacted ? (isOwnMessage ? 'text-blue-200' : 'text-blue-600') : ''
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
        
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={cn(
            "p-1 rounded-full hover:bg-gray-100 transition-all duration-200",
            isOwnMessage ? "text-white hover:bg-white/20" : "text-gray-500",
            showEmojiPicker && "bg-gray-100 scale-110"
          )}
        >
          <Smile className="h-4 w-4" />
        </button>
      </div>

      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 bg-white rounded-xl shadow-xl border p-2 grid grid-cols-6 gap-1 z-50 animate-scale-in">
          {EMOJI_LIST.map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                onAddReaction(emoji);
                setShowEmojiPicker(false);
              }}
              className="p-2 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-125 text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageReactions;
