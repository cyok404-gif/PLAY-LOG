-- =========================================================
-- playlog — Supabase 테이블 설정
-- Supabase 대시보드 → SQL Editor → New query 에 전체를 붙여 넣고 Run
-- 여러 번 실행해도 안전하게 작성됨
-- =========================================================

-- 플레이 기록: 한 판 = 한 줄
create table if not exists public.plays (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game_name   text not null check (char_length(game_name) between 1 and 80),
  is_mm       boolean not null default false,          -- 머더미스터리 여부
  played_on   date not null default current_date,
  players     smallint check (players between 1 and 20),
  result      text check (char_length(result) <= 40),   -- 승리, 2위, 범인 적중 …
  place       text check (char_length(place) <= 40),    -- 집에서, 보드게임 카페 …
  rating      numeric(2,1) check (rating >= 0.5 and rating <= 5 and rating * 2 = floor(rating * 2)),
  memo        text check (char_length(memo) <= 500),
  created_at  timestamptz not null default now()
);

-- 기록하기 화면 개편: 사람별 점수 { "나": 16, "민지": 13 }, 플레이 시간(분)
alter table public.plays add column if not exists scores  jsonb;
alter table public.plays add column if not exists minutes smallint check (minutes between 1 and 1440);

create index if not exists plays_user_date_idx on public.plays (user_id, played_on desc, created_at desc);

-- 로그인한 사용자에게 테이블 사용 권한 (최근 Supabase 프로젝트는 자동으로 주지 않음)
-- 어떤 줄을 볼 수 있는지는 아래 RLS 규칙이 한 번 더 막음. 로그인 안 한 사람(anon)은 권한 없음.
grant select, insert, update, delete on public.plays to authenticated;

-- 행 단위 보안: 로그인한 사람은 자기 기록만 보고, 쓰고, 고치고, 지울 수 있음
alter table public.plays enable row level security;

drop policy if exists "plays: read own"   on public.plays;
drop policy if exists "plays: insert own" on public.plays;
drop policy if exists "plays: update own" on public.plays;
drop policy if exists "plays: delete own" on public.plays;

create policy "plays: read own"   on public.plays for select to authenticated using (user_id = (select auth.uid()));
create policy "plays: insert own" on public.plays for insert to authenticated with check (user_id = (select auth.uid()));
create policy "plays: update own" on public.plays for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "plays: delete own" on public.plays for delete to authenticated using (user_id = (select auth.uid()));
