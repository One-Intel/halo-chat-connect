
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ChatList from "./pages/ChatList";
import ChatDetail from "./pages/ChatDetail";
import NewChat from "./pages/NewChat";
import Profile from "./pages/Profile";
import ProfileStatusDashboard from "./pages/ProfileStatusDashboard";
import Friends from "./pages/Friends";
import Calls from "./pages/Calls";
import CallPage from "./pages/CallPage";
import Status from "./pages/Status";
import ArchivedChats from "./pages/ArchivedChats";
import NotFound from "./pages/NotFound";
import { useNotifications } from "./services/notificationService";
import { pushNotificationService } from "./services/pushNotificationService";
import React, { useEffect } from "react";

const queryClient = new QueryClient();

function AppContent() {
  // Initialize notifications - now inside AuthProvider and Router context
  useNotifications();

  // Initialize push notifications with error handling
  useEffect(() => {
    pushNotificationService.initialize().catch(error => {
      console.warn('Push notifications initialization failed:', error);
      // Don't block the app if push notifications fail
    });
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/chats"
        element={
          <ProtectedRoute>
            <ChatList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:chatId"
        element={
          <ProtectedRoute>
            <ChatDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/new-chat"
        element={
          <ProtectedRoute>
            <NewChat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/status"
        element={
          <ProtectedRoute>
            <ProfileStatusDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/friends"
        element={
          <ProtectedRoute>
            <Friends />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calls"
        element={
          <ProtectedRoute>
            <Calls />
          </ProtectedRoute>
        }
      />
      <Route
        path="/call/:callId"
        element={
          <ProtectedRoute>
            <CallPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/status"
        element={
          <ProtectedRoute>
            <Status />
          </ProtectedRoute>
        }
      />
      <Route
        path="/archived"
        element={
          <ProtectedRoute>
            <ArchivedChats />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
