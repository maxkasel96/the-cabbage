-- The fixture is visible only inside this transaction.
begin;
do $$
declare
  tournament uuid;
  game uuid;
  alternative uuid;
  drawing uuid;
  words uuid;
  teams uuid;
  found_game uuid;
begin
  select id into tournament from public.tournaments where is_active;
  if tournament is null then
    insert into public.tournaments(label, year_start, year_end, is_active)
    values ('Picker fixture', 2100, 2101, true) returning id into tournament;
  end if;
  insert into public.games(name,min_players,max_players) values ('Picker fixture',2,4) returning id into game;
  insert into public.tags(slug,label,category) values ('fixture_drawing','Fixture drawing','gameplay_mechanics') returning id into drawing;
  insert into public.tags(slug,label,category) values ('fixture_words','Fixture words','gameplay_mechanics') returning id into words;
  insert into public.tags(slug,label,category) values ('fixture_teams','Fixture teams','group_structure') returning id into teams;
  insert into public.game_tags(game_id,tag_id) values (game,drawing);

  select id into found_game from public.pick_random_game(tournament,array['fixture_words','fixture_drawing'],2);
  if found_game is distinct from game then raise exception 'OR or inclusive minimum failed'; end if;
  if exists (select 1 from public.pick_random_game(tournament,array['fixture_drawing','fixture_teams'],4))
    then raise exception 'Missing category passed'; end if;
  insert into public.game_tags(game_id,tag_id) values (game,teams);
  select id into found_game from public.pick_random_game(tournament,array['fixture_words','fixture_drawing','fixture_teams'],4);
  if found_game is distinct from game then raise exception 'AND or inclusive maximum failed'; end if;
  if exists (select 1 from public.pick_random_game(tournament,array['fixture_teams'],1))
     or exists (select 1 from public.pick_random_game(tournament,array['fixture_teams'],5))
    then raise exception 'Out-of-range group size passed'; end if;
  select id into found_game from public.pick_random_game(tournament,array['fixture_teams'],4,game);
  if found_game is distinct from game then raise exception 'Single eligible game lost on reroll'; end if;
  insert into public.games(name,min_players,max_players) values ('Alternative picker fixture',4,6) returning id into alternative;
  insert into public.game_tags(game_id,tag_id) values (alternative,teams);
  if (select count(*) from public.eligible_picker_games(tournament,array['fixture_teams'],4)) <> 2
     or (select count(*) from public.eligible_picker_games(tournament,array['fixture_teams'],2)) <> 1
    then raise exception 'Incorrect pool size'; end if;
  select id into found_game from public.pick_random_game(tournament,array['fixture_teams'],4,game);
  if found_game is distinct from alternative then raise exception 'Reroll repeated the previous game'; end if;
  update public.games set is_active=false where id=alternative;
  update public.games set min_players=null where id=game;
  if exists (select 1 from public.pick_random_game(tournament,array['fixture_teams'],3))
    then raise exception 'Unknown minimum passed'; end if;
  update public.games set min_players=2,max_players=null where id=game;
  if exists (select 1 from public.pick_random_game(tournament,array['fixture_teams'],3))
    then raise exception 'Unknown maximum passed'; end if;
  select id into found_game from public.pick_random_game(tournament,array['fixture_teams'],null);
  if found_game is distinct from game then raise exception 'Blank player count failed'; end if;
  update public.games set is_active=false where id=game;
  if exists (select 1 from public.pick_random_game(tournament,array['fixture_teams'],null))
    then raise exception 'Inactive game passed'; end if;
  update public.games set is_active=true where id=game;
  insert into public.plays(tournament_id,game_id) values (tournament,game);
  if exists (select 1 from public.pick_random_game(tournament,array['fixture_teams'],null))
    then raise exception 'Already played game passed'; end if;
end $$;
rollback;
