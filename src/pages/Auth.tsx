
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import logo from '/wispachat logo.jpg';

const Auth: React.FC = () => {
  const [currentView, setCurrentView] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // Simple form validity check for button states
  const isFormValid =
    email.trim() !== '' &&
    password.trim() !== '' &&
    (currentView === 'signin' || (username.trim() !== '' && confirmPassword.trim() !== '' && password === confirmPassword));
  
  const { user, signIn, signUp } = useAuth();

  // Generate a 6-digit user ID on component mount for signup
  useEffect(() => {
    generateUserID();
  }, []);

  // Generate a 6-digit user ID
  const generateUserID = () => {
    const newId = Math.floor(100000 + Math.random() * 900000).toString();
    setUserId(newId);
    return newId;
  };

  // Redirect if already logged in
  if (user) {
    console.log('Auth page - User already logged in, redirecting to chats');
    return <Navigate to="/chats" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (currentView === "signup") {
        if (password !== confirmPassword) {
          toast({
            title: "Password Mismatch",
            description: "Passwords do not match. Please try again.",
            variant: "destructive"
          });
          return;
        }
        console.log('Auth page - Starting signup process');
        await signUp(email, password, username, userId);
      } else {
        console.log('Auth page - Starting signin process');
        await signIn(email, password);
      }
    } catch (error) {
      console.error("Authentication error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuthClick = () => {
    toast({
      title: "Google Sign-in Coming Soon",
      description: "Google authentication is currently in development. Please use email and password for now.",
      variant: "default"
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (currentView === 'signin') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-12">
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <img src={logo} alt="WispaChat" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-semibold text-primary">WispaChat</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 pl-12 py-4 rounded-2xl"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 pl-12 pr-12 py-4 rounded-2xl"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(!!checked)}
                  className="border-gray-600"
                />
                <label htmlFor="remember" className="text-sm text-gray-300">
                  Remember me
                </label>
              </div>
              <button type="button" className="text-sm text-gray-400 hover:text-white">
                Forgot password
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl text-lg font-semibold mt-6"
            >
              {loading ? 'Signing in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-gray-900 text-gray-400">Or</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleAuthClick}
                disabled
                className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700 py-4 rounded-2xl opacity-50"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled
                className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700 py-4 rounded-2xl opacity-50"
              >
                <svg className="w-5 h-5 mr-3" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <span className="text-gray-400">Don't have an account? </span>
            <button
              type="button"
              onClick={() => setCurrentView('signup')}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Create an account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-12">
        <button 
          onClick={() => setCurrentView('signin')}
          className="p-2 rounded-full hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-3">
          <img src={logo} alt="WispaChat" className="w-8 h-8 rounded-lg" />
          <span className="text-lg font-semibold text-primary">WispaChat</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2 text-center">Sign up and Improve Your Chat Today</h1>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 pl-12 py-4 rounded-2xl"
              required
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 pl-12 py-4 rounded-2xl"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 pl-12 pr-12 py-4 rounded-2xl"
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Enter your confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 pl-12 pr-12 py-4 rounded-2xl"
              required
            />
            <button
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-gray-300">Your User ID</label>
              <button 
                type="button" 
                onClick={generateUserID} 
                className="text-xs text-primary hover:text-primary/80"
              >
                Generate New
              </button>
            </div>
            <Input 
              type="text" 
              value={userId}
              readOnly
              className="bg-gray-700 border-gray-600 text-white text-center font-mono py-4 rounded-2xl"
            />
            <p className="text-xs text-gray-400 text-center">
              Save your user ID. You'll need it to connect with friends.
            </p>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <Checkbox 
              id="remember-signup" 
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(!!checked)}
              className="border-gray-600"
            />
            <label htmlFor="remember-signup" className="text-sm text-gray-300">
              Remember me
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl text-lg font-semibold mt-6"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>
        </form>

        <div className="mt-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-gray-900 text-gray-400">Or</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleAuthClick}
              disabled
              className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700 py-4 rounded-2xl opacity-50"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled
              className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700 py-4 rounded-2xl opacity-50"
            >
              <svg className="w-5 h-5 mr-3" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <span className="text-gray-400">Already have an account? </span>
          <button
            type="button"
            onClick={() => setCurrentView('signin')}
            className="text-primary hover:text-primary/80 font-medium"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
