-- =========================================================
-- playlog — 내 정보(프로필) + 프로필 사진 보관함
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여 넣고 Run (여러 번 실행해도 안전)
-- =========================================================

-- 1) 프로필: 사람마다 한 줄 (닉네임, 사진 주소)
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text check (char_length(nickname) between 1 and 20),
  avatar_url  text check (char_length(avatar_url) <= 500),
  updated_at  timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
alter table public.profiles enable row level security;

drop policy if exists "profiles: read"       on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

-- 닉네임·사진은 리뷰 등에서 다른 사람에게도 보여야 하므로, 로그인한 사람은 누구나 읽기 가능
create policy "profiles: read"       on public.profiles for select to authenticated using (true);
-- 쓰기는 자기 것만
create policy "profiles: insert own" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- 2) 프로필 사진 보관함: 공개 읽기, 2MB 이하 이미지만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 사진은 avatars/<내 아이디>/파일 에만 올리고 지울 수 있음
drop policy if exists "avatars: read own"   on storage.objects;
drop policy if exists "avatars: insert own" on storage.objects;
drop policy if exists "avatars: update own" on storage.objects;
drop policy if exists "avatars: delete own" on storage.objects;

create policy "avatars: read own"   on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
