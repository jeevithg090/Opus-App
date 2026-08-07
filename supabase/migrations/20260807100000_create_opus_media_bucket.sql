-- Create the media storage bucket and RLS policies.
-- The prior 20260805160758_create_storage_bucket.sql was empty; this replaces it.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('opus-media', 'opus-media', TRUE, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may upload/manage objects under their own folder
CREATE POLICY "Users can manage own media objects"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'opus-media' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'opus-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read for rendering in the app
CREATE POLICY "Public read media objects"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'opus-media');
