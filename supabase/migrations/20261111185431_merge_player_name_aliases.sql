-- Reviewed against OX CORE team rosters; Трусевич Віталій confirmed by owner.
-- Keep the oldest profile ID and the greater of manual totals and merged event counts.
begin;
set local lock_timeout='5s';
lock table public.players, public.teams, public.matches, public.match_goals, public.match_cards, public.voting_candidates in share row exclusive mode;
create table private.player_dedup_backup (migration text primary key, payload jsonb not null, created_at timestamptz not null default now());
alter table private.player_dedup_backup enable row level security;
revoke all on private.player_dedup_backup from public,anon,authenticated;
insert into private.player_dedup_backup values ('20261111185431',jsonb_build_object(
 'players',(select jsonb_agg(p) from public.players p),'teams',(select jsonb_agg(t) from public.teams t),
 'goals',(select jsonb_agg(g) from public.match_goals g),'cards',(select jsonb_agg(c) from public.match_cards c),
 'voting',(select jsonb_agg(v) from public.voting_candidates v)),now());
create temp table merge_map(old_id integer primary key,keep_id integer,canonical text,old_name text,champ integer,team text) on commit drop;
insert into merge_map values
(9,9,'Борисевич Роман','Борисевич Роман',6,'Вихор'),
(322,9,'Борисевич Роман','Борисевич',6,'Вихор'),
(11,11,'Назарійчук Віталій','Назарійчук Віталій',6,'СК Трійця'),
(334,11,'Назарійчук Віталій','Назарійчук',6,'СК Трійця'),
(12,12,'Слободян Андрій','Слободян Андрій',6,'Вихор'),
(324,12,'Слободян Андрій','Слободян',6,'Вихор'),
(29,29,'Максимець Руслан','Максимець Руслан',6,'Прикарпаття-Тепловик'),
(276,29,'Максимець Руслан','Руслан Максимець',6,'Прикарпаття-Тепловик'),
(31,31,'Конкольняк Ярослав','Конкольняк Ярослав',6,'Вихор'),
(323,31,'Конкольняк Ярослав','Конкольняк',6,'Вихор'),
(32,32,'Сондей Іван','Сондей Іван',6,'Вихор'),
(325,32,'Сондей Іван','Сондей',6,'Вихор'),
(33,33,'Блащук Василь','Блащук Василь',6,'Покуття'),
(326,33,'Блащук Василь','Блащук',6,'Покуття'),
(34,34,'Андрієць Владислав','Андрієць Владислав',6,'ФК Снятин'),
(192,34,'Андрієць Владислав','Владислав Андрієць',6,'ФК Снятин'),
(340,34,'Андрієць Владислав','Андрієць',6,'ФК Снятин'),
(35,35,'Гоянюк Максим','Гоянюк Максим',6,'СК Трійця'),
(333,35,'Гоянюк Максим','Гоянюк',6,'СК Трійця'),
(36,36,'Будейчук Василь','Будейчук Василь',6,'СК Трійця'),
(332,36,'Будейчук Василь','Будейчук',6,'СК Трійця'),
(37,37,'Шевчук Олександр',' Шевчук Олександр',6,'СК Трійця'),
(335,37,'Шевчук Олександр','Шевчук',6,'СК Трійця'),
(39,39,'Ємельянов Владислав','Ємельянов Владислав',6,'ФК Вільхівці'),
(170,39,'Ємельянов Владислав','Владислав Ємельянов',6,'ФК Вільхівці'),
(338,39,'Ємельянов Владислав','Ємельянов',6,'ФК Вільхівці'),
(40,40,'Дитко Роман','Дитко Роман',6,'ФК Вільхівці'),
(184,40,'Дитко Роман','Роман Дитко',6,'ФК Вільхівці'),
(337,40,'Дитко Роман','Дитко',6,'ФК Вільхівці'),
(43,43,'Сапа Андрій','Сапа Андрій',8,'Прут'),
(352,43,'Сапа Андрій','Сапа',8,'Прут'),
(45,45,'Пророчук Павло','Пророчук Павло',8,'Кремінь'),
(346,45,'Пророчук Павло','Пророчук',8,'Кремінь'),
(47,47,'Олевич Ярослав','Олевич Ярослав',8,'Сокіл'),
(355,47,'Олевич Ярослав','Олевич',8,'Сокіл'),
(48,48,'Мельничук Андрій','Мельничук Андрій',8,'Сокіл'),
(354,48,'Мельничук Андрій','Мельничук',8,'Сокіл'),
(50,50,'Сімановський Віталій','Сімановський Віталій',8,'Хутровик'),
(358,50,'Сімановський Віталій','Сімановський',8,'Хутровик'),
(52,52,'Ілюк Максим','Ілюк Максим',6,'Покуття'),
(327,52,'Ілюк Максим','Ілюк',6,'Покуття'),
(53,53,'Ключко Едуард','Ключко Едуард',6,'Покуття'),
(328,53,'Ключко Едуард','Ключко',6,'Покуття'),
(54,54,'Супрунюк Максим','Супрунюк Максим',6,'Прикарпаття-Тепловик'),
(277,54,'Супрунюк Максим','Максим Супрунюк',6,'Прикарпаття-Тепловик'),
(59,59,'Шкварилюк Захар','Шкварилюк Захар',6,'ФК Вільхівці'),
(185,59,'Шкварилюк Захар','Захар Шкварилюк',6,'ФК Вільхівці'),
(66,66,'Макотяк Дмитро','Макотяк Дмитро',6,'Прикарпаття-Тепловик'),
(275,66,'Макотяк Дмитро','Дмитро Макотяк',6,'Прикарпаття-Тепловик'),
(67,67,'Титов Дмитро','Титов Дмитро',6,'Прикарпаття-Тепловик'),
(274,67,'Титов Дмитро','Дмитро Титов',6,'Прикарпаття-Тепловик'),
(75,75,'Львов Леонід','Львов Леонід',11,'УСК Довбуш'),
(359,75,'Львов Леонід','Львов',11,'УСК Довбуш'),
(88,88,'Феліпович Владислав','Феліпович',6,'Вихор'),
(222,88,'Феліпович Владислав','Феліпович Владислав',6,'Вихор'),
(89,89,'Остапчук Михайло','Остапчук',6,'Вихор'),
(211,89,'Остапчук Михайло','Остапчук Михайло',6,'Вихор'),
(90,90,'Марій Владислав','Марій',6,'Горгани'),
(146,90,'Марій Владислав','Марій Владислав',6,'Горгани'),
(91,91,'Бойко Тарас','Бойко',6,'ФК Вільхівці'),
(178,91,'Бойко Тарас','Тарас Бойко',6,'ФК Вільхівці'),
(94,94,'Староселиць Олександр','Староселиць',6,'СК Трійця'),
(229,94,'Староселиць Олександр','Староселиць Олександр',6,'СК Трійця'),
(119,119,'Заторський Віталій','Заторський',6,'Горгани'),
(147,119,'Заторський Віталій','Заторський Віталій',6,'Горгани'),
(191,191,'Липчук Микола','Микола Липчук',6,'ФК Снятин'),
(341,191,'Липчук Микола','Липчук',6,'ФК Снятин'),
(120,120,'Трусевич Віталій','Трусевич',6,'Горгани'),
(149,120,'Трусевич Віталій','Трусевич Віталій',6,'Горгани');
do $$ begin
 if exists(select 1 from merge_map m left join public.players p on p.id=m.old_id where p.id is null or p.name<>m.old_name or p.team<>m.team or p.championship_id<>m.champ) then raise exception 'Player data changed since review; abort cleanup'; end if;
