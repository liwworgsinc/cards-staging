-- Staging-only persistence for the LIW Cards Super Studio experience.
create table if not exists public.super_studio_state_staging (
  card_id uuid primary key references public.digital_cards(id) on delete cascade,
  owner_user_id uuid not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists super_studio_state_staging_owner_idx on public.super_studio_state_staging(owner_user_id);

alter table public.super_studio_state_staging enable row level security;

grant select on public.super_studio_state_staging to anon, authenticated;
grant insert, update, delete on public.super_studio_state_staging to authenticated;

drop policy if exists super_studio_state_select on public.super_studio_state_staging;
create policy super_studio_state_select on public.super_studio_state_staging
for select
using (
  exists (
    select 1 from public.digital_cards dc
    where dc.id = card_id
      and (
        (dc.status = 'published' and public.card_is_within_current_limit(dc.id))
        or dc.user_id = (select auth.uid())
        or public.has_workspace_access(dc.user_id, false)
        or public.is_admin()
      )
  )
);

drop policy if exists super_studio_state_insert on public.super_studio_state_staging;
create policy super_studio_state_insert on public.super_studio_state_staging
for insert to authenticated
with check (
  exists (
    select 1 from public.digital_cards dc
    where dc.id = card_id
      and owner_user_id = dc.user_id
      and (
        dc.user_id = (select auth.uid())
        or public.has_workspace_access(dc.user_id, true)
        or public.is_admin()
      )
  )
);

drop policy if exists super_studio_state_update on public.super_studio_state_staging;
create policy super_studio_state_update on public.super_studio_state_staging
for update to authenticated
using (
  exists (
    select 1 from public.digital_cards dc
    where dc.id = card_id
      and owner_user_id = dc.user_id
      and (
        dc.user_id = (select auth.uid())
        or public.has_workspace_access(dc.user_id, true)
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1 from public.digital_cards dc
    where dc.id = card_id
      and owner_user_id = dc.user_id
      and (
        dc.user_id = (select auth.uid())
        or public.has_workspace_access(dc.user_id, true)
        or public.is_admin()
      )
  )
);

drop policy if exists super_studio_state_delete on public.super_studio_state_staging;
create policy super_studio_state_delete on public.super_studio_state_staging
for delete to authenticated
using (
  exists (
    select 1 from public.digital_cards dc
    where dc.id = card_id
      and owner_user_id = dc.user_id
      and (
        dc.user_id = (select auth.uid())
        or public.has_workspace_access(dc.user_id, true)
        or public.is_admin()
      )
  )
);
