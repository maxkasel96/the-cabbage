create function public.eligible_picker_games(p_tournament_id uuid, p_tags text[], p_player_count integer)
returns table (id uuid, name text, min_players integer, max_players integer, playtime_minutes integer, notes text)
language sql stable security invoker set search_path = ''
as $$
  with selected_groups as (
    select array_agg(t.id) as tag_ids
    from unnest(p_tags) as picked(slug)
    left join public.tags t on t.slug = picked.slug
    -- Keep unknown slugs in their own unsatisfiable group.
    group by (t.id is null), nullif(t.category, '')
  )
  select g.id, g.name, g.min_players, g.max_players, g.playtime_minutes, g.notes
  from public.games g
  where g.is_active
    and (p_player_count is null or p_player_count between g.min_players and g.max_players)
    and exists (select 1 from public.tournaments t where t.id = p_tournament_id and t.is_active)
    and not exists (
      select 1 from public.plays p where p.tournament_id = p_tournament_id
        and p.game_id = g.id and p.played_at is not null
    )
    and not exists (
      select 1 from selected_groups s where not exists (
        select 1 from public.game_tags gt where gt.game_id = g.id and gt.tag_id = any(s.tag_ids)
      )
    )
$$;

create function public.pick_random_game(p_tournament_id uuid, p_tags text[], p_player_count integer, p_previous_id uuid)
returns table (id uuid, name text, min_players integer, max_players integer, playtime_minutes integer, notes text)
language sql volatile security invoker set search_path = ''
as $$
  select g.* from public.eligible_picker_games(p_tournament_id, p_tags, p_player_count) g
  order by (g.id is not distinct from p_previous_id), random()
  limit 1
$$;

create or replace function public.pick_random_game(p_tournament_id uuid, p_tags text[], p_player_count integer)
returns table (id uuid, name text, min_players integer, max_players integer, playtime_minutes integer, notes text)
language sql volatile security invoker set search_path = ''
as $$
  select * from public.pick_random_game(p_tournament_id, p_tags, p_player_count, null::uuid)
$$;

revoke all on function public.eligible_picker_games(uuid, text[], integer) from public;
grant execute on function public.eligible_picker_games(uuid, text[], integer) to anon, authenticated, service_role;

revoke all on function public.pick_random_game(uuid, text[], integer, uuid) from public;
grant execute on function public.pick_random_game(uuid, text[], integer, uuid) to anon, authenticated, service_role;
