
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import NavBar from '@/components/NavBar';
import { uploadFile, deleteFile } from '@/services/fileUploadService';

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        console.log('Fetching profile for user:', user.id);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url, user_id')
          .eq('id', user.id)
          .maybeSingle();

        console.log('Profile fetch result:', { data, error });

        if (error) {
          console.error('Error fetching profile:', error);
          throw error;
        }

        if (data) {
          console.log('Profile found:', data);
          setUsername(data.username || '');
          setAvatarUrl(data.avatar_url);
          setUserId(data.user_id || '');

          // If no user ID exists in profile, generate one
          if (!data.user_id) {
            const newId = Math.floor(100000 + Math.random() * 900000).toString();
            console.log('Generating new user ID:', newId);
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ user_id: newId })
              .eq('id', user.id);
              
            if (updateError) {
              console.error('Error updating user ID:', updateError);
            } else {
              setUserId(newId);
            }
          }
        } else {
          // No profile exists, create one
          console.log('No profile found, creating new one');
          
          const newId = Math.floor(100000 + Math.random() * 900000).toString();
          const defaultUsername = user.email?.split('@')[0] || 'User';
          
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: defaultUsername,
              user_id: newId,
              avatar_url: null
            })
            .select('*')
            .single();

          console.log('Profile creation result:', { newProfile, insertError });

          if (insertError) {
            console.error('Error creating profile:', insertError);
            throw insertError;
          }
          
          setUsername(defaultUsername);
          setUserId(newId);
          setAvatarUrl(null);
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user || !username.trim()) {
      toast({
        title: 'Error',
        description: 'Username is required',
        variant: 'destructive',
      });
      return;
    }
    
    setUpdating(true);
    try {
      console.log('Updating profile with:', { username: username.trim(), userId: user.id });
      
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (existingProfile) {
        // Profile exists, update it
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            username: username.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select('*')
          .maybeSingle();

        console.log('Profile update result:', { updatedProfile, updateError });

        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
      } else {
        // Profile doesn't exist, create it
        const newUserId = userId || Math.floor(100000 + Math.random() * 900000).toString();
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: username.trim(),
            user_id: newUserId,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .select('*')
          .single();

        console.log('Profile creation result:', { newProfile, insertError });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        
        setUserId(newUserId);
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: `Failed to update profile: ${error.message || 'Please try again.'}`,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);
    try {
      console.log('Uploading avatar for user:', user.id);
      
      // Delete existing avatar if it exists
      if (avatarUrl) {
        try {
          const oldPath = new URL(avatarUrl).pathname.split('/public/avatars/')[1];
          if (oldPath) {
            await deleteFile('avatars', oldPath);
          }
        } catch (e) {
          console.error("Could not parse or delete old avatar, proceeding with upload.", e);
        }
      }

      // Upload new image to storage using the service
      const { url: newAvatarUrl } = await uploadFile({
        bucket: 'avatars',
        file,
        userId: user.id
      });

      console.log('New avatar URL:', newAvatarUrl);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating avatar:', updateError);
        throw updateError;
      }

      setAvatarUrl(newAvatarUrl);
      
      toast({
        title: 'Success',
        description: 'Avatar updated successfully',
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Error',
        description: `Failed to update avatar: ${error.message || 'Please try again.'}`,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusDashboard = () => {
    navigate('/profile/status');
  };

  if (loading) {
    return (
      <div className="wispa-container flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="wispa-container">
      <header className="wispa-header">
        <div className="flex items-center">
          <Link to="/chats" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="font-medium">Profile</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="h-24 w-24 rounded-full object-cover border-2 border-wispa-500"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-wispa-500">
                <User className="h-12 w-12 text-gray-500" />
              </div>
            )}
            <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-wispa-500 rounded-full p-2 cursor-pointer hover:bg-wispa-600 transition-colors">
              <Camera className="h-4 w-4 text-white" />
              <input 
                type="file" 
                id="avatar-upload" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarChange} 
                disabled={updating}
              />
            </label>
          </div>

          <div className="text-center mb-2">
            <div className="p-2 bg-gray-100 rounded-lg mb-1">
              <p className="text-xs text-gray-500">Your WispaChat ID</p>
              <p className="font-mono font-bold">{userId}</p>
            </div>
            <p className="text-xs text-gray-500">
              This ID is unique to your account and can be shared with friends
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={updating}
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              value={user?.email || ''}
              disabled={true}
              className="bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
          </div>

          <Button
            onClick={handleUpdateProfile}
            disabled={updating || !username.trim()}
            className="w-full bg-wispa-500 hover:bg-wispa-600"
          >
            {updating ? 'Updating...' : 'Update Profile'}
          </Button>

          <Button
            onClick={() => signOut()}
            variant="outline"
            className="w-full"
          >
            Sign Out
          </Button>
        </div>

        <div className="mt-8 flex justify-center">
          <Button 
            onClick={handleStatusDashboard}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 py-2 shadow-lg"
          >
            My Status Dashboard
          </Button>
        </div>
      </div>

      <NavBar />
    </div>
  );
};

export default Profile;
