CREATE POLICY "catalog-images admin select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'catalog-images' AND public.has_role(auth.uid(), 'admin'));