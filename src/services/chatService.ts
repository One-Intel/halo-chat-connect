
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

// Interface for chat data
export interface Chat {
  id: string;
  name?: string;
  is_group: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  participants?: Participant[];
  lastMessage?: Message;
  unreadCount?: number;
  messages?: Message[];
}

export interface Participant {
  id: string;
  user_id: string;
  chat_id: string;
  role: string;
  created_at: string;
  profile?: Profile;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  user_id?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  type: 'text' | 'voice';
  media_url?: string;
  file_name?: string;
  file_size?: number;
  voice_duration?: number;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
  reply_to?: string;
  forwarded_from?: string;
  deleted_at?: string;
  deleted_by?: string;
  profile?: Profile;
  reactions?: MessageReaction[];
  reply_to_message?: {
    content: string;
    type: 'text' | 'voice';
    user?: { username: string; };
  };
  user?: { username: string; };
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  createdAt: string;
}

// Get all chats for current user
export function useChats() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['chats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No authenticated user');

      console.log('Fetching chats for user:', user.id);

      // Get all chats where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select(`
          chat_id,
          chats!inner(
            id,
            name,
            is_group,
            avatar_url,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (participantError) {
        console.error('Error fetching participant chats:', participantError);
        throw participantError;
      }

      if (!participantData || participantData.length === 0) {
        return [];
      }

      // Extract unique chat IDs
      const chatIds = participantData.map(p => p.chat_id);

      // Get all participants for these chats with their profiles
      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from('participants')
        .select(`
          id,
          user_id,
          chat_id,
          role,
          created_at
        `)
        .in('chat_id', chatIds);

      if (allParticipantsError) {
        console.error('Error fetching all participants:', allParticipantsError);
      }

      // Get profiles for participants
      const participantUserIds = allParticipants?.map(p => p.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, user_id')
        .in('id', participantUserIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Get last message for each chat
      const lastMessages = await Promise.all(
        chatIds.map(async (chatId) => {
          const { data: message } = await supabase
            .from('messages')
            .select(`
              id,
              chat_id,
              user_id,
              content,
              type,
              media_url,
              file_name,
              created_at,
              status
            `)
            .eq('chat_id', chatId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return message ? { ...message, chat_id: chatId } : null;
        })
      );

      // Get unread count for each chat
      const unreadCounts = await Promise.all(
        chatIds.map(async (chatId) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chatId)
            .neq('user_id', user.id)
            .in('status', ['sent', 'delivered'])
            .is('deleted_at', null);

          return { chatId, unreadCount: count || 0 };
        })
      );

      // Combine all data
      const chats: Chat[] = participantData.map((participant) => {
        const chat = participant.chats;
        const chatParticipants = allParticipants?.filter(p => p.chat_id === chat.id) || [];
        const lastMessage = lastMessages.find(m => m?.chat_id === chat.id);
        const unreadData = unreadCounts.find(u => u.chatId === chat.id);

        // Add profiles to participants with consistent fallback
        const participantsWithProfiles = chatParticipants.map(p => {
          const profile = profiles?.find(pr => pr.id === p.user_id);
          return {
            ...p,
            profile: profile || { 
              id: p.user_id, 
              username: 'Unknown User', 
              user_id: p.user_id,
              avatar_url: null // Always include avatar_url, even if null
            }
          };
        });

        return {
          ...chat,
          participants: participantsWithProfiles,
          lastMessage: lastMessage ? {
            ...lastMessage,
            type: (lastMessage.type as 'text' | 'voice') || 'text',
            status: (lastMessage.status as 'sent' | 'delivered' | 'read') || 'sent'
          } : undefined,
          unreadCount: unreadData?.unreadCount || 0
        };
      });

      console.log('Final chats data:', chats);
      return chats;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Export alias for backward compatibility
export const useUserChats = useChats;

// Get single chat by ID with messages
export function useChat(chatId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['chat', chatId, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No authenticated user');
      if (!chatId) throw new Error('No chat ID provided');

      console.log('Fetching chat:', chatId, 'for user:', user.id);

      // First check if user is a participant in this chat
      const { data: participantCheck, error: participantError } = await supabase
        .from('participants')
        .select('chat_id')
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .single();

      if (participantError) {
        console.error('Participant check error:', participantError);
        if (participantError.code === 'PGRST116') {
          throw new Error('Chat not found or you do not have access');
        }
        throw participantError;
      }

      if (!participantCheck) {
        throw new Error('You are not a participant in this chat');
      }

      // Get chat details
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select(`
          id,
          name,
          is_group,
          avatar_url,
          created_at,
          updated_at
        `)
        .eq('id', chatId)
        .single();

      if (chatError) {
        console.error('Chat fetch error:', chatError);
        if (chatError.code === 'PGRST116') {
          throw new Error('Chat not found');
        }
        throw chatError;
      }

      // Get all participants
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select(`
          id,
          user_id,
          chat_id,
          role,
          created_at
        `)
        .eq('chat_id', chatId);

      if (participantsError) {
        console.error('Participants fetch error:', participantsError);
        throw participantsError;
      }

      // Get profiles for participants
      const participantUserIds = participants?.map(p => p.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, user_id')
        .in('id', participantUserIds);

      if (profilesError) {
        console.error('Profiles fetch error:', profilesError);
      }

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          chat_id,
          user_id,
          content,
          type,
          media_url,
          file_name,
          file_size,
          voice_duration,
          created_at,
          status,
          reply_to,
          forwarded_from,
          deleted_at,
          deleted_by
        `)
        .eq('chat_id', chatId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Messages fetch error:', messagesError);
        throw messagesError;
      }

      // Add profiles to participants with consistent fallback
      const participantsWithProfiles = participants?.map(p => {
        const profile = profiles?.find(pr => pr.id === p.user_id);
        return {
          ...p,
          profile: profile || { 
            id: p.user_id, 
            username: 'Unknown User', 
            user_id: p.user_id,
            avatar_url: null // Always include avatar_url, even if null
          }
        };
      }) || [];

      // Process messages with reply information
      const processedMessages = messages?.map(m => {
        const userProfile = profiles?.find(p => p.id === m.user_id);
        let reply_to_message = undefined;
        
        if (m.reply_to) {
          const replyMessage = messages.find(rm => rm.id === m.reply_to);
          if (replyMessage) {
            const replyUserProfile = profiles?.find(p => p.id === replyMessage.user_id);
            reply_to_message = {
              content: replyMessage.content,
              type: (replyMessage.type as 'text' | 'voice') || 'text',
              user: { username: replyUserProfile?.username || 'Unknown User' }
            };
          }
        }

        return {
          ...m,
          type: (m.type as 'text' | 'voice') || 'text',
          status: (m.status as 'sent' | 'delivered' | 'read') || 'sent',
          profile: userProfile || { 
            id: m.user_id, 
            username: 'Unknown User', 
            user_id: m.user_id,
            avatar_url: null // Always include avatar_url, even if null
          },
          user: { username: userProfile?.username || 'Unknown User' },
          reactions: [],
          reply_to_message
        };
      }) || [];

      const result = {
        ...chat,
        participants: participantsWithProfiles,
        messages: processedMessages
      };

      console.log('Chat fetch result for', chatId, ':', result);
      return result;
    },
    enabled: !!user && !!chatId,
    retry: (failureCount, error) => {
      // Don't retry if it's a permission/not found error
      if (error?.message?.includes('not found') || error?.message?.includes('access')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

// Send message
export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      chatId, 
      content, 
      type = 'text',
      replyTo 
    }: { 
      chatId: string; 
      content: string; 
      type?: 'text' | 'voice';
      replyTo?: string;
    }) => {
      if (!user) throw new Error('No authenticated user');
      
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          content,
          type,
          reply_to: replyTo || null,
          status: 'sent'
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat', variables.chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (error: any) => {
      console.error('Send message error:', error);
      toast({
        title: 'Error',
        description: `Failed to send message: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Add reaction to message
export function useAddReaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { user } = useAuth();
      if (!user) throw new Error('No authenticated user');
      
      const { data, error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });
}

// Remove reaction from message
export function useRemoveReaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { user } = useAuth();
      if (!user) throw new Error('No authenticated user');
      
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });
}

