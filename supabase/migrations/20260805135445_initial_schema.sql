-- Users table (extends Supabase auth.users via trigger)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Surgeon', 'Fellow', 'Researcher')),
  email TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email, 'Surgeon');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Patients table
CREATE TABLE public.patients (
  uhid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age_years INT NOT NULL DEFAULT 0,
  age_months INT,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
  diagnosis TEXT NOT NULL DEFAULT '',
  primary_surgeon TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  date_of_surgery DATE,
  deleted_at TIMESTAMPTZ,
  user_id UUID NOT NULL DEFAULT auth.uid()
);

-- Study groups table
CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  drive_folder_id TEXT,
  last_sync TIMESTAMPTZ,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Study group ↔ patients (many-to-many)
CREATE TABLE public.study_group_patients (
  study_group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
  patient_uhid TEXT REFERENCES public.patients(uhid) ON DELETE CASCADE,
  PRIMARY KEY (study_group_id, patient_uhid)
);

-- Surgeries table
CREATE TABLE public.surgeries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_uhid TEXT REFERENCES public.patients(uhid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  ot_notes TEXT,
  finding_url TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid()
);

-- Media entries table
CREATE TABLE public.media_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_uhid TEXT REFERENCES public.patients(uhid) ON DELETE CASCADE,
  surgery_id UUID REFERENCES public.surgeries(id) ON DELETE SET NULL,
  stage TEXT NOT NULL CHECK (stage IN ('Pre-operative', 'Intra-operative', 'Post-operative')),
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'pdf')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  storage_location TEXT NOT NULL DEFAULT 'Local Storage' CHECK (storage_location IN ('Google Drive', 'Local Storage')),
  user_id UUID NOT NULL DEFAULT auth.uid()
);

-- Audit entries table
CREATE TABLE public.audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- RLS: Enable on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own patients" ON public.patients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own study groups" ON public.study_groups FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own study group patients" ON public.study_group_patients FOR ALL USING (
  study_group_id IN (SELECT id FROM public.study_groups WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own surgeries" ON public.surgeries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own media" ON public.media_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read own audit entries" ON public.audit_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audit entries" ON public.audit_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
