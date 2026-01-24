alter table public.posts
  add column if not exists images text[] not null default '{}';
