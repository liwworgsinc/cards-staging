-- LIW Rolodex V1 staging
-- Applied to Supabase on 2026-09-06. This file keeps the staging schema change in source control.

create table if not exists public.rolodex_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null default 'manual' check (source_type in ('liw','external','manual')),
  liw_card_id uuid references public.digital_cards(id) on delete set null,
  liw_slug text,
  display_name text not null default '',
  job_title text,
  company_name text,
  phone text,
  email text,
  website text,
  profile_image_url text,
  external_url text,
  category text not null default 'Contacts',
  notes text not null default '',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rolodex_entries_user_liw_card_unique
  on public.rolodex_entries(user_id, liw_card_id)
  where liw_card_id is not null;

create index if not exists rolodex_entries_user_created_idx
  on public.rolodex_entries(user_id, created_at desc);

create index if not exists rolodex_entries_user_favorite_idx
  on public.rolodex_entries(user_id, is_favorite)
  where is_favorite = true;

alter table public.rolodex_entries enable row level security;

drop policy if exists rolodex_entries_select_own on public.rolodex_entries;
create policy rolodex_entries_select_own on public.rolodex_entries for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists rolodex_entries_insert_own on public.rolodex_entries;
create policy rolodex_entries_insert_own on public.rolodex_entries for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists rolodex_entries_update_own on public.rolodex_entries;
create policy rolodex_entries_update_own on public.rolodex_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists rolodex_entries_delete_own on public.rolodex_entries;
create policy rolodex_entries_delete_own on public.rolodex_entries for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.rolodex_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists rolodex_entries_touch_updated_at on public.rolodex_entries;
create trigger rolodex_entries_touch_updated_at before update on public.rolodex_entries for each row execute function public.rolodex_touch_updated_at();

create or replace function public.rolodex_save_liw_card(p_slug text)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
  v_user uuid := auth.uid();
  v_card public.digital_cards%rowtype;
  v_entry_id uuid;
  v_existing uuid;
begin
  if v_user is null then return jsonb_build_object('ok', false, 'reason', 'not_authenticated'); end if;
  select * into v_card from public.digital_cards where slug = trim(p_slug) and status = 'published' limit 1;
  if v_card.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_card.user_id = v_user then return jsonb_build_object('ok', false, 'reason', 'own_card', 'slug', v_card.slug, 'display_name', v_card.full_name); end if;

  select id into v_existing from public.rolodex_entries where user_id = v_user and liw_card_id = v_card.id limit 1;
  if v_existing is not null then
    update public.rolodex_entries set
      liw_slug = v_card.slug,
      display_name = coalesce(nullif(v_card.full_name, ''), display_name),
      job_title = v_card.job_title,
      company_name = v_card.company_name,
      phone = v_card.phone,
      email = v_card.email,
      website = v_card.website,
      profile_image_url = v_card.profile_image_url,
      source_type = 'liw'
    where id = v_existing;
    return jsonb_build_object('ok', true, 'already_saved', true, 'entry_id', v_existing, 'slug', v_card.slug, 'display_name', v_card.full_name);
  end if;

  insert into public.rolodex_entries (user_id, source_type, liw_card_id, liw_slug, display_name, job_title, company_name, phone, email, website, profile_image_url)
  values (v_user, 'liw', v_card.id, v_card.slug, coalesce(v_card.full_name, ''), v_card.job_title, v_card.company_name, v_card.phone, v_card.email, v_card.website, v_card.profile_image_url)
  returning id into v_entry_id;
  return jsonb_build_object('ok', true, 'already_saved', false, 'entry_id', v_entry_id, 'slug', v_card.slug, 'display_name', v_card.full_name);
exception
  when unique_violation then
    select id into v_entry_id from public.rolodex_entries where user_id = v_user and liw_card_id = v_card.id limit 1;
    return jsonb_build_object('ok', true, 'already_saved', true, 'entry_id', v_entry_id, 'slug', v_card.slug, 'display_name', v_card.full_name);
end;
$$;

create or replace function public.rolodex_list_entries()
returns table (
  id uuid, source_type text, liw_card_id uuid, liw_slug text, display_name text,
  job_title text, company_name text, phone text, email text, website text,
  profile_image_url text, external_url text, category text, notes text,
  is_favorite boolean, liw_available boolean, created_at timestamptz, updated_at timestamptz
)
language sql security definer stable set search_path = public, auth as $$
  select r.id, r.source_type, r.liw_card_id, coalesce(c.slug, r.liw_slug),
    coalesce(nullif(c.full_name, ''), r.display_name), coalesce(c.job_title, r.job_title),
    coalesce(c.company_name, r.company_name), coalesce(c.phone, r.phone),
    coalesce(c.email, r.email), coalesce(c.website, r.website),
    coalesce(c.profile_image_url, r.profile_image_url), r.external_url, r.category,
    r.notes, r.is_favorite,
    (r.source_type = 'liw' and c.id is not null and c.status = 'published'),
    r.created_at, r.updated_at
  from public.rolodex_entries r
  left join public.digital_cards c on c.id = r.liw_card_id and c.status = 'published'
  where r.user_id = auth.uid()
  order by r.is_favorite desc, r.updated_at desc, r.created_at desc;
$$;

revoke all on function public.rolodex_save_liw_card(text) from public;
revoke all on function public.rolodex_list_entries() from public;
grant execute on function public.rolodex_save_liw_card(text) to authenticated;
grant execute on function public.rolodex_list_entries() to authenticated;
grant select, insert, update, delete on public.rolodex_entries to authenticated;