-- Create storage bucket for patrol images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('patrol-images', 'patrol-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Storage policies for patrol-images bucket
CREATE POLICY "Authenticated users can upload patrol images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'patrol-images' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view patrol images"
ON storage.objects FOR SELECT
USING (bucket_id = 'patrol-images');

CREATE POLICY "Users can update own patrol images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'patrol-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own patrol images"
ON storage.objects FOR DELETE
USING (bucket_id = 'patrol-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for avatars bucket
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add image_url column to patrol_logs for attaching images to notes
ALTER TABLE public.patrol_logs ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create handover_notes table
CREATE TABLE IF NOT EXISTS public.handover_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on handover_notes
ALTER TABLE public.handover_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for handover_notes
CREATE POLICY "Guards can insert own handover notes"
ON public.handover_notes FOR INSERT
WITH CHECK (guard_id = get_guard_id(auth.uid()));

CREATE POLICY "Users can view authorized handover notes"
ON public.handover_notes FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'guard') OR
  (has_role(auth.uid(), 'supervisor') AND supervisor_has_site_access(auth.uid(), site_id))
);

CREATE POLICY "Admins can manage handover notes"
ON public.handover_notes FOR ALL
USING (is_admin_or_supervisor(auth.uid()));

-- Add incident_type column to incidents table
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS incident_type TEXT DEFAULT 'general' CHECK (incident_type IN ('general', 'security', 'safety', 'maintenance', 'suspicious_activity', 'emergency', 'access_control', 'other'));

-- Enable realtime for handover_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.handover_notes;