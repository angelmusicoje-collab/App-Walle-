-- =====================================================================
-- WAMI — Storage (fotografías de pedidos, gastos, productos y comprobantes)
-- =====================================================================
-- Bucket PRIVADO: las fotos no son públicas. La app pide "signed URLs"
-- (enlaces temporales) para mostrarlas, solo a usuarias autenticadas.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wami-photos', 'wami-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "wami_photos_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'wami-photos');

create policy "wami_photos_insert_authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'wami-photos');

create policy "wami_photos_update_authenticated"
on storage.objects for update
to authenticated
using (bucket_id = 'wami-photos')
with check (bucket_id = 'wami-photos');

create policy "wami_photos_delete_authenticated"
on storage.objects for delete
to authenticated
using (bucket_id = 'wami-photos');

-- Si el SQL Editor te marca error de permisos al crear estas policies
-- (pasa en algunos proyectos porque storage.objects es de Supabase),
-- créalas en su lugar desde Dashboard -> Storage -> wami-photos -> Policies,
-- usando exactamente la misma condición: bucket_id = 'wami-photos'.
