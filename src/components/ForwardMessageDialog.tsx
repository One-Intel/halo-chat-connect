
import React, { useState } from 'react';
import { useChats } from '@/services/chatService';
import { useAuth } from '@/contexts/AuthContext';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Avatar from './Avatar';
import type { Message } from '@/services/chatService';

interface ForwardMessageDialogProps {
  message: Message | null;
  onClose: () => void;
  onForward: (chatId: string) => void;
}

export function ForwardMessageDialog({ message, onClose, onForward }: ForwardMessageDialogProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: chats = [] } = useChats();

  const filteredChats = chats.filter(chat => {
    const otherParticipant = chat.participants?.find(p => p.user_id !== user?.id);
    if (!otherParticipant?.profile) return false;
    
    return otherParticipant.profile.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Dialog open={!!message} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search chats..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredChats.map(chat => {
                const otherParticipant = chat.participants?.find(p => p.user_id !== user?.id);
                if (!otherParticipant?.profile) return null;

                return (
                  <button
                    key={chat.id}
                    onClick={() => onForward(chat.id)}
                    className="w-full flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Avatar src={otherParticipant.profile.avatar_url} />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{otherParticipant.profile.username}</p>
                      {chat.lastMessage && (
                        <p className="text-sm text-gray-500 truncate">
                          {chat.lastMessage.type === 'voice' ? 'Voice message' : chat.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
