-- allowlist
CREATE TABLE public.allowed_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.allowed_emails TO authenticated;
GRANT ALL ON public.allowed_emails TO service_role;
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can read allowlist" ON public.allowed_emails FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.is_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_emails a
    WHERE lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

CREATE OR REPLACE FUNCTION public.claim_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF user_email = '' THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.allowed_emails) THEN
    INSERT INTO public.allowed_emails (email) VALUES (user_email)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN public.is_allowed();
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id AND public.is_allowed())
  WITH CHECK (auth.uid() = id AND public.is_allowed());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  system_message text NOT NULL DEFAULT '',
  default_model text NOT NULL DEFAULT 'openai/gpt-6-astra',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.user_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.is_allowed())
  WITH CHECK (auth.uid() = user_id AND public.is_allowed());
CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  pinned boolean NOT NULL DEFAULT false,
  model text NOT NULL DEFAULT 'openai/gpt-6-astra',
  system_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversations_user_updated_idx ON public.conversations (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations" ON public.conversations FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.is_allowed())
  WITH CHECK (auth.uid() = user_id AND public.is_allowed());
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL DEFAULT '',
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.messages FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.is_allowed())
  WITH CHECK (auth.uid() = user_id AND public.is_allowed());

CREATE TABLE public.memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'other',
  content text NOT NULL,
  source_conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX memories_user_content_idx ON public.memories (user_id, lower(content));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memories TO authenticated;
GRANT ALL ON public.memories TO service_role;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memories" ON public.memories FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.is_allowed())
  WITH CHECK (auth.uid() = user_id AND public.is_allowed());
CREATE TRIGGER memories_updated_at BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "own chat media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own chat media insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own chat media delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);