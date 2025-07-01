
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
  });
}

// Get temporary messages for a session
export function useTempMessages(sessionId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['temp-messages', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('temp_messages')
        .select(`
          id, session_id, user_id, content, created_at, expires_at,
          user:profiles(username, avatar_url)
        `)
        .eq('session_id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return (data || []) as TempMessage[];
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
    mutationFn: async (sessionId: string) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temp-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['temp-messages'] });
    },
  });
}
