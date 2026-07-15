insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'anniversary-checkins',
  'anniversary-checkins',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anniversary checkin uploads" on storage.objects;

create policy "anniversary checkin uploads"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'anniversary-checkins'
  and (storage.foldername(name))[1] = 'checkins'
);
