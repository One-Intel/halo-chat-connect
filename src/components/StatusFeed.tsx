
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

const StatusPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'friends' | 'public'>('friends');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const user = { id: "demo-user" }; // TODO: Get user from context or props
  
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
    <div className="container max-w-md mx-auto p-0 pb-20 bg-white">
      <div className="flex flex-col h-screen bg-background dark:bg-gray-900">
        <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-10 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Status</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full shadow transition-colors"
            >
              Create Status
            </button>
          </div>
        </header>
        
        <div className="flex border-b border-border sticky top-[64px] z-10 bg-white dark:bg-gray-900">
          <button
            className={`flex-1 py-3 font-semibold transition-all duration-200 ${
              viewMode === 'friends' 
                ? 'bg-orange-500 text-white shadow-sm' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setViewMode('friends')}
          >
            Friends Posts
          </button>
          <button
            className={`flex-1 py-3 font-semibold transition-all duration-200 ${
              viewMode === 'public' 
                ? 'bg-orange-500 text-white shadow-sm' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setViewMode('public')}
          >
            Public Posts
          </button>
        </div>
        
        {/* Facebook-like Story Bar */}
        <div className="sticky top-[112px] z-10 bg-background dark:bg-gray-900 px-4 py-2 border-b border-border">
          <StatusStoryBar />
        </div>
        
        <div className="flex-1 overflow-y-auto px-0 pb-4 bg-background dark:bg-gray-900">
          {/* Enhanced Status Feed */}
          <div className="flex flex-col gap-2 px-2 pt-2">
            {statuses.length === 0 && status === 'success' ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-lg">
                No statuses yet.
              </div>
            ) : (
              statuses.map((status, idx) => (
                <div key={status.id || idx} className="bg-white dark:bg-gray-900 border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow p-0 overflow-hidden">
                  {/* Status Header */}
                  <div className="flex items-center justify-between p-4 pb-2">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        src={status.user?.avatar_url} 
                        alt={status.user?.username || 'User'} 
                        size="sm" 
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
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
                  
                  {/* Status Content */}
                  {status.content && (
                    <div className="px-4 pb-2">
                      <p className="text-base text-foreground">{status.content}</p>
                    </div>
                  )}
                  
                  {/* Status Media */}
                  {status.media_url && (
                    <div className="px-4 pb-2">
                      {status.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img 
                          src={status.media_url} 
                          alt="status" 
                          className="rounded-lg w-full max-h-96 object-cover border" 
                        />
                      ) : status.media_url.match(/\.(mp4|webm|mov)$/i) ? (
                        <video 
                          src={status.media_url} 
                          controls 
                          className="rounded-lg w-full max-h-96 object-cover border" 
                        />
                      ) : status.media_url.match(/\.(mp3|wav|ogg)$/i) ? (
                        <audio src={status.media_url} controls className="w-full" />
                      ) : null}
                    </div>
                  )}
                  
                  {/* Status Stats */}
                  <div className="px-4 py-2 flex items-center justify-between text-sm text-muted-foreground border-t border-gray-100">
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
                  <div className="px-4 py-2 flex gap-2 border-t border-gray-100">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 text-xs hover:bg-gray-50"
                    >
                      👍 Like
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 text-xs hover:bg-gray-50"
                      onClick={() => toggleComments(status.id)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Comment
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 text-xs hover:bg-gray-50"
                      onClick={() => handleShare(status.id)}
                    >
                      <Share className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  </div>
                  
                  {/* Comments Section */}
                  {expandedComments.has(status.id) && (
                    <div className="border-t border-gray-100 p-4">
                      <StatusComments statusId={status.id} />
                    </div>
                  )}
                </div>
              ))
            )}
            
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                Loading more...
              </div>
            )}
          </div>
        </div>
        
        {showCreateModal && (
          <CreateStatusModal
            user={user}
            onClose={() => setShowCreateModal(false)}
            onPost={() => {}}
          />
        )}
      </div>
      <NavBar />
    </div>
  );
};

export default StatusPage;
