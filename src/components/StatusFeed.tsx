
import React, { useState, useEffect } from "react";
import CreateStatusModal from "./CreateStatusModal";
import NavBar from "@/components/NavBar";
import StatusStoryBar from "./StatusStoryBar";
import StatusComments from "./StatusComments";
import Avatar from "@/components/Avatar";
import { useInfiniteStatusUpdates, useShareStatus, useReactToStatus, useViewStatus } from '@/services/statusService';
import { StatusUpdate } from '@/types/status';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Share, Eye, MoreVertical, Heart, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const StatusFeed: React.FC = () => {
  const [viewMode, setViewMode] = useState<'friends' | 'public'>('public');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch
  } = useInfiniteStatusUpdates(10, viewMode);

  const shareStatus = useShareStatus();
  const reactToStatus = useReactToStatus();
  const viewStatus = useViewStatus();
  
  const statuses: StatusUpdate[] = data ? data.pages.flat() as StatusUpdate[] : [];

  // Debug logging
  console.log('StatusFeed - View Mode:', viewMode);
  console.log('StatusFeed - Query Status:', status);
  console.log('StatusFeed - Statuses Count:', statuses.length);
  console.log('StatusFeed - First few statuses:', statuses.slice(0, 3));

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

  // Auto-mark statuses as viewed when they come into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const statusId = entry.target.getAttribute('data-status-id');
            if (statusId && user) {
              viewStatus.mutate({ statusId });
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const statusElements = document.querySelectorAll('[data-status-id]');
    statusElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [statuses, user, viewStatus]);

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

  const handleReact = async (statusId: string, emoji: string) => {
    try {
      await reactToStatus.mutateAsync({ statusId, emoji });
    } catch (error) {
      console.error('Failed to react to status:', error);
    }
  };

  const toggleVideoPlay = (statusId: string) => {
    const newPlaying = new Set(playingVideos);
    if (newPlaying.has(statusId)) {
      newPlaying.delete(statusId);
    } else {
      newPlaying.add(statusId);
    }
    setPlayingVideos(newPlaying);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
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
      
      {/* View Mode Toggle */}
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
      
      {/* Story Bar */}
      <div className="sticky top-[112px] z-10 bg-background px-4 py-2 border-b border-border">
        <StatusStoryBar />
      </div>
      
      {/* TikTok-like Status Feed */}
      <div className="flex-1 overflow-y-auto bg-background">
        {status === 'pending' && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-lg">
            Loading statuses...
          </div>
        )}
        
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg mb-4">Failed to load statuses</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        )}
        
        {statuses.length === 0 && status === 'success' ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-lg py-20">
            <p className="mb-4">No statuses yet.</p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Create Your First Status
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {statuses.map((status, idx) => (
              <div 
                key={status.id || idx} 
                data-status-id={status.id}
                className="relative min-h-screen flex flex-col bg-card"
              >
                {/* Status Content - Full Screen */}
                <div className="flex-1 relative">
                  {/* Media Background */}
                  {status.media && status.media.length > 0 && (
                    <div className="absolute inset-0 bg-black">
                      {status.media[0].media_type === 'image' && (
                        <img 
                          src={status.media[0].media_url} 
                          alt="status media" 
                          className="w-full h-full object-cover" 
                        />
                      )}
                      {status.media[0].media_type === 'video' && (
                        <div className="relative w-full h-full">
                          <video 
                            src={status.media[0].media_url} 
                            className="w-full h-full object-cover"
                            loop
                            muted
                            autoPlay={playingVideos.has(status.id)}
                            onClick={() => toggleVideoPlay(status.id)}
                          />
                          <button
                            onClick={() => toggleVideoPlay(status.id)}
                            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                          >
                            {playingVideos.has(status.id) ? (
                              <Pause className="h-16 w-16 text-white" />
                            ) : (
                              <Play className="h-16 w-16 text-white" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Content Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20">
                    {/* Top Info */}
                    <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          src={status.user?.avatar_url || undefined} 
                          alt={status.user?.username || 'User'} 
                          size="sm" 
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">
                              {status.user?.username || 'Anonymous'}
                            </span>
                            {status.privacy_level === 'friends' && (
                              <Badge variant="secondary" className="text-xs">
                                Friends
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-white/80">
                            {status.created_at ? formatDistanceToNow(new Date(status.created_at), { addSuffix: true }) : ''}
                          </span>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
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
                    
                    {/* Bottom Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {/* Text Content */}
                      {status.content && (
                        <div className="mb-4">
                          <p className="text-white text-lg leading-relaxed">{status.content}</p>
                        </div>
                      )}
                      
                      {/* Action Buttons Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          {/* Like Button */}
                          <button 
                            onClick={() => handleReact(status.id, '❤️')}
                            className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
                          >
                            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                              <Heart className="h-6 w-6" />
                            </div>
                            <span className="text-xs">
                              {Object.values(status.reactions || {}).reduce((a, b) => a + b.length, 0)}
                            </span>
                          </button>
                          
                          {/* Comment Button */}
                          <button 
                            onClick={() => toggleComments(status.id)}
                            className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
                          >
                            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                              <MessageCircle className="h-6 w-6" />
                            </div>
                            <span className="text-xs">{status.comment_count || 0}</span>
                          </button>
                          
                          {/* Share Button */}
                          <button 
                            onClick={() => handleShare(status.id)}
                            className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
                          >
                            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                              <Share className="h-6 w-6" />
                            </div>
                            <span className="text-xs">{status.share_count || 0}</span>
                          </button>
                        </div>
                        
                        {/* View Count */}
                        <div className="flex items-center gap-1 text-white/80">
                          <Eye className="h-4 w-4" />
                          <span className="text-sm">{status.views?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Comments Section (Expandable) */}
                {expandedComments.has(status.id) && (
                  <div className="bg-background border-t border-border p-4 max-h-60 overflow-y-auto">
                    <StatusComments statusId={status.id} />
                  </div>
                )}
              </div>
            ))}
            
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <div className="animate-pulse">Loading more...</div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {showCreateModal && (
        <CreateStatusModal
          user={user || { id: "demo-user" }}
          onClose={() => setShowCreateModal(false)}
          onPost={() => {
            setShowCreateModal(false);
            refetch(); // Refresh the feed after posting
          }}
        />
      )}
    </div>
  );
};

export default StatusFeed;
