-- LIW Cards agency client-data permissions.
-- These helpers are additive and are used by cards-staging to enforce the
-- approved role split without changing production agency_clients RLS yet.

create or replace function public.can_manage_agency_client_info(p_owner uuid)
returns boolean
language sql
stable
security invoker
set search_path = 'public','auth'
as $$
  select case
    when p_owner is null or (select auth.uid()) is null then false
    when (select auth.uid()) = p_owner then true
    when public.is_admin() then true
    else exists (
      select 1
      from public.workspace_members wm
      where wm.owner_user_id = p_owner
        and wm.member_user_id = (select auth.uid())
        and wm.status = 'active'
        and wm.role = 'agency_admin'
    )
  end
$$;

create or replace function public.can_import_agency_clients(p_owner uuid)
returns boolean
language sql
stable
security invoker
set search_path = 'public','auth'
as $$
  select public.can_manage_agency_client_info(p_owner)
$$;

create or replace function public.can_export_agency_clients(p_owner uuid)
returns boolean
language sql
stable
security invoker
set search_path = 'public','auth'
as $$
  select case
    when p_owner is null or (select auth.uid()) is null then false
    when (select auth.uid()) = p_owner then true
    when public.is_admin() then true
    else false
  end
$$;

revoke all on function public.can_manage_agency_client_info(uuid) from public;
revoke all on function public.can_import_agency_clients(uuid) from public;
revoke all on function public.can_export_agency_clients(uuid) from public;
revoke all on function public.can_manage_agency_client_info(uuid) from anon;
revoke all on function public.can_import_agency_clients(uuid) from anon;
revoke all on function public.can_export_agency_clients(uuid) from anon;
grant execute on function public.can_manage_agency_client_info(uuid) to authenticated;
grant execute on function public.can_import_agency_clients(uuid) to authenticated;
grant execute on function public.can_export_agency_clients(uuid) to authenticated;
