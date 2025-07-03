
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Eye, MessageCircle, Share, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const ProfileStatusDashboard: React.FC = () => {
  const { user } = useAuth();
  const [myStatuses, setMyStatuses] = useState([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchMyStatuses = async () => {
      const { data, error } = await supabase
        .from('status_updates')
        .select(`
          id, content, created_at, expires_at, is_public, privacy_level,
          comment_count, share_count,
          status_media(id, media_url, media_type, position)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching statuses:', error);
        return;
      }

      // Get additional stats for each status
      const statusesWithStats = await Promise.all(
        (data || []).map(async (status) => {
          const [viewsData, reactionsData] = await Promise.all([
            supabase
              .from('status_views')
              .select('id')
              .eq('status_id', status.id),
            supabase
              .from('status_reactions')
              .select('id')
              .eq('status_id', status.id)
          ]);

          return {
            ...status,
            viewCount: viewsData.data?.length || 0,
            reactionCount: reactionsData.data?.length || 0,
            media: status.status_media || []
          };
        })
      );

      setMyStatuses(statusesWithStats || []);
    };
    
    fetchMyStatuses();
  }, [user?.id]);

  const handleDeleteStatus = async (statusId: string) => {
    try {
      const { error } = await supabase
        .from('status_updates')
        .delete()
        .eq('id', statusId)
        .eq('user_id', user?.id);
        
      if (error) throw error;
      
      // Refresh the list
      setMyStatuses(prev => prev.filter(status => status.id !== statusId));
    } catch (error) {
      console.error('Error deleting status:', error);
    }
  };

  return (
    <div className="flex flex-col p-4 bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
        <h2 className="text-xl font-bold text-foreground">My Statuses</h2>
        <Link to="/profile">
          <Button variant="outline" className="rounded-full px-4 py-1 text-sm">Back to Profile</Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {myStatuses.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-lg">
            No statuses yet.
          </div>
        ) : (
          myStatuses.map((status) => (
            <div key={status.id} className="border border-border rounded-xl p-0 bg-card shadow hover:shadow-md transition overflow-hidden">
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={status.privacy_level === 'public' ? 'default' : 'secondary'}>
                    {status.privacy_level === 'public' ? 'Public' : 'Friends'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(status.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDeleteStatus(status.id)} className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Status Content */}
              {status.content && (
                <div className="px-4 pb-2">
                  <p className="text-base text-foreground leading-relaxed">{status.content}</p>
                </div>
              )}
              
              {/* Status Media */}
              {status.media && status.media.length > 0 && (
                <div className="px-4 pb-2">
                  <div className={`grid gap-2 ${
                    status.media.length === 1 ? 'grid-cols-1' : 
                    status.media.length === 2 ? 'grid-cols-2' : 
                    'grid-cols-2'
                  }`}>
                    {status.media
                      .sort((a, b) => a.position - b.position)
                      .map((media, index) => (
                        <div key={media.id} className="relative rounded-lg overflow-hidden border">
                          {media.media_type === 'image' && (
                            <img 
                              src={media.media_url} 
                              alt="status media" 
                              className="w-full h-48 object-cover" 
                            />
                          )}
                          {media.media_type === 'video' && (
                            <video 
                              src={media.media_url} 
                              controls 
                              className="w-full h-48 object-cover" 
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
                          {status.media.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                              {index + 1}/{status.media.length}
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
                    {status.viewCount}
                  </span>
                  <span className="flex items-center gap-1">
                    👍 {status.reactionCount}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    {status.comment_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share className="h-4 w-4" />
                    {status.share_count || 0}
                  </span>
                </div>
              </div>
              
              {/* Expiry Info */}
              <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/30">
                Expires: {formatDistanceToNow(new Date(status.expires_at), { addSuffix: true })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProfileStatusDashboard;
