-- LIW Cards: global Auto Contrast preference.
-- Additive and backward compatible. Existing cards default to ON.
alter table public.digital_cards
  add column if not exists auto_contrast_enabled boolean not null default true;

comment on column public.digital_cards.auto_contrast_enabled is
  'When true, LIW Cards automatically enforces accessible foreground contrast for this card.';

create or replace function public.public_card_by_slug(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $function$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id', dc.id,
      'template_id', dc.template_id,
      'slug', dc.slug,
      'status', dc.status,
      'full_name', dc.full_name,
      'job_title', dc.job_title,
      'company_name', dc.company_name,
      'biography', dc.biography,
      'phone', dc.phone,
      'sms_phone', dc.sms_phone,
      'email', dc.email,
      'website', dc.website,
      'business_address', dc.business_address,
      'whatsapp_number', dc.whatsapp_number,
      'map_url', dc.map_url,
      'headline', dc.headline,
      'profile_image_url', dc.profile_image_url,
      'profile_position_x', dc.profile_position_x,
      'profile_position_y', dc.profile_position_y,
      'profile_zoom', dc.profile_zoom
    ) || jsonb_build_object(
      'primary_color', dc.primary_color,
      'secondary_color', dc.secondary_color,
      'background_color', dc.background_color,
      'text_color', dc.text_color,
      'button_color', dc.button_color,
      'button_text_color', dc.button_text_color,
      'auto_contrast_enabled', dc.auto_contrast_enabled,
      'font_family', dc.font_family,
      'button_style', dc.button_style,
      'profile_image_shape', dc.profile_image_shape,
      'profile_border_color', dc.profile_border_color,
      'border_radius', dc.border_radius,
      'card_layout', dc.card_layout,
      'card_experience', dc.card_experience,
      'gradient_background', dc.gradient_background,
      'color_mode', dc.color_mode,
      'show_branding', dc.show_branding,
      'cover_image_url', dc.cover_image_url,
      'cover_position', dc.cover_position,
      'cover_overlay', dc.cover_overlay,
      'branding_mode', dc.branding_mode
    ) || jsonb_build_object(
      'custom_branding_text', case when dc.branding_mode = 'custom' then dc.custom_branding_text else null end,
      'custom_branding_url', case when dc.branding_mode = 'custom' then dc.custom_branding_url else null end,
      'qr_foreground_color', dc.qr_foreground_color,
      'qr_background_color', dc.qr_background_color,
      'qr_logo_url', dc.qr_logo_url,
      'booking_url', case when dc.booking_enabled then dc.booking_url else null end,
      'payment_url', dc.payment_url,
      'services_enabled', dc.services_enabled,
      'products_enabled', dc.products_enabled,
      'booking_enabled', dc.booking_enabled,
      'lead_form_enabled', dc.lead_form_enabled,
      'seo_title', dc.seo_title,
      'seo_description', dc.seo_description,
      'video_title', case when dc.video_enabled then dc.video_title else null end,
      'video_url', case when dc.video_enabled then dc.video_url else null end,
      'video_enabled', dc.video_enabled,
      'payment_sharing_enabled', dc.payment_sharing_enabled,
      'cash_app_cashtag', case when dc.payment_sharing_enabled then dc.cash_app_cashtag else null end,
      'cash_app_label', case when dc.payment_sharing_enabled then dc.cash_app_label else null end,
      'venmo_username', case when dc.payment_sharing_enabled then dc.venmo_username else null end
    ) || jsonb_build_object(
      'venmo_label', case when dc.payment_sharing_enabled then dc.venmo_label else null end,
      'paypal_url', case when dc.payment_sharing_enabled then dc.paypal_url else null end,
      'paypal_label', case when dc.payment_sharing_enabled then dc.paypal_label else null end,
      'zelle_contact', case when dc.payment_sharing_enabled then dc.zelle_contact else null end,
      'zelle_label', case when dc.payment_sharing_enabled then dc.zelle_label else null end,
      'payment_qr_url', case when dc.payment_sharing_enabled then dc.payment_qr_url else null end,
      'social_button_style', dc.social_button_style,
      'social_button_size', dc.social_button_size,
      'bottom_nav_enabled', dc.bottom_nav_enabled,
      'bottom_nav_items', dc.bottom_nav_items,
      'section_order', dc.section_order,
      'gallery_enabled', dc.gallery_enabled,
      'testimonials_enabled', dc.testimonials_enabled,
      'hours_enabled', dc.hours_enabled,
      'music_enabled', dc.music_enabled,
      'business_tool_styles', dc.business_tool_styles
    )
  )
  from public.digital_cards dc
  where dc.slug = lower(btrim(p_slug))
    and (
      (dc.status = 'published' and public.card_is_within_current_limit(dc.id))
      or dc.user_id = (select auth.uid())
      or public.has_workspace_access(dc.user_id, false)
      or public.is_admin()
    )
  limit 1
$function$;
