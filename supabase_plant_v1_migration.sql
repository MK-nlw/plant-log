-- 植物アプリ v1：Supabase 移行用 SQL（Atlas と同じプロジェクトで実行）
-- SQL Editor に貼って Run。失敗したらエラー文をそのまま貼ってください。

-- 1) 状態テーブル（1ユーザー1行。アプリの保存データを JSON のまま持つ）
create table if not exists public.plant_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.plant_state enable row level security;

drop policy if exists "plant_state own" on public.plant_state;
create policy "plant_state own" on public.plant_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) 写真バケット（読み取りは公開URL、書き込みは自分のフォルダ <user_id>/ 配下のみ）
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

drop policy if exists "plant-photos read" on storage.objects;
create policy "plant-photos read" on storage.objects
  for select using (bucket_id = 'plant-photos');

drop policy if exists "plant-photos insert own" on storage.objects;
create policy "plant-photos insert own" on storage.objects
  for insert with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "plant-photos update own" on storage.objects;
create policy "plant-photos update own" on storage.objects
  for update using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "plant-photos delete own" on storage.objects;
create policy "plant-photos delete own" on storage.objects
  for delete using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
