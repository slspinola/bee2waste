-- Fix handle_new_user trigger:
-- 1. Remove org_id (linked separately via link_user_to_demo_org or admin)
-- 2. Set search_path explicitly so it finds public.profiles when called from auth schema

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
