-- 植物アプリ v2：鉢カードを DB に持つ（Atlas と同じプロジェクトの SQL Editor で実行）
-- 既存の 14 鉢はアプリ初回起動時にコードの定義から自動投入されるので、ここでは表だけ作る。

create table if not exists public.plants (
  id           text not null,                       -- 鉢ID（既存は alocasia 等のスラッグ、新規は英数字）
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,                       -- 名前（例：アロカシア）
  sub          text not null default '',            -- 品種・補足（例：グリーンベルベット）
  place        text not null default 'desk',        -- 置き場所 rack/win/shelf/desk
  category     text not null default '',            -- 分類 foliage(観葉)/succulent(多肉)/caudex(塊根)/cactus(サボテン)、'' = 未設定
  soil         text not null default '',
  water_full   text not null default '',            -- たっぷりの量
  water_light  text not null default '',            -- 少量の量
  repot        text not null default '',            -- 植え替えの順番
  intervals    jsonb not null default '[]'::jsonb,  -- [{months:[1..12], min, max, note}]（空なら分類の既定値）
  season_notes jsonb not null default '{}'::jsonb,  -- {spring, summer, winter}
  sort_order   double precision not null default 0,
  archived     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.plants enable row level security;

drop policy if exists "plants own" on public.plants;
create policy "plants own" on public.plants
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
