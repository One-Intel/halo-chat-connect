
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Heart, MoreVertical, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStatusComments, useCreateComment, useReactToComment } from '@/services/statusCommentsService';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from './Avatar';
import { StatusComment } from '@/types/status';

interface StatusCommentsProps {
  statusId: string;
  className?: string;
}

const StatusComments: React.FC<StatusCommentsProps> = ({ statusId, className = '' }) => {
  const { user } = useAuth();
  const { data: comments, isLoading } = useStatusComments(statusId);
  const createComment = useCreateComment();
  const reactToComment = useReactToComment();
  
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showReplies, setShowReplies] = useState<Set<string>>(new Set());

  const handleSubmitComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      await createComment.mutateAsync({
        statusId,
        content: newComment,
        replyToCommentId: parentId
      });
      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      await reactToComment.mutateAsync({ commentId, emoji });
    } catch (error) {
      console.error('Failed to react to comment:', error);
    }
  };

  const toggleReplies = (commentId: string) => {
    const newShowReplies = new Set(showReplies);
    if (newShowReplies.has(commentId)) {
      newShowReplies.delete(commentId);
    } else {
      newShowReplies.add(commentId);
    }
    setShowReplies(newShowReplies);
  };

  const renderComment = (comment: StatusComment, isReply = false) => (
    <div key={comment.id} className={`flex gap-3 ${isReply ? 'ml-12 mt-3' : 'mb-4'}`}>
      <Avatar 
        src={comment.user?.avatar_url} 
        alt={comment.user?.username || 'User'} 
        size="sm"
      />
      
      <div className="flex-1">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm">
              {comment.user?.username || 'Anonymous'}
            </span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm">{comment.content}</p>
        </div>
        
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => handleReaction(comment.id, '❤️')}
          >
            <Heart className="h-3 w-3 mr-1" />
            Like
          </Button>
          
          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setReplyTo(comment.id)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}
          
          {comment.replies && comment.replies.length > 0 && !isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => toggleReplies(comment.id)}
            >
              {showReplies.has(comment.id) ? 'Hide' : 'Show'} {comment.replies.length} replies
            </Button>
          )}
        </div>
        
        {/* Reply form */}
        {replyTo === comment.id && (
          <form onSubmit={(e) => handleSubmitComment(e, comment.id)} className="mt-3">
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1"
              />
              <Button 
                type="submit" 
                size="sm"
                disabled={!newComment.trim() || createComment.isPending}
              >
                Reply
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
        
        {/* Replies */}
        {comment.replies && showReplies.has(comment.id) && (
          <div className="mt-3">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="text-center py-4">Loading comments...</div>;
  }

  return (
    <div className={className}>
      {/* Comments list */}
      <div className="space-y-4 mb-4">
        {comments?.map(comment => renderComment(comment))}
        {(!comments || comments.length === 0) && (
          <p className="text-center text-gray-500 py-4">No comments yet</p>
        )}
      </div>
      
      {/* Add comment form */}
      {user && (
        <form onSubmit={handleSubmitComment} className="flex gap-2">
          <Avatar 
            src={user.user_metadata?.avatar_url} 
            alt="You" 
            size="sm"
          />
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="sm"
            disabled={!newComment.trim() || createComment.isPending}
          >
            Post
          </Button>
        </form>
      )}
    </div>
  );
};

export default StatusComments;
