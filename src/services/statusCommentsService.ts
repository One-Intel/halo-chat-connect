
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { StatusComment } from "@/types/status";

// Fetch comments for a status
export function useStatusComments(statusId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['status-comments', statusId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_comments')
        .select(`
          id, status_id, user_id, content, reply_to_comment_id, created_at, updated_at,
          user:profiles(username, avatar_url)
        `)
        .eq('status_id', statusId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      // Get reactions for each comment
      const commentsWithReactions = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: reactions } = await supabase
            .from('comment_reactions')
            .select('emoji, user_id')
            .eq('comment_id', comment.id);

          const reactionMap: Record<string, string[]> = {};
          if (reactions) {
            reactions.forEach((reaction) => {
              if (!reactionMap[reaction.emoji]) {
                reactionMap[reaction.emoji] = [];
              }
              reactionMap[reaction.emoji].push(reaction.user_id);
            });
          }

          return {
            ...comment,
            user: Array.isArray(comment.user) ? comment.user[0] : comment.user,
            reactions: reactionMap,
          };
        })
      );

      // Organize comments into threads (replies under parent comments)
      const parentComments = commentsWithReactions.filter(c => !c.reply_to_comment_id);
      const repliesMap = new Map();
      
      commentsWithReactions.filter(c => c.reply_to_comment_id).forEach(reply => {
        const parentId = reply.reply_to_comment_id;
        if (!repliesMap.has(parentId)) {
          repliesMap.set(parentId, []);
        }
        repliesMap.get(parentId).push(reply);
      });

      const threaded = parentComments.map(parent => ({
        ...parent,
        replies: repliesMap.get(parent.id) || []
      }));

      return threaded as StatusComment[];
    },
    enabled: !!user && !!statusId,
  });
}

// Create a comment
export function useCreateComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      statusId, 
      content, 
      replyToCommentId 
    }: { 
      statusId: string; 
      content: string; 
      replyToCommentId?: string;
    }) => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('status_comments')
        .insert({
          status_id: statusId,
          user_id: user.id,
          content,
          reply_to_comment_id: replyToCommentId
        })
        .select('*')
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { statusId }) => {
      queryClient.invalidateQueries({ queryKey: ['status-comments', statusId] });
      queryClient.invalidateQueries({ queryKey: ['status-updates'] });
    },
  });
}

// React to a comment
export function useReactToComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: string }) => {
      if (!user) throw new Error('No user');
      
      // Check if user already reacted
      const { data: existingReaction } = await supabase
        .from('comment_reactions')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single();
        
      if (existingReaction) {
        // Update existing reaction
        const { error } = await supabase
          .from('comment_reactions')
          .update({ emoji })
          .eq('id', existingReaction.id);
          
        if (error) throw error;
      } else {
        // Create new reaction
        const { error } = await supabase
          .from('comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            emoji
          });
          
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-comments'] });
    },
  });
}

// Delete a comment
export function useDeleteComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error('No user');
      
      const { error } = await supabase
        .from('status_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-comments'] });
      queryClient.invalidateQueries({ queryKey: ['status-updates'] });
    },
  });
}
