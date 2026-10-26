-- Preparado para aplicación remota manual. No modifica tablas de negocio.
-- El bucket es público sólo para servir archivos por URL. INSERT y DELETE
-- continúan sujetos a RLS; SELECT se limita a la lectura interna de remove().

do $$
declare
  existing_bucket storage.buckets%rowtype;
  existing_mime_types text[];
begin
  select *
    into existing_bucket
    from storage.buckets
    where id = 'project-images';

  if not found then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'project-images',
      'project-images',
      true,
      5242880,
      array['image/jpeg', 'image/png', 'image/webp']
    );
  else
    select coalesce(array_agg(mime_type order by mime_type), array[]::text[])
      into existing_mime_types
      from unnest(existing_bucket.allowed_mime_types) as mime_type;

    if existing_bucket.name is distinct from 'project-images'
      or existing_bucket.public is distinct from true
      or existing_bucket.file_size_limit is distinct from 5242880
      or existing_mime_types is distinct from array['image/jpeg', 'image/png', 'image/webp']::text[]
    then
      raise exception using
        errcode = 'P0001',
        message = 'El bucket project-images ya existe con una configuración incompatible. Revisarlo manualmente antes de aplicar esta migración.';
    end if;
  end if;
end;
$$;

create schema if not exists private;

create or replace function private.user_owns_musical_project(project_id_text text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.proyectos_musicales as project
    where project.id::text = project_id_text
      and project.user_id = (select auth.uid())
  );
$$;

alter function private.user_owns_musical_project(text) owner to postgres;
revoke all on function private.user_owns_musical_project(text) from public;
grant usage on schema private to authenticated;
grant execute on function private.user_owns_musical_project(text) to authenticated;

drop policy if exists "project_images_insert_own_folder" on storage.objects;
create policy "project_images_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-images'
  and owner_id = (select auth.uid()::text)
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] = 'projects'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.user_owns_musical_project((storage.foldername(name))[3])
  and lower(storage.extension(name)) in ('jpg', 'png', 'webp')
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
);

drop policy if exists "project_images_delete_own_objects" on storage.objects;
create policy "project_images_delete_own_objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-images'
  and owner_id = (select auth.uid()::text)
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] = 'projects'
);

drop policy if exists "project_images_select_own_for_remove" on storage.objects;
create policy "project_images_select_own_for_remove"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-images'
  and storage.allow_only_operation('storage.object.delete_many')
  and owner_id = (select auth.uid()::text)
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] = 'projects'
);

-- No se crea política UPDATE: los reemplazos usan nombres nuevos y upload(upsert: false).
-- storage-js 2.112.4 declara DELETE + SELECT para remove(); el filtro por operación
-- evita habilitar object.list o descargas autenticadas. La URL pública no depende de esta política.
