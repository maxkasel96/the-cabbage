create table if not exists public.spotify_favorite_playlists (
  id uuid primary key default gen_random_uuid(),
  spotify_playlist_id text not null unique,
  playlist_name text not null,
  owner_name text,
  image_url text,
  spotify_url text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spotify_favorite_playlists_sort_order_idx
  on public.spotify_favorite_playlists (sort_order asc, playlist_name asc);

create or replace function public.set_spotify_favorite_playlists_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists spotify_favorite_playlists_set_updated_at on public.spotify_favorite_playlists;
create trigger spotify_favorite_playlists_set_updated_at
before update on public.spotify_favorite_playlists
for each row
execute function public.set_spotify_favorite_playlists_updated_at();
