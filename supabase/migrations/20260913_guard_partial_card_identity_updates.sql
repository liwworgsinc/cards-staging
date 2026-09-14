create or replace function public.liw_guard_partial_card_identity_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.full_name is not null
     and btrim(old.full_name) <> ''
     and old.full_name <> 'Untitled Card'
     and new.full_name = 'Untitled Card' then
    new.full_name := old.full_name;
    new.slug := old.slug;
  end if;
  return new;
end;
$$;

drop trigger if exists liw_guard_partial_card_identity_update on public.digital_cards;
create trigger liw_guard_partial_card_identity_update
before update on public.digital_cards
for each row execute function public.liw_guard_partial_card_identity_update();
