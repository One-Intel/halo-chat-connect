
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusUpdate } from '@/types/status';
import { useUpdateStatus, useDeleteStatus } from '@/services/statusService';
import { toast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';

interface EditStatusModalProps {
  status: StatusUpdate;
  onClose: () => void;
  onUpdate: () => void;
}

const EditStatusModal: React.FC<EditStatusModalProps> = ({
  status,
  onClose,
  onUpdate
}) => {
  const [content, setContent] = useState(status.content || '');
  const [isLoading, setIsLoading] = useState(false);
  
  const updateStatus = useUpdateStatus();
  const deleteStatus = useDeleteStatus();

  const handleUpdate = async () => {
    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Status content cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await updateStatus.mutateAsync({
        statusId: status.id,
        content: content.trim(),
      });
      
      toast({
        title: 'Success',
        description: 'Status updated successfully',
      });
      
      onUpdate();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this status?')) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteStatus.mutateAsync(status.id);
      
      toast({
        title: 'Success',
        description: 'Status deleted successfully',
      });
      
      onUpdate();
    } catch (error) {
      console.error('Failed to delete status:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Status</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="mt-1"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {content.length}/500 characters
            </p>
          </div>

          {/* Show media preview if exists */}
          {status.media && status.media.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Media (cannot be edited)</label>
              <div className="grid grid-cols-2 gap-2">
                {status.media.map((media, index) => (
                  <div key={media.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
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
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              onClick={handleDelete}
              variant="destructive"
              size="sm"
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            
            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="outline"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={isLoading || !content.trim()}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditStatusModal;
