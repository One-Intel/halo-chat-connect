import React, { useState, useEffect } from 'react';
import { Clock, X, Send, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTempSession, useTempSession, useTempMessages, useSendTempMessage, useEndTempSession } from '@/services/tempChatService';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from './Avatar';
import { formatDistanceToNow } from 'date-fns';
interface TempChatInterfaceProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
}
const TempChatInterface: React.FC<TempChatInterfaceProps> = ({
  chatId,
  isOpen,
  onClose
}) => {
  const {
    user
  } = useAuth();
  const {
    data: session
  } = useTempSession(chatId);
  const {
    data: messages = []
  } = useTempMessages(session?.id || '');
  const createSession = useCreateTempSession();
  const sendMessage = useSendTempMessage();
  const endSession = useEndTempSession();
  const [newMessage, setNewMessage] = useState('');
  const [timerMinutes, setTimerMinutes] = useState(1);
  const [showSessionDialog, setShowSessionDialog] = useState(false);

  // Calculate time remaining for session
  const [timeRemaining, setTimeRemaining] = useState(0);
  useEffect(() => {
    if (session && session.is_active) {
      const updateTimer = () => {
        const remaining = Math.max(0, new Date(session.expires_at).getTime() - Date.now());
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          // Session expired
          endSession.mutate(session.id);
        }
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [session, endSession]);
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  const handleStartSession = async () => {
    try {
      await createSession.mutateAsync({
        chatId,
        timerMinutes
      });
      setShowSessionDialog(false);
    } catch (error) {
      console.error('Failed to start temp session:', error);
    }
  };
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !session) return;
    try {
      await sendMessage.mutateAsync({
        sessionId: session.id,
        content: newMessage,
        timerMinutes: session.timer_minutes
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send temp message:', error);
    }
  };
  const handleEndSession = async () => {
    if (session) {
      await endSession.mutateAsync(session.id);
      onClose();
    }
  };

  // Show session setup dialog if no active session
  if (!session || !session.is_active) {
    return <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Start Temporary Chat
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Temporary Chat Rules:</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>Messages auto-delete after the timer expires</li>
                    <li>Cannot forward temporary messages</li>
                    <li>Chat history is completely erased when closed</li>
                    <li>All participants will see the timer</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Message Timer
              </label>
              <Select value={timerMinutes.toString()} onValueChange={v => setTimerMinutes(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleStartSession} disabled={createSession.isPending} className="flex-1">
                Start Temporary Chat
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>;
  }
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg h-[600px] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-orange-50">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <div>
              <h3 className="font-semibold">Temporary Chat</h3>
              <p className="text-sm text-orange-600">
                Time remaining: {formatTime(timeRemaining)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" onClick={handleEndSession}>
              End Session
            </Button>
            
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => {
          const isOwnMessage = message.user_id === user?.id;
          const timeLeft = Math.max(0, new Date(message.expires_at).getTime() - Date.now());
          return <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                  <div className={`rounded-lg p-3 ${isOwnMessage ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <p>{message.content}</p>
                    <div className={`text-xs mt-1 flex items-center justify-between ${isOwnMessage ? 'text-orange-100' : 'text-gray-500'}`}>
                      <span>{formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true
                    })}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>;
        })}
          
          {messages.length === 0 && <div className="text-center text-gray-500 py-8">
              <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No messages yet. Start the conversation!</p>
              <p className="text-sm mt-1">Messages will disappear after {session.timer_minutes} minute(s)</p>
            </div>}
        </div>
        
        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a temporary message..." className="flex-1" disabled={timeRemaining <= 0} />
            <Button type="submit" disabled={!newMessage.trim() || sendMessage.isPending || timeRemaining <= 0}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Messages disappear in {session.timer_minutes} minute(s) • Cannot be forwarded
          </p>
        </form>
      </DialogContent>
    </Dialog>;
};
export default TempChatInterface;