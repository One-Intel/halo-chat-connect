
import React, { useState } from 'react';
import { User, MessageSquare, UserMinus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Avatar from '@/components/Avatar';
import { toast } from '@/components/ui/use-toast';
import { useRemoveFriend } from '@/services/friendService';
import { useNavigate } from 'react-router-dom';

interface UserCardProps {
  user: {
    id: string;
    username?: string | null;
    avatar_url?: string | null;
    user_id?: string | null;
    status?: string;
    last_seen?: string;
  };
  isFriend?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ user, isFriend = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { mutate: removeFriend, isPending: isRemoving } = useRemoveFriend();

  const handleStartChat = () => {
    navigate(`/chat/${user.id}`);
  };

  const handleRemoveFriend = async () => {
    try {
      await removeFriend({ friendId: user.id });
      toast({
        title: 'Friend removed',
        description: `${user.username} has been removed from your friends list.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove friend. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="w-full mb-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Avatar 
              src={user.avatar_url || undefined} 
              alt={user.username || 'User'} 
              size="lg" 
            />
            <div>
              <CardTitle className="text-lg font-semibold">
                {user.username || 'Unknown User'}
              </CardTitle>
              {!isExpanded && (
                <CardDescription className="text-sm text-muted-foreground">
                  {user.status || 'Offline'}
                </CardDescription>
              )}
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <User className="h-4 w-4 mr-2" />
                <span>User ID: {user.user_id || 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <span>Status: {user.status || 'Offline'}</span>
                </div>
              </div>
              {user.last_seen && (
                <div className="text-sm text-muted-foreground">
                  Last seen: {new Date(user.last_seen).toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2 p-4">
            {isFriend && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartChat}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveFriend}
                  disabled={isRemoving}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remove Friend
                </Button>
              </>
            )}
          </CardFooter>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default UserCard;
