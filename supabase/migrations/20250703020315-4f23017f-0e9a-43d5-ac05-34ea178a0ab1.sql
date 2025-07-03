
-- Add foreign key constraint between status_updates and profiles
ALTER TABLE public.status_updates 
ADD CONSTRAINT status_updates_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Do the same for other tables that reference user profiles
ALTER TABLE public.status_comments 
ADD CONSTRAINT status_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.status_reactions 
ADD CONSTRAINT status_reactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.status_views 
ADD CONSTRAINT status_views_viewer_id_fkey 
FOREIGN KEY (viewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.status_shares 
ADD CONSTRAINT status_shares_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.comment_reactions 
ADD CONSTRAINT comment_reactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
