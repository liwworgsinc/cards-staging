create or replace function public.liw_guard_partial_card_identity_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  destructive_clears integer := 0;
  old_established boolean;
begin
  if old.full_name is not null
     and btrim(old.full_name) <> ''
     and old.full_name <> 'Untitled Card'
     and new.full_name = 'Untitled Card' then
    new.full_name := old.full_name;
    new.slug := old.slug;
  end if;

  old_established := old.full_name is not null
    and btrim(old.full_name) <> ''
    and old.full_name <> 'Untitled Card';

  if old_established then
    destructive_clears :=
      (case when nullif(btrim(coalesce(old.job_title,'')),'') is not null and nullif(btrim(coalesce(new.job_title,'')),'') is null then 1 else 0 end) +
      (case when nullif(btrim(coalesce(old.company_name,'')),'') is not null and nullif(btrim(coalesce(new.company_name,'')),'') is null then 1 else 0 end) +
      (case when nullif(btrim(coalesce(old.biography,'')),'') is not null and nullif(btrim(coalesce(new.biography,'')),'') is null then 1 else 0 end) +
      (case when nullif(btrim(coalesce(old.phone,'')),'') is not null and nullif(btrim(coalesce(new.phone,'')),'') is null then 1 else 0 end) +
      (case when nullif(btrim(coalesce(old.email,'')),'') is not null and nullif(btrim(coalesce(new.email,'')),'') is null then 1 else 0 end) +
      (case when nullif(btrim(coalesce(old.website,'')),'') is not null and nullif(btrim(coalesce(new.website,'')),'') is null then 1 else 0 end) +
      (case when nullif(btrim(coalesce(old.business_address,'')),'') is not null and nullif(btrim(coalesce(new.business_address,'')),'') is null then 1 else 0 end) +
      (case when nullif(btrim(coalesce(old.headline,'')),'') is not null and nullif(btrim(coalesce(new.headline,'')),'') is null then 1 else 0 end) +
      (case when nullif(btrim(coalesce(old.profile_image_url,'')),'') is not null and nullif(btrim(coalesce(new.profile_image_url,'')),'') is null then 1 else 0 end) +
      (case when nullif(btrim(coalesce(old.seo_title,'')),'') is not null and nullif(btrim(coalesce(new.seo_title,'')),'') is null then 1 else 0 end) +
      (case when nullif(btrim(coalesce(old.seo_description,'')),'') is not null and nullif(btrim(coalesce(new.seo_description,'')),'') is null then 1 else 0 end) +
      (case when old.template_id is not null and new.template_id is null then 1 else 0 end);

    if destructive_clears >= 4 then
      raise exception using
        errcode = 'P0001',
        message = 'LIW_DATA_SAFETY: blocked a partial editor reset from clearing established card data';
    end if;
  end if;

  return new;
end;
$$;
