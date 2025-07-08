
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, AlertCircle, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Avatar from '@/components/Avatar';
import EmptyState from '@/components/EmptyState';
import { toast } from '@/components/ui/use-toast';
import { useSearchUsers, useCreateChat } from '@/services/chatService';
import { useSendFriendRequest, useFriendshipStatus } from '@/services/friendService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const NewChat: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [lastCreatedUserId, setLastCreatedUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const { 
    data: users = [], 
    isLoading,
    error,
    refetch
  } = useSearchUsers(debouncedQuery);
  
  const { 
    mutate: createChat, 
    isPending: isCreatingChat 
  } = useCreateChat();

  const {
    mutate: sendFriendRequest,
    isPending: isSendingRequest
  } = useSendFriendRequest();

  const handleSelectUser = async (userId: string) => {
    if (isCreatingChat || lastCreatedUserId === userId) return;
    setLastCreatedUserId(userId);
    
    createChat(
      { participantIds: [userId] },
      {
        onSuccess: async (chatId) => {
          setLastCreatedUserId(null);
          navigate(`/chat/${chatId}`);
        },
        onError: (error) => {
          setLastCreatedUserId(null);
          toast({
            title: "Error creating chat",
            description: error.message,
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleSendFriendRequest = (userId: string) => {
    if (isSendingRequest) return;

    sendFriendRequest(
      { recipientId: userId },
      {
        onSuccess: () => {
          toast({
            title: "Friend request sent",
            description: "They'll be notified of your request",
          });
        },
        onError: (error) => {
          toast({
            title: "Error sending friend request",
            description: error.message,
            variant: "destructive"
          });
        }
      }
    );
  };

  // For debugging purposes
  useEffect(() => {
    if (error) {
      console.error("Search error:", error);
    }
  }, [error]);

  return (
    <div className="wispa-container">
      <header className="wispa-header">
        <div className="flex items-center">
          <Link to="/chats" className="mr-3">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="font-medium">New Chat</h2>
        </div>
      </header>
      
      <div className="p-3 bg-white border-b">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            placeholder="Search users by username or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p>Searching users...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 text-red-500">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>Error finding users. Please try again.</p>
            <button 
              onClick={() => refetch()} 
              className="mt-2 px-4 py-2 bg-wispa-500 text-white rounded"
            >
              Retry
            </button>
          </div>
        ) : users.length > 0 ? (
          users.map(userResult => (
            <div
              key={userResult.id}
              className="w-full px-4 py-3 border-b flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center">
                <Avatar src={userResult.avatar_url || undefined} alt={userResult.username || ''} status={null} />
                <div className="ml-3 text-left">
                  <h3 className="font-medium">{userResult.username}</h3>
                  <p className="text-xs text-gray-500">ID: {userResult.user_id}</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleSelectUser(userResult.id)}
                  disabled={isCreatingChat}
                  className="bg-wispa-500 hover:bg-wispa-600"
                  size="sm"
                >
                  Chat
                </Button>
                
                <FriendRequestButton userId={userResult.id} onSendRequest={handleSendFriendRequest} />
              </div>
            </div>
          ))
        ) : debouncedQuery ? (
          <EmptyState
            title="No users found"
            description="Try searching with a different username or ID"
            icon={<UserPlus className="h-12 w-12 mb-4 text-wispa-500" />}
          />
        ) : (
          <EmptyState
            title="Search for users"
            description="Enter a username or user ID to find people to chat with"
          />
        )}
      </div>
    </div>
  );
};

// Helper component to show the appropriate friend request button
const FriendRequestButton: React.FC<{ userId: string, onSendRequest: (userId: string) => void }> = ({ userId, onSendRequest }) => {
  const { data: status, isLoading } = useFriendshipStatus(userId);
  
  if (isLoading) {
    return (
      <Button size="sm" variant="outline" disabled>
        Loading...
      </Button>
    );
  }
  
  if (status?.isFriend) {
    return (
      <Button size="sm" variant="outline" disabled>
        Friend
      </Button>
    );
  }
  
  if (status?.hasPendingRequest) {
    return (
      <Button size="sm" variant="outline" disabled>
        {status.pendingRequestDirection === 'outgoing' ? 'Request Sent' : 'Request Received'}
      </Button>
    );
  }
  
  return (
    <Button 
      size="sm"
      variant="outline"
      onClick={(e) => {
        e.stopPropagation();
        onSendRequest(userId);
      }}
    >
      <UserPlus className="h-4 w-4 mr-1" /> Add Friend
    </Button>
  );
};

export default NewChat;
