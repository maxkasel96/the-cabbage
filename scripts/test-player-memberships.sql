-- Run after the migration on a disposable database. All test records roll back.
begin;
create function pg_temp.assert_ok(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'Failed: %', detail; end if; end $$;

insert into public.players(id,display_name,is_active) values
  ('10000000-0000-0000-0000-000000000001','Test member',true);
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
  ('20000000-0000-0000-0000-000000000001','member@example.test',null,'{}','{"role":"admin"}'),
  ('20000000-0000-0000-0000-000000000002','admin@example.test',now(),'{"role":"admin"}','{}');
select public.prepare_player_invitation('10000000-0000-0000-0000-000000000001','Member@example.test');
select public.prepare_player_invitation('10000000-0000-0000-0000-000000000001','member@example.test');

set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"email":"member@example.test","amr":[{"method":"otp"}]}',true);
do $$ begin
  begin perform public.accept_player_invitation(); raise exception 'Unverified email claimed a player';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update auth.users set email_confirmed_at=now() where email='member@example.test';
set local role authenticated;
do $$
declare session_claims text;
begin
  foreach session_claims in array array[
    '{"email":"member@example.test","amr":[{"method":"password"}]}',
    '{"email":"different@example.test","amr":[{"method":"otp"}]}',
    '{"email":"member@example.test","phone":"+15555550100","amr":[{"method":"otp"}]}',
    '{"email":"member@example.test","amr":[{"method":"oauth"}]}'
  ] loop
    perform set_config('request.jwt.claims',session_claims,true);
    begin
      perform public.accept_player_invitation();
      raise exception 'Session without proof of invited email claimed a player';
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;
savepoint google_claim;
reset role;
insert into auth.identities(user_id,provider_id,provider,identity_data) values (
  '20000000-0000-0000-0000-000000000001','test-google-sub','google',
  '{"sub":"test-google-sub","email":"member@example.test","email_verified":true}'
);
set local role authenticated;
select set_config('request.jwt.claims','{"email":"member@example.test","amr":[{"method":"oauth"}]}',true);
select pg_temp.assert_ok(public.accept_player_invitation()='10000000-0000-0000-0000-000000000001','verified Google claim');
rollback to google_claim;
select set_config('request.jwt.claims','{"email":"member@example.test","amr":[{"method":"otp"}]}',true);
select pg_temp.assert_ok(public.accept_player_invitation()='10000000-0000-0000-0000-000000000001','verified claim');
select pg_temp.assert_ok(not cabbage_private.is_admin(),'member role is server-controlled');
select pg_temp.assert_ok(not has_table_privilege(current_user,'public.games','UPDATE'),'catalog edits reserved for admins');
reset role;
update auth.users set email='changed@example.test' where id='20000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"email":"changed@example.test","amr":[{"method":"password"}]}',true);
select pg_temp.assert_ok(public.accept_player_invitation()=cabbage_private.member_player(),'returning account survives email change');

-- Use a real tournament if the fixture has one and the schema requires a foreign key.
reset role;
create temporary table membership_test_tournament(id uuid);
do $$ begin
  if to_regclass('public.tournaments') is not null then
    execute 'insert into membership_test_tournament select id from public.tournaments limit 1';
  end if;
end $$;
insert into membership_test_tournament select gen_random_uuid() where not exists(select 1 from membership_test_tournament);
grant select on membership_test_tournament to authenticated;

set local role authenticated;
insert into public.posts(tournament_id,author_id,author_user_id,author_name,message)
select id,cabbage_private.member_player(),auth.uid(),'Test member','membership test post' from membership_test_tournament;
update public.posts set message='updated test post' where message='membership test post';
select pg_temp.assert_ok(exists(select 1 from public.posts where message='updated test post'),'edit own post');
insert into public.rules(tournament_id,content,status) select id,'membership test rule','Proposed' from membership_test_tournament;
update public.rules set status='Accepted' where content='membership test rule';
select pg_temp.assert_ok(exists(select 1 from public.rules where content='membership test rule' and status='Proposed'),'member cannot moderate rules');

reset role;
insert into public.players(id,display_name,is_active) values
  ('10000000-0000-0000-0000-000000000002','Second member',true);
insert into auth.users(id,email,email_confirmed_at) values
  ('20000000-0000-0000-0000-000000000003','second@example.test',now());
insert into public.player_memberships(player_id,invited_email,user_id) values
  ('10000000-0000-0000-0000-000000000002','second@example.test','20000000-0000-0000-0000-000000000003');
set local role anon;
select pg_temp.assert_ok(not has_table_privilege(current_user,'public.posts','DELETE'),'visitors cannot delete');
select pg_temp.assert_ok(not has_table_privilege(current_user,'public.player_memberships','SELECT'),'invitation emails are private');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
update public.posts set message='changed by other player' where message='updated test post';
delete from public.posts where message='updated test post';
select pg_temp.assert_ok(exists(select 1 from public.posts where message='updated test post'),'other members cannot edit or delete');
do $$ begin
  begin
    insert into public.rules(tournament_id,content,status) select id,'preapproved','Accepted' from membership_test_tournament;
    raise exception 'Member approved a proposal during creation';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select pg_temp.assert_ok(cabbage_private.is_admin(),'unlinked admin can manage');
update public.rules set status='Accepted' where content='membership test rule';
select pg_temp.assert_ok(exists(select 1 from public.rules where content='membership test rule' and status='Accepted'),'admin moderates');
reset role;
update public.player_memberships set is_active=false where user_id='20000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select pg_temp.assert_ok(cabbage_private.member_player() is null,'existing session loses membership');
delete from public.posts where message='updated test post';
select pg_temp.assert_ok(exists(select 1 from public.posts where message='updated test post'),'disabled user cannot delete');
rollback;
