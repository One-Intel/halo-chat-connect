
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  
  console.log('ProtectedRoute - user:', user?.id, 'loading:', loading);
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 text-wispa-500 animate-spin" />
          <span className="text-wispa-500 text-sm">Loading...</span>
        </div>
      </div>
    );
  }
  
  // Redirect to auth if not authenticated
  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }
  
  // Allow access to protected routes
  console.log('ProtectedRoute - User authenticated, allowing access');
  return <>{children}</>;
}
