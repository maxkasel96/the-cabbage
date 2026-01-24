create table if not exists public.player_selection_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade
);

create index if not exists player_selection_events_tournament_player_idx
  on public.player_selection_events (tournament_id, player_id);

create or replace view public.player_selection_counts as
select
  tournament_id,
  player_id,
  count(*)::int as selection_count
from public.player_selection_events
group by tournament_id, player_id;
