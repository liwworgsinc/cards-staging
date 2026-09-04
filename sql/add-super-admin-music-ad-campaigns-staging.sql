-- LIW Cards staging — Super Admin controlled Free-plan Music ad slot.
create table if not exists public.platform_ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  placement text not null default 'music_home_bottom',
  campaign_name text not null,
  is_enabled boolean not null default false,
  target_plan text not null default 'starter',
  label text not null default 'Sponsored',
  headline text not null,
  body text not null default '',
  image_url text not null default '',
  destination_url text not null,
  button_text text not null default 'Learn more',
  starts_at timestamptz,
  ends_at timestamptz,
  priority integer not null default 100,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_ad_campaigns_placement_check check (placement in ('music_home_bottom')),
  constraint platform_ad_campaigns_target_plan_check check (target_plan in ('starter')),
  constraint platform_ad_campaigns_schedule_check check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint platform_ad_campaigns_label_check check (length(trim(label)) between 1 and 40),
  constraint platform_ad_campaigns_headline_check check (length(trim(headline)) between 1 and 120),
  constraint platform_ad_campaigns_destination_check check (destination_url ~* '^https?://')
);

alter table public.platform_ad_campaigns enable row level security;

drop policy if exists platform_ad_campaigns_admin_select on public.platform_ad_campaigns;
create policy platform_ad_campaigns_admin_select on public.platform_ad_campaigns for select to authenticated using (public.is_admin());
drop policy if exists platform_ad_campaigns_admin_insert on public.platform_ad_campaigns;
create policy platform_ad_campaigns_admin_insert on public.platform_ad_campaigns for insert to authenticated with check (public.is_admin());
drop policy if exists platform_ad_campaigns_admin_update on public.platform_ad_campaigns;
create policy platform_ad_campaigns_admin_update on public.platform_ad_campaigns for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists platform_ad_campaigns_admin_delete on public.platform_ad_campaigns;
create policy platform_ad_campaigns_admin_delete on public.platform_ad_campaigns for delete to authenticated using (public.is_admin());

create index if not exists platform_ad_campaigns_active_idx on public.platform_ad_campaigns (placement,target_plan,is_enabled,priority desc,updated_at desc);

create or replace function public.public_music_ad_campaign(p_placement text)
returns jsonb language sql stable security definer set search_path='public' as $$
  select coalesce((select jsonb_build_object('id',c.id,'placement',c.placement,'label',c.label,'headline',c.headline,'body',c.body,'image_url',c.image_url,'destination_url',c.destination_url,'button_text',c.button_text)
    from public.platform_ad_campaigns c
    where c.placement=p_placement and c.target_plan='starter' and c.is_enabled=true
      and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>now())
    order by c.priority desc,c.updated_at desc limit 1),'{}'::jsonb)
$$;
revoke all on function public.public_music_ad_campaign(text) from public;
grant execute on function public.public_music_ad_campaign(text) to anon,authenticated;

create or replace function public.public_card_plan_key(p_card_id uuid)
returns text language sql stable security definer set search_path='public' as $$
  select case when dc.status='published' or public.has_workspace_access(dc.user_id,false) then public.effective_plan(dc.user_id) else null end
  from public.digital_cards dc where dc.id=p_card_id
$$;
revoke all on function public.public_card_plan_key(uuid) from public;
grant execute on function public.public_card_plan_key(uuid) to anon,authenticated;