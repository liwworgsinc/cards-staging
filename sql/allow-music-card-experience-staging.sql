-- LIW Cards staging: allow the Music card experience without changing Classic or Flow behavior.
alter table public.digital_cards
  drop constraint if exists digital_cards_card_experience_check;

alter table public.digital_cards
  add constraint digital_cards_card_experience_check
  check (card_experience = any (array['classic'::text, 'flow'::text, 'music'::text]));
