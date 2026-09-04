-- LIW Cards staging — public artist audio previews for Music experience.
-- Uploads are limited to the card owner's workspace path; public playback is intentional.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artist-audio',
  'artist-audio',
  true,
  15728640,
  array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm','audio/ogg']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists artist_audio_insert on storage.objects;
create policy artist_audio_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'artist-audio'
  and public.safe_uuid((storage.foldername(name))[1]) is not null
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.has_workspace_access(public.safe_uuid((storage.foldername(name))[1]), true)
  )
);

drop policy if exists artist_audio_update on storage.objects;
create policy artist_audio_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'artist-audio'
  and public.safe_uuid((storage.foldername(name))[1]) is not null
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.has_workspace_access(public.safe_uuid((storage.foldername(name))[1]), true))
)
with check (
  bucket_id = 'artist-audio'
  and public.safe_uuid((storage.foldername(name))[1]) is not null
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.has_workspace_access(public.safe_uuid((storage.foldername(name))[1]), true))
);

drop policy if exists artist_audio_delete on storage.objects;
create policy artist_audio_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'artist-audio'
  and public.safe_uuid((storage.foldername(name))[1]) is not null
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.has_workspace_access(public.safe_uuid((storage.foldername(name))[1]), true))
);
