-- Preparado para aplicación remota manual. No modifica tablas de negocio.
-- El bucket es público sólo para servir flyers por URL. Las escrituras usan
-- la sesión autenticada y verifican ownership contra public.eventos.

do $$
declare
  existing_bucket storage.buckets%rowtype;
  existing_mime_types text[];
begin
  select * into existing_bucket from storage.buckets where id = 'event-images';

  if not found then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('event-images', 'event-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);
  else
    select coalesce(array_agg(mime_type order by mime_type), array[]::text[])
      into existing_mime_types
      from unnest(existing_bucket.allowed_mime_types) as mime_type;

    if existing_bucket.name is distinct from 'event-images'
      or existing_bucket.public is distinct from true
      or existing_bucket.file_size_limit is distinct from 5242880
      or existing_mime_types is distinct from array['image/jpeg', 'image/png', 'image/webp']::text[]
    then
      raise exception using
        errcode = 'P0001',
        message = 'El bucket event-images ya existe con una configuración incompatible. Revisarlo manualmente antes de aplicar esta migración.';
    end if;
  end if;
end;
$$;

create schema if not exists private;

create or replace function private.user_owns_event(event_id_text text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.eventos as event
    join public.usuarios as organizer on organizer.id = event.organizer_id
    where event.id::text = event_id_text
      and event.organizer_id = (select auth.uid())
      and organizer.role = 'ORGANIZADOR'
  );
$$;

alter function private.user_owns_event(text) owner to postgres;
revoke all on function private.user_owns_event(text) from public;
grant usage on schema private to authenticated;
grant execute on function private.user_owns_event(text) to authenticated;

drop policy if exists "event_images_insert_owned_event" on storage.objects;
create policy "event_images_insert_owned_event"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-images'
  and owner_id = (select auth.uid()::text)
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] = 'events'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.user_owns_event((storage.foldername(name))[3])
  and lower(storage.extension(name)) in ('jpg', 'png', 'webp')
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
);

drop policy if exists "event_images_delete_own_objects" on storage.objects;
create policy "event_images_delete_own_objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-images'
  and owner_id = (select auth.uid()::text)
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] = 'events'
  and private.user_owns_event((storage.foldername(name))[3])
);

drop policy if exists "event_images_select_own_for_remove" on storage.objects;
create policy "event_images_select_own_for_remove"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'event-images'
  and storage.allow_only_operation('storage.object.delete_many')
  and owner_id = (select auth.uid()::text)
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] = 'events'
  and private.user_owns_event((storage.foldername(name))[3])
);

-- No se crea política UPDATE: cada reemplazo usa una ruta nueva y upsert: false.
