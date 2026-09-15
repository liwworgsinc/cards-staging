alter table public.digital_cards
  add column if not exists revision bigint;

update public.digital_cards
set revision = 1
where revision is null or revision < 1;

alter table public.digital_cards
  alter column revision set default 1,
  alter column revision set not null;

create or replace function public.liw_bump_card_revision()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Revisions are server-controlled. Every persisted UPDATE advances the row exactly
  -- once, regardless of which LIW Cards writer performed the update.
  new.revision := coalesce(old.revision, 1) + 1;
  return new;
end;
$$;

drop trigger if exists liw_bump_card_revision on public.digital_cards;
create trigger liw_bump_card_revision
before update on public.digital_cards
for each row execute function public.liw_bump_card_revision();

comment on column public.digital_cards.revision is
  'Monotonic optimistic-concurrency revision. Existing-card saves must compare the revision they loaded before updating.';
