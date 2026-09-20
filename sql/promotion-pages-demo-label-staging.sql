alter table public.promotion_pages
  add column if not exists demo_label text not null default '';

update public.promotion_pages
set demo_label = case
  when page_key = 'realtors' and environment = 'staging' and demo_label = '' then 'Live Realtor example · Latoya Rapid'
  else demo_label
end;

create or replace function public.public_promotion_page(
  p_page_key text,
  p_environment text default 'production'
)
returns jsonb
language sql
stable
security definer
set search_path='public'
as $$
  select coalesce((
    select jsonb_build_object(
      'page_key', p.page_key,
      'label', p.label,
      'public_path', p.public_path,
      'page_title', p.page_title,
      'meta_description', p.meta_description,
      'h1', p.h1,
      'demo_card_url', p.demo_card_url,
      'demo_label', p.demo_label,
      'demo_button_text', p.demo_button_text,
      'primary_cta_text', p.primary_cta_text,
      'primary_cta_url', p.primary_cta_url,
      'is_published', p.is_published,
      'updated_at', p.updated_at
    )
    from public.promotion_pages p
    where p.page_key = p_page_key
      and p.environment = p_environment
    limit 1
  ), '{}'::jsonb)
$$;

revoke all on function public.public_promotion_page(text,text) from public;
grant execute on function public.public_promotion_page(text,text) to anon, authenticated;