end $$;
create table private.player_name_aliases(championship_id integer not null,team text not null,alias_key text not null,player_id integer not null references public.players(id) on delete cascade,primary key(championship_id,team,alias_key));
alter table private.player_name_aliases enable row level security;
revoke all on private.player_name_aliases from public,anon,authenticated;
grant select on private.player_name_aliases to authenticated;
create policy aliases_read on private.player_name_aliases for select to authenticated using(true);
insert into private.player_name_aliases select champ,team,private.player_name_key(old_name),keep_id from merge_map;
select set_config('ksliga.skip_player_stat_sync','on',true);
-- Rewrite every name-based relationship before removing duplicate records.
update public.match_goals e set player_name=m.canonical from merge_map m,public.matches mt where mt.id=e.match_id and mt.championship_id=m.champ and private.player_name_key(e.team_name)=private.player_name_key(m.team) and private.player_name_key(e.player_name)=private.player_name_key(m.old_name);
update public.match_cards e set player_name=m.canonical from merge_map m,public.matches mt where mt.id=e.match_id and mt.championship_id=m.champ and private.player_name_key(e.team_name)=private.player_name_key(m.team) and private.player_name_key(e.player_name)=private.player_name_key(m.old_name);
update public.voting_candidates e set player_name=m.canonical from merge_map m,public.matches mt where mt.id=e.match_id and mt.championship_id=m.champ and private.player_name_key(e.team_name)=private.player_name_key(m.team) and private.player_name_key(e.player_name)=private.player_name_key(m.old_name);
-- No roster write here yet: its existing trigger would recreate deleted names.
create temp table merged_totals on commit drop as select m.keep_id,max(p.goals) goals,max(p.yellow_cards) yellow_cards,max(p.red_cards) red_cards from merge_map m join public.players p on p.id=m.old_id group by m.keep_id;
alter table public.players disable trigger players_protect_linked;
delete from public.players p using merge_map m where p.id=m.old_id and m.old_id<>m.keep_id;
alter table public.players enable trigger players_protect_linked;
update public.players p set name=m.canonical,goals=t.goals,yellow_cards=t.yellow_cards,red_cards=t.red_cards from merge_map m,merged_totals t where p.id=m.keep_id and m.keep_id=t.keep_id;
-- Events may contain disjoint contributions. Never fall below their actual total.
with counts as (
 select p.id,count(g.id) filter(where g.goal_type<>'own_goal')::integer n from public.players p join public.matches mt on mt.championship_id=p.championship_id and mt.is_finished and not coalesce(mt.is_technical_defeat,false) join public.match_goals g on g.match_id=mt.id and private.player_name_key(g.player_name)=private.player_name_key(p.name) and private.player_name_key(g.team_name)=private.player_name_key(p.team) where p.id in(select keep_id from merge_map) group by p.id
) update public.players p set goals=greatest(p.goals,c.n) from counts c where p.id=c.id;
with counts as (
 select p.id,count(c.id) filter(where c.card_type in('yellow','yellow_red'))::integer y,count(c.id) filter(where c.card_type in('red','yellow_red'))::integer r from public.players p join public.matches mt on mt.championship_id=p.championship_id and mt.is_finished and not coalesce(mt.is_technical_defeat,false) join public.match_cards c on c.match_id=mt.id and private.player_name_key(c.player_name)=private.player_name_key(p.name) and private.player_name_key(c.team_name)=private.player_name_key(p.team) where p.id in(select keep_id from merge_map) group by p.id
) update public.players p set yellow_cards=greatest(p.yellow_cards,c.y),red_cards=greatest(p.red_cards,c.r) from counts c where p.id=c.id;
select set_config('ksliga.skip_player_stat_sync','',true);

