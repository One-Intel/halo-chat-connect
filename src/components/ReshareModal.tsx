
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusUpdate } from '@/types/status';
import { useCreateStatus } from '@/services/statusService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Share } from 'lucide-react';
import Avatar from './Avatar';
import { formatDistanceToNow } from 'date-fns';

interface ReshareModalProps {
  originalStatus: StatusUpdate;
  onClose: () => void;
  onReshare: () => void;
}

const ReshareModal: React.FC<ReshareModalProps> = ({
  originalStatus,
  onClose,
  onReshare
}) => {
  const [content, setContent] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<'public' | 'friends'>('public');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const createStatus = useCreateStatus();

  const handleReshare = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Create a new status with reshare content
      const reshareContent = content.trim() 
        ? `${content}\n\n--- Reshared from @${originalStatus.user?.username} ---\n${originalStatus.content || ''}`
        : `--- Reshared from @${originalStatus.user?.username} ---\n${originalStatus.content || ''}`;

      await createStatus.mutateAsync({
        content: reshareContent,
        mediaUrls: originalStatus.media?.map(m => ({
          url: m.media_url,
          type: m.media_type
        })) || [],
        privacyLevel,
        isPublic: privacyLevel === 'public',
      });
      
      toast({
        title: 'Success',
        description: 'Status reshared successfully',
      });
      
      onReshare();
    } catch (error) {
      console.error('Failed to reshare status:', error);
      toast({
        title: 'Error',
        description: 'Failed to reshare status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Reshare Status
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Add your comment (optional)</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add your thoughts..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Privacy</label>
            <div className="flex gap-2 mt-1">
              <Button
                variant={privacyLevel === 'public' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPrivacyLevel('public')}
              >
                Public
              </Button>
              <Button
                variant={privacyLevel === 'friends' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPrivacyLevel('friends')}
              >
                Friends
              </Button>
            </div>
          </div>

          {/* Original Status Preview */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Avatar 
                src={originalStatus.user?.avatar_url} 
                alt={originalStatus.user?.username || 'User'} 
                size="sm"
              />
              <div>
                <span className="text-sm font-medium">
                  {originalStatus.user?.username || 'Anonymous'}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {formatDistanceToNow(new Date(originalStatus.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            
            {originalStatus.content && (
              <p className="text-sm mb-2">{originalStatus.content}</p>
            )}
            
            {originalStatus.media && originalStatus.media.length > 0 && (
              <div className="grid grid-cols-2 gap-1">
                {originalStatus.media.slice(0, 4).map((media, index) => (
                  <div key={media.id} className="relative aspect-square rounded overflow-hidden bg-gray-100">
                    {media.media_type === 'image' ? (
                      <img 
                        src={media.media_url} 
                        alt={`Media ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video 
                        src={media.media_url} 
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReshare}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reshare
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReshareModal;
