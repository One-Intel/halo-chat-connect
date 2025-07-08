
import React, { useRef, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Phone, Video, ArrowLeft, MoreVertical, UserPlus, Archive, Trash2, Clock } from 'lucide-react';
import Avatar from '@/components/Avatar';
import ChatBubble from '@/components/ChatBubble';
import ChatInput from '@/components/ChatInput';
import { ForwardMessageDialog } from '@/components/ForwardMessageDialog';
import TempChatInterface from '@/components/TempChatInterface';
import { useChat, useSendMessage, useAddReaction, useRemoveReaction, type Message } from '@/services/chatService';
import { useTypingStatus } from '@/services/typingService';
import { useMessageStatus } from '@/services/messageStatusService';
import { useInitiateCall } from '@/services/callService';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/services/notificationService';
import { usePresence } from '@/services/presenceService';
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const ChatDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showTempChat, setShowTempChat] = useState(false);
  
  const { 
    data: chat, 
    isLoading, 
    isError,
    error
  } = useChat(id);
  
  const { 
    mutate: sendMessage, 
    isPending: isSending 
  } = useSendMessage();

  const {
    mutate: addReaction,
    isPending: isAddingReaction
  } = useAddReaction();

  const {
    mutate: removeReaction,
    isPending: isRemovingReaction
  } = useRemoveReaction();

  const { mutate: initiateCall } = useInitiateCall();

  const { typingUsers, setTyping } = useTypingStatus(id || '');
  const { markMessageAsRead } = useMessageStatus(id || '');
  useNotifications();

  // Use an array with the other participant id if present, otherwise an empty array
  const { presence, isOnline } = usePresence(
    chat && user
      ? chat.participants?.filter(p => p.user_id !== user.id).map(p => p.user_id) || []
      : []
  );

  const otherParticipant = chat?.participants?.find(p => p.user_id !== user?.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId) {
              markMessageAsRead(messageId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const unreadMessages = document.querySelectorAll('[data-message-id]');
    unreadMessages.forEach(msg => observer.observe(msg));

    return () => {
      observer.disconnect();
    };
  }, [chat?.messages, markMessageAsRead]);

  useEffect(() => {
    if (isError && error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load chat';
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      
      if (errorMessage.includes('Access denied') || errorMessage.includes('not found')) {
        setTimeout(() => navigate('/chats'), 2000);
      }
    }
  }, [isError, error, toast, navigate]);

  const handleCall = (type: 'audio' | 'video') => {
    if (!otherParticipant) return;
    
    initiateCall(
      { 
        receiverId: otherParticipant.user_id, 
        callType: type 
      },
      {
        onSuccess: (call) => {
          toast({
            title: `${type === 'video' ? 'Video' : 'Audio'} call initiated`,
            description: `Calling ${otherParticipant.profile?.username}...`,
          });
          // Navigate to call screen
          navigate(`/call/${call.id}`);
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initiate call';
          toast({
            variant: "destructive",
            title: "Error",
            description: errorMessage,
          });
        }
      }
    );
  };

  const handleBlockUser = () => {
    toast({
      title: "User blocked",
      description: `${otherParticipant?.profile?.username} has been blocked`,
    });
  };

  const handleArchiveChat = () => {
    toast({
      title: "Chat archived",
      description: "This conversation has been archived",
    });
  };

  const handleDeleteChat = () => {
    toast({
      title: "Chat deleted",
      description: "This conversation has been deleted",
    });
    navigate('/chats');
  };

  const handleSendMessage = (content: string, type: 'text' | 'voice' = 'text', replyToId?: string) => {
    if (!id) return;
    
    sendMessage(
      { 
        chatId: id, 
        content, 
        type,
        replyTo: replyToId 
      }, 
      {
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
          toast({
            variant: "destructive",
            title: "Error",
            description: errorMessage,
          });
        }
      }
    );
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (isAddingReaction) return;
    addReaction({ messageId, emoji });
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    if (isRemovingReaction) return;
    removeReaction({ messageId, emoji });
  };

  const handleReply = (messageId: string) => {
    const message = chat?.messages?.find(m => m.id === messageId);
    if (message) {
      setReplyTo(message);
    }
  };

  const handleForward = (messageId: string) => {
    const message = chat?.messages?.find(m => m.id === messageId);
    if (message) {
      setForwardMessage(message);
      setShowForwardDialog(true);
    }
  };

  const handleForwardToChat = async (targetChatId: string) => {
    if (!forwardMessage) return;
    
    sendMessage(
      {
        chatId: targetChatId,
        content: forwardMessage.content,
        type: forwardMessage.type || 'text',
      },
      {
        onSuccess: () => {
          setShowForwardDialog(false);
          setForwardMessage(null);
          toast({
            title: "Message forwarded",
            description: "Message has been forwarded successfully",
          });
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Failed to forward message';
          toast({
            variant: "destructive",
            title: "Error",
            description: errorMessage,
          });
        }
      }
    );
  };

  const handleStartTempChat = () => {
    if (!otherParticipant) return;
    setShowTempChat(true);
  };

  const formatMessageTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'p');
    } catch (e) {
      return timestamp;
    }
  };

  const { isOnline: networkIsOnline } = useNetworkStatus();

  if (!networkIsOnline) {
    return (
      <div className="wispa-container flex items-center justify-center h-full">
        <p className="text-destructive">You are offline. Chat is unavailable.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="wispa-container flex items-center justify-center">
        <p>Loading conversation...</p>
      </div>
    );
  }

  if (isError || !chat) {
    const errorMessage = error instanceof Error ? error.message : 'Conversation not found';
    // Log the error for audit trail
    if (error) {
      // Could add integration with Sentry or external tool here
      console.error("Chat loading error:", error);
    }
    return (
      <div className="wispa-container flex flex-col items-center justify-center space-y-4">
        <p className="text-red-600">{errorMessage}</p>
        <Link 
          to="/chats" 
          className="text-wispa-500 hover:text-wispa-600"
        >
          Return to chats
        </Link>
      </div>
    );
  }

  const otherTypingUsers = typingUsers.filter(id => id !== user?.id);

  return (
    <div className="wispa-container">
      <header className="wispa-header">
        <div className="flex items-center">
          <Link to="/chats" className="mr-3">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Avatar src={otherParticipant?.profile?.avatar_url || undefined} alt={otherParticipant?.profile?.username || ''} status={otherParticipant ? (isOnline(otherParticipant.user_id) ? "online" : "offline") : null} />
          <div className="ml-3">
            <h2 className="font-medium flex items-center">
              {otherParticipant?.profile?.username}
              {isOnline(otherParticipant?.user_id ?? '') && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-600">Online</span>
              )}
            </h2>
            <p className="text-xs text-wispa-100">
              {otherTypingUsers.length > 0 ? 'Typing...' : (isOnline(otherParticipant?.user_id ?? '') ? "Active now" : "Last seen recently")}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartTempChat}
            className="p-2 rounded-full hover:bg-wispa-600 text-wispa-100"
            title="Start temporary chat"
          >
            <Clock className="h-5 w-5" />
          </Button>
          
          <button 
            onClick={() => handleCall('audio')}
            className="p-2 rounded-full hover:bg-wispa-600"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button 
            onClick={() => handleCall('video')}
            className="p-2 rounded-full hover:bg-wispa-600"
          >
            <Video className="h-5 w-5" />
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-wispa-600">
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4 mr-2" />
                Add to contacts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchiveChat}>
                <Archive className="h-4 w-4 mr-2" />
                Archive chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBlockUser} className="text-red-600">
                Block user
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteChat} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {!chat.messages || chat.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {chat.messages.map(message => (
              <div
                key={message.id}
                data-message-id={message.user_id !== user?.id ? message.id : undefined}
              >
                <ChatBubble
                  messageId={message.id}
                  content={message.type === 'voice' ? message.media_url || '' : message.content}
                  timestamp={formatMessageTimestamp(message.created_at)}
                  isOwnMessage={message.user_id === user?.id}
                  status={message.status}
                  type={message.type}
                  reactions={message.reactions || []}
                  currentUserId={user?.id}
                  reply_to_message={message.reply_to_message}
                  onAddReaction={handleAddReaction}
                  onRemoveReaction={handleRemoveReaction}
                  onReply={handleReply}
                  onForward={handleForward}
                />
              </div>
            ))}
            
            {otherTypingUsers.length > 0 && (
              <div className="flex items-center space-x-2 text-gray-500 text-sm">
                <div className="animate-bounce">•</div>
                <div className="animate-bounce delay-100">•</div>
                <div className="animate-bounce delay-200">•</div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput
        onSendMessage={handleSendMessage}
        onStartTyping={() => setTyping(true)}
        onStopTyping={() => setTyping(false)}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        disabled={isSending}
      />
      
      {showForwardDialog && (
        <ForwardMessageDialog 
          message={forwardMessage}
          onClose={() => setShowForwardDialog(false)}
          onForward={handleForwardToChat}
        />
      )}

      {/* Temporary Chat Interface */}
      {otherParticipant && (
        <TempChatInterface
          chatId={id || ''}
          isOpen={showTempChat}
          onClose={() => setShowTempChat(false)}
        />
      )}
    </div>
  );
};

export default ChatDetail;
