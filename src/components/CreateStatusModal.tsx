import React, { useState } from "react";
import { X, Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useCreateStatus } from "@/services/statusService";
import { uploadFile } from "@/services/fileUploadService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const CreateStatusModal = ({ user, onClose, onPost }) => {
  // Option type for post options
  type OptionType = '' | 'media' | 'gif' | 'poll' | 'adoption' | 'event' | 'notice';
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('friends');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showOptions, setShowOptions] = useState<OptionType>('');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const { user: authUser } = useAuth();
  const createStatus = useCreateStatus();

  // Handle multiple file uploads
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);
    
    // Create preview URLs for new files
    const newPreviewUrls = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);
  };

  // Remove specific file
  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    
    // Revoke the URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    
    setFiles(newFiles);
    setPreviewUrls(newPreviews);
  };

  // Handle post submission
  const handlePost = async () => {
    if (!authUser || (!files.length && !caption.trim())) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      let mediaUrls: string[] = [];
      
      // Upload files if any
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const uploaded = await uploadFile({
            bucket: 'status',
            file,
            userId: authUser.id,
            folder: 'posts'
          });
          mediaUrls.push(uploaded.url);
          setUploadProgress(((i + 1) / files.length) * 90); // 90% for upload, 10% for status creation
        }
      }
      
      // Create status
      await createStatus.mutateAsync({
        content: caption.trim() || undefined,
        mediaUrl: mediaUrls.length > 0 ? mediaUrls[0] : undefined, // For now, just use first media
        privacyLevel: visibility as 'public' | 'friends',
        isPublic: visibility === 'public'
      });
      
      setUploadProgress(100);
      
      toast({
        title: "Status posted!",
        description: "Your status has been shared successfully."
      });
      
      onClose();
    } catch (error) {
      console.error('Error posting status:', error);
      toast({
        title: "Error",
        description: "Failed to post status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-border flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
          <button onClick={onClose} className="text-xl text-muted-foreground hover:text-primary transition">&times;</button>
          <span className="font-semibold text-lg text-foreground">Create Post</span>
          <button
            onClick={handlePost}
            disabled={uploading || (!files.length && !caption.trim())}
            className={`rounded-full px-4 py-1 font-semibold text-sm ml-2 transition bg-primary text-primary-foreground hover:bg-primary/90 ${(!files.length && !caption.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uploading ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-1">
          {/* Avatar */}
          <div className="h-10 w-10">
            {/* You can use your Avatar component here if you want */}
            <img src={user?.avatar_url || '/placeholder.svg'} alt="avatar" className="h-10 w-10 rounded-full object-cover bg-gray-200" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{user?.username || 'You'}</span>
            {/* Optionally, add a badge or verification icon here */}
          </div>
        </div>

        {/* Caption Input */}
        <div className="px-4 pt-2 pb-1">
          <textarea
            className="w-full min-h-[60px] max-h-40 resize-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="What do you want to talk about?"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            autoFocus
          />
        </div>

        {/* File Previews */}
        {files.length > 0 && (
          <div className="px-4 pb-2">
            <div className="grid gap-2">
              {files.map((file, index) => (
                <div key={index} className="relative border rounded-lg overflow-hidden">
                  {file.type.startsWith('image') && (
                    <img 
                      src={previewUrls[index]} 
                      alt="preview" 
                      className="w-full max-h-48 object-cover" 
                    />
                  )}
                  {file.type.startsWith('video') && (
                    <video 
                      src={previewUrls[index]} 
                      controls 
                      className="w-full max-h-48 object-cover" 
                    />
                  )}
                  {file.type.startsWith('audio') && (
                    <div className="p-4 bg-muted">
                      <audio src={previewUrls[index]} controls className="w-full" />
                      <p className="text-sm text-muted-foreground mt-2">{file.name}</p>
                    </div>
                  )}
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="px-4 pb-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </div>
        )}

        {/* Media & Options */}
        <div className="px-4 pb-2">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={() => setShowOptions(showOptions === 'media' ? '' : 'media')}
              className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg bg-muted hover:bg-accent text-foreground text-xs font-medium border border-border transition"
            >
              <span role="img" aria-label="media" className="text-lg">🖼️</span>
              Photo/Video
            </button>
            <button
              onClick={() => setShowOptions(showOptions === 'gif' ? '' : 'gif')}
              className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg bg-muted hover:bg-accent text-foreground text-xs font-medium border border-border transition"
            >
              <span role="img" aria-label="gif" className="text-lg">GIF</span>
              GIF
            </button>
            <button
              onClick={() => setShowOptions(showOptions === 'poll' ? '' : 'poll')}
              className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg bg-muted hover:bg-accent text-foreground text-xs font-medium border border-border transition"
            >
              <span role="img" aria-label="poll" className="text-lg">📊</span>
              Poll
            </button>
            <button
              onClick={() => setShowOptions(showOptions === 'adoption' ? '' : 'adoption')}
              className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg bg-muted hover:bg-accent text-foreground text-xs font-medium border border-border transition"
            >
              <span role="img" aria-label="adoption" className="text-lg">📋</span>
              Adoption
            </button>
            <button
              onClick={() => setShowOptions(showOptions === 'event' ? '' : 'event')}
              className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg bg-muted hover:bg-accent text-foreground text-xs font-medium border border-border transition"
            >
              <span role="img" aria-label="event" className="text-lg">📅</span>
              Event
            </button>
            <button
              onClick={() => setShowOptions(showOptions === 'notice' ? '' : 'notice')}
              className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg bg-muted hover:bg-accent text-foreground text-xs font-medium border border-border transition"
            >
              <span role="img" aria-label="notice" className="text-lg">📢</span>
              Lost Notice
            </button>
          </div>
          {/* Option Inputs */}
          {showOptions === 'media' && (
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-muted file:text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can select multiple files (images, videos, audio)
              </p>
            </div>
          )}
          {showOptions === 'gif' && (
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="text"
                placeholder="Paste GIF URL or search..."
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
          )}
          {showOptions === 'poll' && (
            <div className="mt-2 flex flex-col gap-2">
              <input type="text" placeholder="Poll question..." className="w-full p-2 border rounded focus:ring-2 focus:ring-primary bg-background text-foreground" />
              <input type="text" placeholder="Option 1" className="w-full p-2 border rounded focus:ring-2 focus:ring-primary bg-background text-foreground" />
              <input type="text" placeholder="Option 2" className="w-full p-2 border rounded focus:ring-2 focus:ring-primary bg-background text-foreground" />
              {/* Add logic for more options if needed */}
            </div>
          )}
          {showOptions === 'adoption' && (
            <div className="mt-2 flex flex-col gap-2">
              <input type="text" placeholder="Adoption details..." className="w-full p-2 border rounded focus:ring-2 focus:ring-primary bg-background text-foreground" />
            </div>
          )}
          {showOptions === 'event' && (
            <div className="mt-2 flex flex-col gap-2">
              <input type="text" placeholder="Event details..." className="w-full p-2 border rounded focus:ring-2 focus:ring-primary bg-background text-foreground" />
            </div>
          )}
          {showOptions === 'notice' && (
            <div className="mt-2 flex flex-col gap-2">
              <input type="text" placeholder="Lost notice details..." className="w-full p-2 border rounded focus:ring-2 focus:ring-primary bg-background text-foreground" />
            </div>
          )}
        </div>

        {/* Visibility & Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/50 rounded-b-2xl">
          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="radio"
                value="friends"
                checked={visibility === 'friends'}
                onChange={() => setVisibility('friends')}
                className="accent-primary"
              />{' '}Friends
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="radio"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
                className="accent-primary"
              />{' '}Public
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStatusModal;
