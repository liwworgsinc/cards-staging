-- LIW Cards: global Auto Contrast preference.
-- Additive and backward compatible. Existing cards default to ON.
alter table public.digital_cards
  add column if not exists auto_contrast_enabled boolean not null default true;

comment on column public.digital_cards.auto_contrast_enabled is
  'When true, LIW Cards automatically enforces accessible foreground contrast for this card.';

create or replace function public.public_card_by_slug(p_slug text)
returns jsonb
language sql
security definer
set search_path to 'public', 'extensions'
as $function$
  select
    jsonb_build_object(
      'id', dc.id,
      'slug', dc.slug,
      'status', dc.status,
      'first_name', dc.first_name,
      'last_name', dc.last_name,
      'title', dc.title,
      'company', dc.company,
      'email', dc.email,
      'phone', dc.phone,
      'mobile', dc.mobile,
      'website', dc.website,
      'address', dc.address,
      'bio', dc.bio,
      'profile_image_url', dc.profile_image_url,
      'cover_image_url', dc.cover_image_url,
      'logo_url', dc.logo_url,
      'facebook_url', dc.facebook_url,
      'instagram_url', dc.instagram_url,
      'linkedin_url', dc.linkedin_url,
      'twitter_url', dc.twitter_url,
      'tiktok_url', dc.tiktok_url,
      'youtube_url', dc.youtube_url,
      'whatsapp_url', dc.whatsapp_url,
      'snapchat_url', dc.snapchat_url,
      'github_url', dc.github_url,
      'email_sharing_enabled', dc.email_sharing_enabled,
      'sms_sharing_enabled', dc.sms_sharing_enabled,
      'event_sharing_enabled', dc.event_sharing_enabled,
      'group_sharing_enabled', dc.group_sharing_enabled,
      'payment_sharing_enabled', dc.payment_sharing_enabled,
      'primary_color', dc.primary_color,
      'secondary_color', dc.secondary_color,
      'background_color', dc.background_color,
      'text_color', dc.text_color,
      'button_color', dc.button_color,
      'button_text_color', dc.button_text_color,
      'auto_contrast_enabled', dc.auto_contrast_enabled,
      'design_font', dc.design_font,
      'name_font_family', dc.name_font_family,
      'name_font_weight', dc.name_font_weight,
      'name_font_style', dc.name_font_style,
      'template_name', dc.template_name,
      'template_id', dc.template_id,
      'template_config', dc.template_config,
      'theme_pack_id', dc.theme_pack_id,
      'business_type_key', dc.business_type_key,
      'business_name', dc.business_name,
      'business_logo_url', dc.business_logo_url,
      'multi_link_style', dc.multi_link_style,
      'show_contact_section', dc.show_contact_section,
      'show_social_section', dc.show_social_section,
      'show_business_section', dc.show_business_section,
      'show_share_section', dc.show_share_section,
      'show_bio_section', dc.show_bio_section,
      'show_business_tools', dc.show_business_tools,
      'business_links', coalesce(dc.business_links, '[]'::jsonb),
      'business_link_tabs', coalesce(dc.business_link_tabs, '[]'::jsonb),
      'business_profile', dc.business_profile,
      'business_tool_styles', dc.business_tool_styles,
      'business_type', dc.business_type,
      'business_role', dc.business_role,
      'business_template', dc.business_template,
      'first_visit_info_enabled', coalesce(dc.first_visit_info_enabled, true),
      'first_visit_info', coalesce(dc.first_visit_info, '{}'::jsonb),
      'section_visibility', dc.section_visibility,
      'section_order', dc.section_order,
      'full_page_sections', coalesce(dc.full_page_sections, '{}'::jsonb),
      'template_section_config', dc.template_section_config,
      'is_premium', dc.is_premium,
      'premium_effect', dc.premium_effect,
      'premium_effect_config', coalesce(dc.premium_effect_config, '{}'::jsonb),
      'business_enabled', dc.business_enabled,
      'business_info', coalesce(dc.business_info, '{}'::jsonb),
      'business_services', coalesce(dc.business_services, '[]'::jsonb),
      'business_offers', coalesce(dc.business_offers, '[]'::jsonb),
      'business_hours', coalesce(dc.business_hours, '{}'::jsonb),
      'business_booking', coalesce(dc.business_booking, '{}'::jsonb),
      'business_reviews', coalesce(dc.business_reviews, '[]'::jsonb),
      'business_social_proof', coalesce(dc.business_social_proof, '{}'::jsonb),
      'business_ctas', coalesce(dc.business_ctas, '[]'::jsonb),
      'barber_config', dc.barber_config,
      'last_updated', dc.last_updated,
      'owner_plan', au.plan
    )
  from public.digital_cards dc
  left join public.app_users au
    on au.id = dc.user_id
  where dc.slug = p_slug
    and lower(coalesce(dc.status, '')) in ('public', 'published', 'active')
  limit 1;
$function$;
