
import React from 'react';
import { MessageCircle, Share, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StatusActionsProps {
  statusId: string;
  userId: string;
  currentUserId?: string;
  onComment: () => void;
  onShare: () => void;
  onStartTempChat: () => void;
}

const StatusActions: React.FC<StatusActionsProps> = ({
  statusId,
  userId,
  currentUserId,
  onComment,
  onShare,
  onStartTempChat
}) => {
  const isOwnStatus = currentUserId === userId;

  return (
    <div className="px-4 py-2 flex gap-2 border-t border-gray-100 dark:border-gray-700">
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex-1 text-xs hover:bg-wispa-50 hover:text-wispa-600 transition-colors"
      >
        👍 Like
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex-1 text-xs hover:bg-wispa-50 hover:text-wispa-600 transition-colors"
        onClick={onComment}
      >
        <MessageCircle className="h-4 w-4 mr-1" />
        Comment
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex-1 text-xs hover:bg-wispa-50 hover:text-wispa-600 transition-colors"
        onClick={onShare}
      >
        <Share className="h-4 w-4 mr-1" />
        Share
      </Button>
      {!isOwnStatus && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs hover:bg-wispa-50 hover:text-wispa-600 transition-colors px-2"
          onClick={onStartTempChat}
          title="Start temporary chat"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default StatusActions;
