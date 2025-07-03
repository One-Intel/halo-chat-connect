
import { Json } from "@/integrations/supabase/types";

export interface StatusUser {
  username: string;
  avatar_url: string | null;
}

export interface StatusMedia {
  id: string;
  media_url: string;
  media_type: string;
  position: number;
}

export interface StatusComment {
  id: string;
  status_id: string;
  user_id: string;
  content: string;
  reply_to_comment_id?: string;
  created_at: string;
  updated_at: string;
  user: StatusUser;
  replies?: StatusComment[];
  reactions?: Record<string, string[]>;
}

export interface StatusUpdate {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  expires_at: string;
  is_public: boolean;
  privacy_level: 'public' | 'friends';
  comment_count: number;
  share_count: number;
  reactions: Record<string, string[]>;
  views: string[];
  viewCount: number;
  user: StatusUser;
  comments?: StatusComment[];
  shares?: string[];
  media?: StatusMedia[];
}

export interface TempChatSession {
  id: string;
  chat_id: string;
  created_by: string;
  timer_minutes: number;
  started_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface TempMessage {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  created_at: string;
  expires_at: string;
  user?: StatusUser;
}