// Create a new chat
export function useCreateChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      participantIds, 
      isGroup = false, 
      name, 
      avatarUrl 
    }: { 
      participantIds: string[]; 
      isGroup?: boolean; 
      name?: string; 
      avatarUrl?: string; 
    }) => {
      if (!user) throw new Error('No authenticated user');
      
      // Include current user in participants
      const allParticipantIds = [...new Set([user.id, ...participantIds])];
      
      console.log('Creating chat with participants:', allParticipantIds);
      
      // Create the chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: name || null,
          is_group: isGroup,
          avatar_url: avatarUrl || null,
        })
        .select()
        .single();
        
      if (chatError) {
        console.error('Error creating chat:', chatError);
        throw chatError;
      }
      
      console.log('Created chat:', chat);
      
      // Add participants
      const participantInserts = allParticipantIds.map(participantId => ({
        chat_id: chat.id,
        user_id: participantId,
        role: participantId === user.id && isGroup ? 'admin' : 'member'
      }));
      
      const { error: participantsError } = await supabase
        .from('participants')
        .insert(participantInserts);
        
      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        // Try to clean up the chat if participant addition fails
        await supabase.from('chats').delete().eq('id', chat.id);
        throw participantsError;
      }
      
      console.log('Added participants to chat:', chat.id);
      return chat.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      toast({
        title: 'Success',
        description: 'Chat created successfully',
      });
    },
    onError: (error: any) => {
      console.error('Create chat error:', error);
      toast({
        title: 'Error',
        description: `Failed to create chat: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Search users function with better error handling
export function useSearchUsers(query: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['search-users', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      
      console.log('Searching users with query:', query);
      
      // Search by username or user_id
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, user_id')
        .or(`username.ilike.%${query}%,user_id.ilike.%${query}%`)
        .neq('id', user?.id || '') // Exclude current user
        .limit(10);
        
      if (error) {
        console.error('User search error:', error);
        throw error;
      }
      
      console.log('User search results:', data);
      return data || [];
    },
    enabled: !!query && query.length >= 2,
  });
}

// Leave chat
export function useLeaveChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (chatId: string) => {
      if (!user) throw new Error('No authenticated user');
      
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      return chatId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      toast({
        title: 'Success',
        description: 'Left chat successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to leave chat: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
