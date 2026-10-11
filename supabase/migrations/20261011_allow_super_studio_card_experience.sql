-- Staging: allow current LIW card experience IDs to persist on digital_cards.
-- This fixes existing cards failing save after switching to Super Studio.

alter table public.digital_cards
  drop constraint if exists digital_cards_card_experience_check;

alter table public.digital_cards
  add constraint digital_cards_card_experience_check
  check (
    card_experience = any (
      array[
        'classic'::text,
        'flow'::text,
        'music'::text,
        'barbershop'::text,
        'studio'::text,
        'super-studio'::text,
        'contractor'::text,
        'realtor'::text,
        'restaurant'::text
      ]
    )
  );
