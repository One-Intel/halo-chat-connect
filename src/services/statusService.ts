import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { StatusUpdate } from "@/types/status";
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

// Enhanced infinite scroll with proper media handling and debug logging
export function useInfiniteStatusUpdates(pageSize = 10, viewMode = 'public') {
  const { user } = useAuth();
  
  return useInfiniteQuery<StatusUpdate[], Error>({
    queryKey: ['status-updates-infinite', viewMode, user?.id],
    initialPageParam: null,
    queryFn: async ({ pageParam = null }) => {
      console.log('Fetching statuses with params:', { pageParam, viewMode, userId: user?.id });
      
      // First, fetch status updates without the problematic foreign key hint
      let query = supabase
        .from('status_updates')
        .select(`
          id, user_id, content, created_at, expires_at, is_public, 
          privacy_level, comment_count, share_count,
          status_media(id, media_url, media_type, position)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(pageSize);
        
      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }
      
      // Apply privacy filtering based on view mode
      if (viewMode === 'public') {
        query = query.eq('is_public', true);
      } else if (viewMode === 'friends' && user) {
        // For friends mode, show public posts AND user's own posts
        // We can't easily filter by friendship here, so we'll show all public posts
        // In a real app, you'd need a more complex query or handle this differently
        query = query.eq('is_public', true);
      }
      
      const { data: statusData, error } = await query;
      
      console.log('Raw status query result:', { data: statusData, error });
      
      if (error) {
        console.error('Error fetching statuses:', error);
        throw error;
      }
      
      if (!statusData || statusData.length === 0) {
        console.log('No statuses found');
        return [];
      }
      
      // Get unique user IDs from the statuses
      const userIds = [...new Set(statusData.map(status => status.user_id))];
      
      // Fetch user profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Continue without profiles rather than failing completely
      }
      
      console.log('Profiles data:', profilesData);
      
      // Create a map of user profiles for quick lookup
      const userProfiles = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);
      
      // Get additional details for each status
      const enhancedData = await Promise.all(
        statusData.map(async (status) => {
          const [reactions, views, shares] = await Promise.all([
            getStatusReactions(status.id),
            getStatusViews(status.id),
            getStatusShares(status.id)
          ]);

          const enhanced = {
            ...status,
            media_url: status.status_media?.[0]?.media_url || null,
            media: status.status_media || [],
            user: userProfiles[status.user_id] || { username: 'Unknown', avatar_url: null },
            reactions,
            views: views?.map((v: any) => v.viewer_id) || [],
            viewCount: views?.length || 0,
            shares: shares?.map((s: any) => s.user_id) || [],
          };
          
          console.log('Enhanced status:', enhanced);
          return enhanced;
        })
      );
      
      console.log('Final enhanced data:', enhancedData);
      return enhancedData as StatusUpdate[];
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || !Array.isArray(lastPage) || lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
    enabled: true, // Always enabled, don't require user
  });
}

// Fetch status updates with enhanced filtering and media
export function useStatusUpdates(viewMode: 'friends' | 'public' = 'friends') {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['status-updates', viewMode],
    queryFn: async () => {
      // Fetch status updates without the problematic foreign key hint
      let query = supabase
        .from('status_updates')
        .select(`
          id, user_id, content, created_at, expires_at, is_public, 
          privacy_level, comment_count, share_count,
          status_media(id, media_url, media_type, position)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      // Filter based on view mode
      if (viewMode === 'public') {
        query = query.eq('is_public', true).eq('privacy_level', 'public');
      } else if (viewMode === 'friends' && user) {
        // Show all public posts OR user's own posts OR friends' posts
        query = query.or(`is_public.eq.true,user_id.eq.${user.id}`);
      }
        
      const { data: statusData, error } = await query;
      if (error) throw error;
      
      if (!statusData || statusData.length === 0) {
        return [];
      }
      
      // Get unique user IDs from the statuses
      const userIds = [...new Set(statusData.map(status => status.user_id))];
      
      // Fetch user profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Continue without profiles rather than failing completely
      }
      
      // Create a map of user profiles for quick lookup
      const userProfiles = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);
      
      // Get reactions, views, and other details for each status
      const statusWithDetails = await Promise.all(
        statusData.map(async (status) => {
          const [reactions, views, shares] = await Promise.all([
            getStatusReactions(status.id),
            getStatusViews(status.id),
            getStatusShares(status.id)
          ]);

          return {
            ...status,
            media_url: status.status_media?.[0]?.media_url || null,
            media: status.status_media || [],
            user: userProfiles[status.user_id] || { username: 'Unknown', avatar_url: null },
            reactions,
            views: views?.map((v: any) => v.viewer_id) || [],
            viewCount: views?.length || 0,
            shares: shares?.map((s: any) => s.user_id) || [],
          };
        })
      );

      return statusWithDetails as StatusUpdate[];
    },
    enabled: true, // Always enabled
  });
}

async function getFriendIds(currentUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', currentUserId);
    
  return data?.length ? data.map(f => f.friend_id).join(',') : null;
}

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

// Create status update with multiple media support
export function useCreateStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      content, 
      mediaUrls = [], 
      privacyLevel = 'public',
      isPublic = true 
    }: { 
      content?: string; 
      mediaUrls?: { url: string; type: string }[]; 
      privacyLevel?: 'public' | 'friends';
      isPublic?: boolean;
    }) => {
      if (!user) throw new Error('No user');
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      console.log('Creating status with:', { content, mediaUrls, privacyLevel, isPublic });
      
      // Create the status update
      const { data: status, error } = await supabase
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
        
      if (error) {
        console.error('Error creating status:', error);
        throw error;
      }
      
      console.log('Status created:', status);
      
      // Insert all media files
      if (mediaUrls.length > 0) {
        const mediaInserts = mediaUrls.map((media, index) => ({
          status_id: status.id,
          media_url: media.url,
          media_type: media.type,
          position: index
        }));
        
        console.log('Inserting media:', mediaInserts);
        
        const { error: mediaError } = await supabase
          .from('status_media')
          .insert(mediaInserts);
          
        if (mediaError) {
          console.error('Error inserting media:', mediaError);
          throw mediaError;
        }
      }
      
      return status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates-infinite'] });
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
      if (!user) return; // Don't throw error, just skip
      
      // Add to status_views table
      const { error: viewError } = await supabase
        .from('status_views')
        .insert({
          status_id: statusId,
          viewer_id: user.id
        });
      
      if (viewError && !viewError.message.includes('duplicate')) {
        console.error('Error adding view:', viewError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates-infinite'] });
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
      queryClient.invalidateQueries({ queryKey: ['status-updates-infinite'] });
    },
  });
}

// Share status
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
      queryClient.invalidateQueries({ queryKey: ['status-updates-infinite'] });
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
      queryClient.invalidateQueries({ queryKey: ['status-updates-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['status-updates'] });
    },
  });
}
