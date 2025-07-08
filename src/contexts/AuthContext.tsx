
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, userId?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Handle profile creation/update after authentication
  const handleProfileCreation = async (user: User, username?: string, userId?: string) => {
    try {
      console.log('Handling profile creation for user:', user.id);
      
      // Check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, user_id, username')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing profile:', fetchError);
        throw new Error('Failed to check existing profile');
      }

      if (!existingProfile) {
        console.log('Creating new profile for user:', user.id);
        
        // Generate a unique 6-digit ID if not provided
        let actualUserId = userId;
        let attempts = 0;
        const maxAttempts = 5;

        // Keep trying until we find a unique ID or hit max attempts
        while (!actualUserId && attempts < maxAttempts) {
          const candidateId = Math.floor(100000 + Math.random() * 900000).toString();
          
          // Check if the ID is unique
          const { data: existingUserId, error: idCheckError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', candidateId)
            .maybeSingle();
            
          if (idCheckError) {
            console.error('Error checking user ID uniqueness:', idCheckError);
            continue; // Try another ID
          }
          
          if (!existingUserId) {
            actualUserId = candidateId;
            break;
          }
          
          attempts++;
        }
        
        if (!actualUserId) {
          throw new Error('Could not generate a unique user ID. Please try again.');
        }
        
        // Make sure we have required fields
        if (!user.id) {
          throw new Error('User ID is required');
        }

        if (!actualUserId) {
          throw new Error('User ID (6-digit) is required');
        }

        const displayUsername = username || 
          user.user_metadata?.username || 
          user.user_metadata?.full_name || 
          user.email?.split('@')[0] || 
          'User';

        // Prepare profile data exactly matching the profiles table schema
        const profileData = {
          id: user.id,               // UUID from auth
          user_id: actualUserId,     // 6-digit ID
          username: displayUsername,  // Display name
          avatar_url: user.user_metadata?.avatar_url || null,
          updated_at: new Date().toISOString()
        };

        console.log('Creating profile with data:', profileData);
        
        try {
          // Try inserting the profile
          const { error: insertError } = await supabase
            .from('profiles')
            .upsert([profileData], {
              onConflict: 'id',
              ignoreDuplicates: false
            });

          if (insertError) {
            // If it's not a duplicate error, throw it
            if (!insertError.message?.includes('duplicate')) {
              throw insertError;
            }
            
            // If it's a duplicate, try updating instead
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                user_id: profileData.user_id,
                username: profileData.username,
                avatar_url: profileData.avatar_url,
                updated_at: profileData.updated_at
              })
              .eq('id', user.id);
              
            if (updateError) {
              throw updateError;
            }
          }
        } catch (error) {
          console.error('Error saving profile:', error);
          throw new Error('Failed to save user profile. Please try again.');
        }
        
        console.log('Profile created successfully');
        return true;
      }
      
      console.log('Profile already exists for user:', user.id);
      return false;
    } catch (error: any) {
      console.error('Error in handleProfileCreation:', error);
      throw error; // Re-throw to handle in the signup flow
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (mounted) {
          console.log('Initial session check:', session?.user?.id || 'No session');
          setSession(session);
          setUser(session?.user ?? null);
          
          // Handle profile creation for existing session
          if (session?.user) {
            setTimeout(() => {
              handleProfileCreation(session.user);
            }, 100);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id || 'No session');
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Handle profile creation for new sessions
          if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            setTimeout(() => {
              handleProfileCreation(session.user);
            }, 100);
          }
          
          // Only set loading to false after we've processed the auth change
          if (event === 'SIGNED_OUT' || session) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, username: string, userId?: string) => {
    try {
      setLoading(true);
      
      console.log('Starting signup process for:', email);
      
      // First validate the input
      if (!email || !password || !username) {
        throw new Error('Email, password and username are required');
      }

      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            user_id: userId
          }
        }
      });

      if (error) throw error;
      
      if (!data.user) {
        throw new Error('User creation failed');
      }

      if (data.session) {
        // User is immediately signed in (email confirmation disabled)
        console.log('User signed up and logged in immediately');
        
        try {
          await handleProfileCreation(data.user, username, userId);
          
          // Get the actual user_id from the profile creation
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('id', data.user.id)
            .single();

          toast({
            title: "Account created successfully",
            description: `Welcome to WispaChat! Your user ID: ${profile?.user_id || userId}`,
          });
          
          // Navigate programmatically using window.location instead of useNavigate
          window.location.href = '/chats';
        } catch (profileError: any) {
          // If profile creation fails, sign out the user and show error
          await supabase.auth.signOut();
          throw new Error('Failed to create user profile. Please try again.');
        }
      } else {
        // Email confirmation required
        console.log('User signed up, email confirmation required');
        
        // Still try to create the profile
        try {
          await handleProfileCreation(data.user, username, userId);
        } catch (profileError) {
          console.error('Profile creation failed during email verification flow:', profileError);
          // Don't block the signup process in this case
        }
        
        toast({
          title: "Account created successfully",
          description: "Please check your email to confirm your account before signing in.",
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.message?.includes('password')) {
        errorMessage = error.message;
      } else if (error.message?.includes('email')) {
        errorMessage = 'Invalid email address or email already registered';
      } else if (error.message?.includes('profile')) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error creating account",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      console.log('Starting signin process for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      console.log('User signed in successfully');
      
      // Navigation will be handled by auth state change listener
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
    } catch (error: any) {
      console.error('Signin error:', error);
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('User signed out successfully');
      // Navigate using window.location instead of useNavigate
      window.location.href = '/auth';
    } catch (error: any) {
      console.error('Signout error:', error);
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const value = {
    session,
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
