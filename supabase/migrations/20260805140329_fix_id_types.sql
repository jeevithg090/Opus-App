ALTER TABLE public.media_entries DROP CONSTRAINT IF EXISTS media_entries_surgery_id_fkey;

ALTER TABLE public.surgeries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.surgeries ALTER COLUMN id SET DATA TYPE TEXT;

ALTER TABLE public.media_entries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.media_entries ALTER COLUMN id SET DATA TYPE TEXT;
ALTER TABLE public.media_entries ALTER COLUMN surgery_id SET DATA TYPE TEXT;

ALTER TABLE public.media_entries ADD CONSTRAINT media_entries_surgery_id_fkey FOREIGN KEY (surgery_id) REFERENCES public.surgeries(id) ON DELETE SET NULL;
