import React, { useState, useEffect } from "react";
import CreateStatusModal from "./CreateStatusModal";
import NavBar from "@/components/NavBar";
import StatusStoryBar from "./StatusStoryBar";
import StatusComments from "./StatusComments";
import Avatar from "@/components/Avatar";
import { useInfiniteStatusUpdates, useShareStatus } from '@/services/statusService';
import { StatusUpdate } from '@/types/status';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Share, Eye, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const StatusFeed: React.FC = () => {
  const [viewMode, setViewMode] = useState<'friends' | 'public'>('friends');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteStatusUpdates(10, viewMode);

  const shareStatus = useShareStatus();
  const statuses: StatusUpdate[] = data ? data.pages.flat() as StatusUpdate[] : [];

  // Infinite scroll handler
  React.useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 300 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggleComments = (statusId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(statusId)) {
      newExpanded.delete(statusId);
    } else {
      newExpanded.add(statusId);
    }
    setExpandedComments(newExpanded);
  };

  const handleShare = async (statusId: string) => {
    try {
      await shareStatus.mutateAsync({ statusId });
    } catch (error) {
      console.error('Failed to share status:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex justify-between items-center p-4 bg-background shadow-sm sticky top-0 z-10 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">Status</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-full shadow transition-colors"
          >
            Create Status
          </button>
        </div>
      </header>
      
      <div className="flex border-b border-border sticky top-[64px] z-10 bg-background">
        <button
          className={`flex-1 py-3 font-semibold transition-all duration-200 ${
            viewMode === 'friends' 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onClick={() => setViewMode('friends')}
        >
          Friends Posts
        </button>
        <button
          className={`flex-1 py-3 font-semibold transition-all duration-200 ${
            viewMode === 'public' 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onClick={() => setViewMode('public')}
        >
          Public Posts
        </button>
      </div>
      
      <div className="sticky top-[112px] z-10 bg-background px-4 py-2 border-b border-border">
        <StatusStoryBar />
      </div>
      
      <div className="flex-1 overflow-y-auto px-0 pb-4 bg-background">
        <div className="flex flex-col gap-2 px-2 pt-2">
          {statuses.length === 0 && status === 'success' ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-lg py-20">
              No statuses yet.
            </div>
          ) : (
            statuses.map((status, idx) => (
              <div key={status.id || idx} className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-0 overflow-hidden mb-2">
                {/* Status Header */}
                <div className="flex items-start justify-between p-4 pb-2">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar 
                      src={status.user?.avatar_url || undefined} 
                      alt={status.user?.username || 'User'} 
                      size="sm" 
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">
                          {status.user?.username || 'Anonymous'}
                        </span>
                        {status.privacy_level === 'friends' && (
                          <Badge variant="secondary" className="text-xs">
                            Friends
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {status.created_at ? formatDistanceToNow(new Date(status.created_at), { addSuffix: true }) : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleShare(status.id)}>
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem>Report</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {/* Status Content */}
                {status.content && (
                  <div className="px-4 pb-2">
                    <p className="text-base text-foreground leading-relaxed">{status.content}</p>
                  </div>
                )}
                
                {/* Enhanced Multiple Media Display */}
                {status.media && status.media.length > 0 && (
                  <div className="px-4 pb-2">
                    <div className={`grid gap-2 ${
                      status.media.length === 1 ? 'grid-cols-1' : 
                      status.media.length === 2 ? 'grid-cols-2' : 
                      status.media.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
                    }`}>
                      {status.media
                        .sort((a, b) => a.position - b.position)
                        .slice(0, 6) // Limit display to 6 media items max
                        .map((media, index) => (
                          <div key={media.id} className="relative rounded-lg overflow-hidden border">
                            {media.media_type === 'image' && (
                              <img 
                                src={media.media_url} 
                                alt="status media" 
                                className={`w-full object-cover ${
                                  status.media.length === 1 ? 'max-h-96' : 'h-48'
                                }`} 
                              />
                            )}
                            {media.media_type === 'video' && (
                              <video 
                                src={media.media_url} 
                                controls 
                                className={`w-full object-cover ${
                                  status.media.length === 1 ? 'max-h-96' : 'h-48'
                                }`} 
                              />
                            )}
                            {media.media_type === 'audio' && (
                              <div className="p-4 bg-muted flex flex-col items-center justify-center h-24">
                                <div className="text-2xl mb-2">🎵</div>
                                <audio src={media.media_url} controls className="w-full" />
                              </div>
                            )}
                            {media.media_type === 'document' && (
                              <div className="p-4 bg-muted flex flex-col items-center justify-center h-24">
                                <div className="text-2xl mb-2">📄</div>
                                <p className="text-xs text-center">Document</p>
                              </div>
                            )}
                            
                            {/* Media counter overlay */}
                            {status.media.length > 1 && (
                              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                {index + 1}/{status.media.length}
                              </div>
                            )}
                            
                            {/* Show "+X more" overlay for excess media */}
                            {index === 5 && status.media.length > 6 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-white text-lg font-semibold">
                                  +{status.media.length - 6} more
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Status Stats */}
                <div className="px-4 py-2 flex items-center justify-between text-sm text-muted-foreground border-t border-border">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {status.views?.length || 0}
                    </span>
                    <span>
                      👍 {Object.values(status.reactions || {}).reduce((a, b) => a + b.length, 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>{status.comment_count || 0} comments</span>
                    <span>{status.share_count || 0} shares</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="px-4 py-2 flex gap-2 border-t border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    👍 Like
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => toggleComments(status.id)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Comment
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => handleShare(status.id)}
                  >
                    <Share className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
                
                {/* Comments Section */}
                {expandedComments.has(status.id) && (
                  <div className="border-t border-border p-4 bg-muted/30">
                    <StatusComments statusId={status.id} />
                  </div>
                )}
              </div>
            ))
          )}
          
          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <div className="animate-pulse">Loading more...</div>
            </div>
          )}
        </div>
      </div>
      
      {showCreateModal && (
        <CreateStatusModal
          user={user || { id: "demo-user" }}
          onClose={() => setShowCreateModal(false)}
          onPost={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

export default StatusFeed;
