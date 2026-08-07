-- Fix: study_group_patients RLS must also verify patient ownership.
-- Previously only group ownership was checked, allowing any user to enroll
-- another user's patient into their own study group.
DROP POLICY IF EXISTS "Users can manage own study group patients" ON public.study_group_patients;

CREATE POLICY "Users can manage own study group patients" ON public.study_group_patients
FOR ALL
USING (
  study_group_id IN (SELECT id FROM public.study_groups WHERE user_id = auth.uid())
  AND patient_uhid IN (SELECT uhid FROM public.patients WHERE user_id = auth.uid())
)
WITH CHECK (
  study_group_id IN (SELECT id FROM public.study_groups WHERE user_id = auth.uid())
  AND patient_uhid IN (SELECT uhid FROM public.patients WHERE user_id = auth.uid())
);
