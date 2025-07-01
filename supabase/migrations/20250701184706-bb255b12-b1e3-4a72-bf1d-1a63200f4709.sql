
-- Enhanced Status System Tables

-- Status Comments Table
CREATE TABLE public.status_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES public.status_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  reply_to_comment_id uuid REFERENCES public.status_comments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Comment Reactions Table
CREATE TABLE public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.status_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji varchar(10) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comment_reactions_comment_id_user_id_key UNIQUE (comment_id, user_id)
);

-- Status Shares Table
CREATE TABLE public.status_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES public.status_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT status_shares_status_id_user_id_key UNIQUE (status_id, user_id)
);

-- Temporary Chat Sessions Table
CREATE TABLE public.temp_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timer_minutes integer NOT NULL DEFAULT 1,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Temporary Messages Table (auto-deleted)
CREATE TABLE public.temp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.temp_chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Add columns to existing status_updates table
ALTER TABLE public.status_updates 
ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS privacy_level text DEFAULT 'public' CHECK (privacy_level IN ('public', 'friends'));

-- Indexes for performance
CREATE INDEX idx_status_comments_status_id ON public.status_comments(status_id);
CREATE INDEX idx_status_comments_user_id ON public.status_comments(user_id);
CREATE INDEX idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX idx_status_shares_status_id ON public.status_shares(status_id);
CREATE INDEX idx_temp_chat_sessions_chat_id ON public.temp_chat_sessions(chat_id);
CREATE INDEX idx_temp_messages_session_id ON public.temp_messages(session_id);
CREATE INDEX idx_temp_messages_expires_at ON public.temp_messages(expires_at);

-- Row Level Security Policies

-- Status Comments Policies
ALTER TABLE public.status_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert comment if can view status" ON public.status_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.status_updates su 
      WHERE su.id = status_id 
      AND (su.is_public OR su.user_id = auth.uid() OR 
           (su.privacy_level = 'friends' AND public.are_friends(su.user_id, auth.uid())))
    )
  );

CREATE POLICY "Allow select comments if can view status" ON public.status_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.status_updates su 
      WHERE su.id = status_id 
      AND (su.is_public OR su.user_id = auth.uid() OR 
           (su.privacy_level = 'friends' AND public.are_friends(su.user_id, auth.uid())))
    )
  );

CREATE POLICY "Allow update own comments" ON public.status_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow delete own comments" ON public.status_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Comment Reactions Policies
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert reaction if can view comment" ON public.comment_reactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.status_comments sc
      JOIN public.status_updates su ON su.id = sc.status_id
      WHERE sc.id = comment_id 
      AND (su.is_public OR su.user_id = auth.uid() OR 
           (su.privacy_level = 'friends' AND public.are_friends(su.user_id, auth.uid())))
    )
  );

CREATE POLICY "Allow select reactions if can view comment" ON public.comment_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.status_comments sc
      JOIN public.status_updates su ON su.id = sc.status_id
      WHERE sc.id = comment_id 
      AND (su.is_public OR su.user_id = auth.uid() OR 
           (su.privacy_level = 'friends' AND public.are_friends(su.user_id, auth.uid())))
    )
  );

CREATE POLICY "Allow delete own reaction" ON public.comment_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Status Shares Policies
ALTER TABLE public.status_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert share if can view status" ON public.status_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.status_updates su 
      WHERE su.id = status_id 
      AND (su.is_public OR su.user_id = auth.uid() OR 
           (su.privacy_level = 'friends' AND public.are_friends(su.user_id, auth.uid())))
    )
  );

CREATE POLICY "Allow select shares if can view status" ON public.status_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.status_updates su 
      WHERE su.id = status_id 
      AND (su.is_public OR su.user_id = auth.uid() OR 
           (su.privacy_level = 'friends' AND public.are_friends(su.user_id, auth.uid())))
    )
  );

-- Temporary Chat Sessions Policies
ALTER TABLE public.temp_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert temp session if chat participant" ON public.temp_chat_sessions
  FOR INSERT WITH CHECK (public.is_user_chat_participant(chat_id, auth.uid()));

CREATE POLICY "Allow select temp sessions if chat participant" ON public.temp_chat_sessions
  FOR SELECT USING (public.is_user_chat_participant(chat_id, auth.uid()));

CREATE POLICY "Allow update temp sessions if creator" ON public.temp_chat_sessions
  FOR UPDATE USING (auth.uid() = created_by);

-- Temporary Messages Policies
ALTER TABLE public.temp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert temp message if session participant" ON public.temp_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.temp_chat_sessions tcs
      WHERE tcs.id = session_id 
      AND public.is_user_chat_participant(tcs.chat_id, auth.uid())
      AND tcs.is_active = true
    )
  );

CREATE POLICY "Allow select temp messages if session participant" ON public.temp_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.temp_chat_sessions tcs
      WHERE tcs.id = session_id 
      AND public.is_user_chat_participant(tcs.chat_id, auth.uid())
    )
  );

-- Functions for auto-cleanup and maintenance

-- Function to delete expired temporary messages
CREATE OR REPLACE FUNCTION public.delete_expired_temp_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM public.temp_messages WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate expired temp chat sessions
CREATE OR REPLACE FUNCTION public.deactivate_expired_temp_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.temp_chat_sessions 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment count on status
CREATE OR REPLACE FUNCTION public.update_status_comment_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.status_updates 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.status_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.status_updates 
    SET comment_count = GREATEST(comment_count - 1, 0) 
    WHERE id = OLD.status_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update share count on status
CREATE OR REPLACE FUNCTION public.update_status_share_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.status_updates 
    SET share_count = share_count + 1 
    WHERE id = NEW.status_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.status_updates 
    SET share_count = GREATEST(share_count - 1, 0) 
    WHERE id = OLD.status_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic count updates
CREATE TRIGGER trg_update_comment_count
  AFTER INSERT OR DELETE ON public.status_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_status_comment_count();

CREATE TRIGGER trg_update_share_count
  AFTER INSERT OR DELETE ON public.status_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_status_share_count();

-- Enable realtime for new tables
ALTER TABLE public.status_comments REPLICA IDENTITY FULL;
ALTER TABLE public.comment_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.status_shares REPLICA IDENTITY FULL;
ALTER TABLE public.temp_chat_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.temp_messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.temp_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.temp_messages;
