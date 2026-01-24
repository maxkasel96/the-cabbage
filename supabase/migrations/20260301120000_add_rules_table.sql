create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  content text not null,
  status text not null default 'Proposed',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint rules_status_check check (status in ('Proposed', 'Accepted', 'Rejected'))
);

create index if not exists rules_tournament_id_idx on public.rules (tournament_id);
