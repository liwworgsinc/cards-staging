-- LIW Cards staging Growth Center affiliate read access
-- Applied to LIW Digital Cards Supabase on 2026-09-16.
-- affiliate_referrals is written through the existing referral flow; this policy only lets authenticated LIW admins read referral activity in Growth Center.

drop policy if exists "affiliate_referrals_admin_read" on public.affiliate_referrals;
create policy "affiliate_referrals_admin_read"
  on public.affiliate_referrals
  for select
  to authenticated
  using ((select is_admin()));
