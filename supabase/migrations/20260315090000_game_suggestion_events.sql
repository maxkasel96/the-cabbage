create table if not exists public.game_suggestion_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade
);

create index if not exists game_suggestion_events_tournament_game_idx
  on public.game_suggestion_events (tournament_id, game_id);

create or replace view public.game_suggestion_counts as
select
  tournament_id,
  game_id,
  count(*)::int as suggestion_count
from public.game_suggestion_events
group by tournament_id, game_id;
