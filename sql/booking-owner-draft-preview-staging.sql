-- LIW Cards staging — let an authenticated card owner preview native booking on an unpublished card.
-- Public/anonymous behavior is unchanged: unpublished cards remain unavailable.
create or replace function public.booking_public_bootstrap(p_slug text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_card public.digital_cards%rowtype;
  v_settings public.booking_settings%rowtype;
  v_plan text;
  v_limit integer;
  v_mode text;
  v_services jsonb := '[]'::jsonb;
begin
  select * into v_card
  from public.digital_cards
  where slug = trim(p_slug)
    and (status = 'published' or user_id = auth.uid())
  limit 1;

  if v_card.id is null then
    return jsonb_build_object('ok',false,'reason','not_found');
  end if;

  v_plan := public.liw_booking_plan_for_user(v_card.user_id);
  v_mode := case when v_plan in ('starter','free') then 'request' else 'booking' end;
  v_limit := case when v_plan='lite' then 1 when v_plan='plus' then 5 when v_plan in ('pro','agency','white_label') then 100 else 8 end;

  select * into v_settings from public.booking_settings where card_id=v_card.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',q.id,
        'name',q.name,
        'description',q.description,
        'price_cents',q.price_cents,
        'duration_minutes',q.duration_minutes,
        'has_external_payment',q.has_external_payment
      ) order by q.sort_order,q.name
    ),
    '[]'::jsonb
  ) into v_services
  from (
    select
      s.id,
      s.name,
      s.description,
      s.price_cents,
      s.sort_order,
      coalesce(bss.duration_minutes,30) duration_minutes,
      (v_plan in ('pro','agency','white_label') and nullif(trim(coalesce(s.payment_url,'')),'') is not null) has_external_payment
    from public.card_services s
    left join public.booking_service_settings bss on bss.card_service_id=s.id
    where s.card_id=v_card.id
      and s.is_enabled=true
      and coalesce(bss.enabled,true)=true
    order by s.sort_order,s.name
    limit v_limit
  ) q;

  return jsonb_build_object(
    'ok',true,
    'card_id',v_card.id,
    'mode',v_mode,
    'plan',v_plan,
    'service_limit',v_limit,
    'enabled',coalesce(v_settings.enabled,false),
    'timezone',coalesce(v_settings.timezone,'America/New_York'),
    'min_notice_minutes',coalesce(v_settings.min_notice_minutes,60),
    'days_ahead',coalesce(v_settings.days_ahead,30),
    'location_type',coalesce(v_settings.location_type,'business'),
    'location_text',v_settings.location_text,
    'services',v_services
  );
end;
$function$;
