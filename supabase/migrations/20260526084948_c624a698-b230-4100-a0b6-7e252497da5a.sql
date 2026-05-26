CREATE POLICY "admins insert members"
ON public.competition_members
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));