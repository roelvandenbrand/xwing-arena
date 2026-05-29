-- Public bucket for pilot/upgrade images
insert into storage.buckets (id, name, public)
values ('catalog-images', 'catalog-images', true)
on conflict (id) do update set public = true;

-- Public read
create policy "catalog-images public read"
on storage.objects for select
to public
using (bucket_id = 'catalog-images');

-- Admin write/update/delete
create policy "catalog-images admin insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'catalog-images' and public.has_role(auth.uid(), 'admin'));

create policy "catalog-images admin update"
on storage.objects for update
to authenticated
using (bucket_id = 'catalog-images' and public.has_role(auth.uid(), 'admin'));

create policy "catalog-images admin delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'catalog-images' and public.has_role(auth.uid(), 'admin'));
