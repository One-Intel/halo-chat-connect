import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { StatusUpdate } from "@/types/status";
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

// Fetch status updates with enhanced filtering
export function useStatusUpdates(viewMode: 'friends' | 'public' = 'friends') {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['status-updates', viewMode],
    queryFn: async () => {
      let query = supabase
        .from('status_updates')
        .select(`
          id, user_id, content, created_at, expires_at, is_public, 
          privacy_level, comment_count, share_count,
          user:profiles(username, avatar_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      // Filter based on view mode
      if (viewMode === 'public') {
        query = query.eq('is_public', true).eq('privacy_level', 'public');
      } else if (viewMode === 'friends' && user) {
        // Show public posts and friends-only posts from friends
        const friendIds = await getFriendIds(user.id);
        if (friendIds) {
          query = query.or(
            `is_public.eq.true,and(privacy_level.eq.friends,user_id.in.(${friendIds}))`
          );
        } else {
          query = query.eq('is_public', true);
        }
      }
        
      const { data, error } = await query;
      if (error) throw error;
      
      // Get reactions, views, and other details for each status
      const statusWithDetails = await Promise.all(
        (data || []).map(async (status) => {
          const [reactions, views, shares] = await Promise.all([
            getStatusReactions(status.id),
            getStatusViews(status.id),
            getStatusShares(status.id)
          ]);

          return {
            ...status,
            media_url: null, // Add default media_url for now
            user: Array.isArray(status.user) ? status.user[0] : status.user,
            reactions,
            views: views?.map((v: any) => v.viewer_id) || [],
            viewCount: views?.length || 0,
            shares: shares?.map((s: any) => s.user_id) || [],
          };
        })
      );

      return statusWithDetails as StatusUpdate[];
    },
    enabled: !!user,
  });
}

// Helper function to get friend IDs
async function getFriendIds(currentUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', currentUserId);
    
  return data?.length ? data.map(f => f.friend_id).join(',') : null;
}

// Helper functions for status details
async function getStatusReactions(statusId: string) {
  const { data: reactions } = await supabase
    .from('status_reactions')
    .select('emoji, user_id')
    .eq('status_id', statusId);

  const reactionMap: Record<string, string[]> = {};
  if (reactions) {
    reactions.forEach((reaction) => {
      if (!reactionMap[reaction.emoji]) {
        reactionMap[reaction.emoji] = [];
      }
      reactionMap[reaction.emoji].push(reaction.user_id);
    });
  }
  return reactionMap;
}

async function getStatusViews(statusId: string) {
  const { data } = await supabase
    .from('status_views')
    .select('viewer_id')
    .eq('status_id', statusId);
  return data;
}

async function getStatusShares(statusId: string) {
  const { data } = await supabase
    .from('status_shares')
    .select('user_id')
    .eq('status_id', statusId);
  return data;
}

// Create status update with privacy controls
export function useCreateStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      content, 
      mediaUrl, 
      privacyLevel = 'public',
      isPublic = true 
    }: { 
      content?: string; 
      mediaUrl?: string; 
      privacyLevel?: 'public' | 'friends';
      isPublic?: boolean;
    }) => {
      if (!user) throw new Error('No user');
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const { data, error } = await supabase
        .from('status_updates')
        .insert({
          user_id: user.id,
          content,
          expires_at: expiresAt.toISOString(),
          is_public: isPublic,
          privacy_level: privacyLevel,
        })
        .select('*')
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates'] });
    },
  });
}

// Share a status
export function useShareStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ statusId }: { statusId: string }) => {
      if (!user) throw new Error('No user');
      
      const { error } = await supabase
        .from('status_shares')
        .insert({
          status_id: statusId,
          user_id: user.id
        });
        
      if (error && !error.message.includes('duplicate')) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates'] });
    },
  });
}

// View status
export function useViewStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ statusId }: { statusId: string }) => {
      if (!user) throw new Error('No user');
      
      // Add to status_views table
      const { error: viewError } = await supabase
        .from('status_views')
        .insert({
          status_id: statusId,
          viewer_id: user.id
        });
      
      if (viewError && !viewError.message.includes('duplicate')) {
        throw viewError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates'] });
    },
  });
}

// React to status
export function useReactToStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ statusId, emoji }: { statusId: string; emoji: string }) => {
      if (!user) throw new Error('No user');
      
      // Check if user already reacted
      const { data: existingReaction } = await supabase
        .from('status_reactions')
        .select('*')
        .eq('status_id', statusId)
        .eq('user_id', user.id)
        .single();
        
      if (existingReaction) {
        // Update existing reaction
        const { error } = await supabase
          .from('status_reactions')
          .update({ emoji })
          .eq('id', existingReaction.id);
          
        if (error) throw error;
      } else {
        // Create new reaction
        const { error } = await supabase
          .from('status_reactions')
          .insert({
            status_id: statusId,
            user_id: user.id,
            emoji
          });
          
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates'] });
    },
  });
}

// Delete status
export function useDeleteStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (statusId: string) => {
      if (!user) throw new Error('No user');
      
      const { error } = await supabase
        .from('status_updates')
        .delete()
        .eq('id', statusId)
        .eq('user_id', user.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates'] });
    },
  });
}

// Infinite scroll for status updates with enhanced filtering
export function useInfiniteStatusUpdates(pageSize = 10, viewMode = 'friends') {
  const { user } = useAuth();
  return useInfiniteQuery<StatusUpdate[], Error>({
    queryKey: ['status-updates', viewMode],
    initialPageParam: null,
    queryFn: async ({ pageParam = null }) => {
      let query: PostgrestFilterBuilder<any, any, any> = supabase
        .from('status_updates')
        .select(`
          id, user_id, content, created_at, expires_at, is_public, 
          privacy_level, comment_count, share_count,
          user:profiles(username, avatar_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(pageSize);
        
      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }
      
      // Apply privacy filtering
      if (viewMode === 'public') {
        query = query.eq('is_public', true).eq('privacy_level', 'public');
      } else if (viewMode === 'friends' && user) {
        // This is a simplified version - in production you'd want to optimize this
        query = query.or(`is_public.eq.true,privacy_level.eq.friends`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Get additional details for each status
      const enhancedData = await Promise.all(
        (data || []).map(async (status) => {
          const [reactions, views, shares] = await Promise.all([
            getStatusReactions(status.id),
            getStatusViews(status.id),
            getStatusShares(status.id)
          ]);

          return {
            ...status,
            media_url: null, // Add default media_url for now
            user: Array.isArray(status.user) ? status.user[0] : status.user,
            reactions,
            views: views?.map((v: any) => v.viewer_id) || [],
            viewCount: views?.length || 0,
            shares: shares?.map((s: any) => s.user_id) || [],
          };
        })
      );
      
      return enhancedData as StatusUpdate[];
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || !Array.isArray(lastPage) || lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
    enabled: !!user,
  });
}