create function private.player_token_key(value text) returns text language sql immutable strict security invoker set search_path='' as $$
 select string_agg(token,' ' order by token) from unnest(string_to_array(translate(private.player_name_key(value),'’ʼ',chr(39)||chr(39)),' ')) token
$$;
create function private.canonical_player_name(champ integer,team_name text,input_name text) returns text language plpgsql stable security invoker set search_path='' as $$
declare resolved text; n integer;
begin
 select p.name into resolved from private.player_name_aliases a join public.players p on p.id=a.player_id where a.championship_id=champ and private.player_name_key(p.team)=private.player_name_key(team_name) and a.alias_key=private.player_name_key(input_name);
 if resolved is not null then return resolved; end if;
 -- Full-name word order and apostrophe variants are safe only for one existing identity.
 if position(' ' in private.clean_player_name(input_name))>0 then
 select min(p.name),count(*) into resolved,n from public.players p where p.championship_id=champ and private.player_name_key(p.team)=private.player_name_key(team_name) and private.player_token_key(p.name)=private.player_token_key(input_name);
 if n=1 then return resolved; end if;
 end if;
 return private.clean_player_name(input_name);
end $$;
create function private.canonicalize_player_record() returns trigger language plpgsql security invoker set search_path='' as $$ begin
 new.name:=private.canonical_player_name(new.championship_id,new.team,new.name);return new;end $$;
create trigger players_canonical_name before insert on public.players for each row execute function private.canonicalize_player_record();
create function private.canonicalize_event_player() returns trigger language plpgsql security invoker set search_path='' as $$ declare champ integer;begin
 select championship_id into champ from public.matches where id=new.match_id;
 new.player_name:=private.canonical_player_name(champ,new.team_name,new.player_name);return new;end $$;
create trigger match_goals_canonical_name before insert or update of player_name,team_name,match_id on public.match_goals for each row execute function private.canonicalize_event_player();
create trigger match_cards_canonical_name before insert or update of player_name,team_name,match_id on public.match_cards for each row execute function private.canonicalize_event_player();
create trigger voting_candidates_canonical_name before insert or update of player_name,team_name,match_id on public.voting_candidates for each row execute function private.canonicalize_event_player();
create or replace function private.normalize_team_roster() returns trigger language plpgsql security invoker set search_path='' as $$ begin
 select coalesce(array_agg(item.name order by item.position),'{}'::text[]) into new.roster from (
 select distinct on(private.player_name_key(private.canonical_player_name(new.championship_id,new.name,value))) private.canonical_player_name(new.championship_id,new.name,value) name,position from unnest(new.roster) with ordinality roster(value,position) where private.clean_player_name(value)<>'' order by private.player_name_key(private.canonical_player_name(new.championship_id,new.name,value)),position
 ) item;return new;end $$;
update public.teams t set roster=roster where championship_id in(select champ from merge_map);
revoke all on function private.player_token_key(text),private.canonical_player_name(integer,text,text),private.canonicalize_player_record(),private.canonicalize_event_player() from public,anon,authenticated;
grant execute on function private.player_token_key(text),private.canonical_player_name(integer,text,text),private.canonicalize_player_record(),private.canonicalize_event_player() to authenticated;
commit;

