-- Security hardening.
--
-- 1. Make the clinical media bucket private. Patient photos must not be readable by
--    anyone holding (or guessing) a URL; the app now uses short-lived signed URLs.
-- 2. Child rows (surgeries, media entries) may only reference patients owned by the
--    caller. Foreign-key checks bypass RLS, so without this a user could attach rows
--    to another user's patient.
-- 3. Pin search_path on the SECURITY DEFINER profile trigger.
-- 4. Restore a primary-key default on media_entries.id (dropped when it became TEXT).

-- 1. Private storage ---------------------------------------------------------------
UPDATE storage.buckets SET public = FALSE WHERE id = 'opus-media';

DROP POLICY IF EXISTS "Public read media objects" ON storage.objects;
-- Owners keep full access via "Users can manage own media objects" (folder = auth.uid()).

-- 2. Ownership checks on child tables ---------------------------------------------
DROP POLICY IF EXISTS "Users can manage own surgeries" ON public.surgeries;
CREATE POLICY "Users can manage own surgeries" ON public.surgeries
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND patient_uhid IN (SELECT uhid FROM public.patients WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage own media" ON public.media_entries;
CREATE POLICY "Users can manage own media" ON public.media_entries
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND patient_uhid IN (SELECT uhid FROM public.patients WHERE user_id = auth.uid())
  AND (surgery_id IS NULL OR surgery_id IN (SELECT id FROM public.surgeries WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can manage own patients" ON public.patients;
CREATE POLICY "Users can manage own patients" ON public.patients
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own study groups" ON public.study_groups;
CREATE POLICY "Users can manage own study groups" ON public.study_groups
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Trigger hardening -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), NEW.email),
    NEW.email,
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('Surgeon', 'Fellow', 'Researcher') THEN NEW.raw_user_meta_data->>'role'
      ELSE 'Surgeon'
    END
  );
  RETURN NEW;
END;
$$;

-- 4. Primary-key default -------------------------------------------------------------
ALTER TABLE public.media_entries ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Helpful indexes for the app's per-user queries.
CREATE INDEX IF NOT EXISTS patients_user_id_idx ON public.patients (user_id);
CREATE INDEX IF NOT EXISTS surgeries_patient_uhid_idx ON public.surgeries (patient_uhid);
CREATE INDEX IF NOT EXISTS media_entries_patient_uhid_idx ON public.media_entries (patient_uhid);
CREATE INDEX IF NOT EXISTS audit_entries_user_ts_idx ON public.audit_entries (user_id, "timestamp" DESC);
