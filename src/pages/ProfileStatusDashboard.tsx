import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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
          status_views(id),
          status_reactions(id),
          status_comments(id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error) setMyStatuses(data || []);
    };
    fetchMyStatuses();
  }, [user.id]);

  return (
    <div className="flex flex-col p-4 bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
        <h2 className="text-xl font-bold text-foreground">My Statuses</h2>
        <Link to="/profile">
          <Button variant="outline" className="rounded-full px-4 py-1 text-sm">Back to Profile</Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {myStatuses.length === 0 ? (
          <div className="col-span-2 flex items-center justify-center h-32 text-muted-foreground text-lg">No statuses yet.</div>
        ) : myStatuses.map((status) => (
          <div key={status.id} className="border border-border rounded-lg p-4 bg-card shadow hover:shadow-md transition flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                status.privacy_level === 'public' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {status.privacy_level === 'public' ? 'Public' : 'Friends'}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(status.created_at).toLocaleDateString()}
              </span>
            </div>
            
            {status.content && (
              <p className="text-sm text-foreground mb-3 line-clamp-3">{status.content}</p>
            )}
            
            <div className="flex gap-4 text-xs text-muted-foreground mt-auto">
              <span>Views: {status.status_views?.length || 0}</span>
              <span>Reactions: {status.status_reactions?.length || 0}</span>
              <span>Comments: {status.comment_count || 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileStatusDashboard;
