-- Private bucket for trade screenshots. Files live at "<user_id>/<trade_id>/<file>.jpg".
-- The browser uploads directly (after compressing to < 500 KB), so the Render
-- server never stores files on its ephemeral disk.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 1048576,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "screenshots: read own" on storage.objects for select to authenticated
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "screenshots: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "screenshots: replace own" on storage.objects for update to authenticated
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "screenshots: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
