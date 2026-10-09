-- Revierplaner: Tabelle für die gemeinsamen Revierdaten.
-- In Supabase unter "SQL Editor" einfügen und "Run" klicken.

create table if not exists public.revierplaner_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Nur angemeldete Benutzer dürfen lesen und schreiben.
grant select, insert, update on public.revierplaner_state to authenticated;
alter table public.revierplaner_state enable row level security;

create policy "Angemeldete lesen" on public.revierplaner_state
  for select to authenticated using (true);
create policy "Angemeldete anlegen" on public.revierplaner_state
  for insert to authenticated with check (true);
create policy "Angemeldete aendern" on public.revierplaner_state
  for update to authenticated using (true) with check (true);

-- Live-Aktualisierung auf anderen Geräten.
alter publication supabase_realtime add table public.revierplaner_state;
