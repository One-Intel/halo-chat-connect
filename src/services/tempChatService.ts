
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TempChatSession, TempMessage } from "@/types/status";

// Create a temporary chat session
export function useCreateTempSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      chatId, 
      timerMinutes = 1 
    }: { 
      chatId: string; 
      timerMinutes?: number;
    }) => {
      if (!user) throw new Error('No user');
      
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + timerMinutes);
      
      const { data, error } = await supabase
        .from('temp_chat_sessions')
        .insert({
          chat_id: chatId,
          created_by: user.id,
          timer_minutes: timerMinutes,
          expires_at: expiresAt.toISOString(),
        })
        .select('*')
        .single();
        
      if (error) throw error;
      
      // Notify other participants via realtime
      await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          content: `🔒 Temporary chat started (${timerMinutes} min timer)`,
          type: 'system'
        });
        
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temp-sessions'] });
    },
  });
}

// Get active temp session for a chat
export function useTempSession(chatId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['temp-sessions', chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('temp_chat_sessions')
        .select('*')
        .eq('chat_id', chatId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      return data as TempChatSession | null;
    },
    enabled: !!user && !!chatId,
    refetchInterval: 5000, // Check every 5 seconds for session updates
  });
}

// Get temporary messages for a session
export function useTempMessages(sessionId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['temp-messages', sessionId],
    queryFn: async () => {
      // First get the temp messages
      const { data: tempMessages, error: messagesError } = await supabase
        .from('temp_messages')
        .select('*')
        .eq('session_id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });
        
      if (messagesError) throw messagesError;
      
      if (!tempMessages || tempMessages.length === 0) {
        return [];
      }
      
      // Get unique user IDs
      const userIds = [...new Set(tempMessages.map(msg => msg.user_id))];
      
      // Fetch user profiles separately
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Create a map of user profiles
      const profilesMap = new Map(profiles?.map(profile => [profile.id, profile]) || []);
      
      // Combine messages with user data
      return tempMessages.map(msg => ({
        ...msg,
        user: profilesMap.get(msg.user_id) || { username: 'Unknown User', avatar_url: null }
      })) as (TempMessage & { user: { username: string; avatar_url: string | null } })[];
    },
    enabled: !!user && !!sessionId,
    refetchInterval: 1000, // Refresh every second for real-time countdown
  });
}

// Send a temporary message
export function useSendTempMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      content, 
      timerMinutes = 1 
    }: { 
      sessionId: string; 
      content: string; 
      timerMinutes?: number;
    }) => {
      if (!user) throw new Error('No user');
      
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + timerMinutes);
      
      const { data, error } = await supabase
        .from('temp_messages')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          content,
          expires_at: expiresAt.toISOString(),
        })
        .select('*')
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['temp-messages', sessionId] });
    },
  });
}

// End a temporary chat session
export function useEndTempSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, chatId }: { sessionId: string; chatId: string }) => {
      if (!user) throw new Error('No user');
      
      // Deactivate the session
      const { error: sessionError } = await supabase
        .from('temp_chat_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
        
      if (sessionError) throw sessionError;
      
      // Delete all messages in the session
      const { error: messagesError } = await supabase
        .from('temp_messages')
        .delete()
        .eq('session_id', sessionId);
        
      if (messagesError) throw messagesError;
      
      // Send system message about session end
      await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          content: '🔓 Temporary chat ended',
          type: 'system'
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temp-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['temp-messages'] });
    },
  });
}

// Delete expired messages and auto-close empty sessions
export function useCleanupTempMessages() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // This will be called periodically to clean up expired messages
      const { error } = await supabase.rpc('delete_expired_temp_messages');
      if (error) throw error;
      
      // Check for sessions with no active messages and close them
      const { error: cleanupError } = await supabase.rpc('deactivate_expired_temp_sessions');
      if (cleanupError) throw cleanupError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temp-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['temp-messages'] });
    },
  });
}
