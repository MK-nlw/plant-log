# 植物の水やり（plant-log）

Claude アーティファクト版 watering-log.jsx を Vite + React + Supabase に移したもの。
Atlas と同じ Supabase プロジェクト（nepnpfeawljcllfttutd）を共用し、Vercel は別プロジェクトとして公開する。

## 構成
- `src/plants.js` … 植物データ・季節ガイド（旧アプリから移植）
- `src/store.js` … Supabase 層（plant_state テーブル・plant-photos バケット）
- `src/PlantLog.jsx` … 画面本体
- `src/Auth.jsx` / `src/App.jsx` … ログイン（Atlas と同じアカウント）
- `supabase_plant_v1_migration.sql` … 初回に SQL Editor で実行する SQL

## データの持ち方
- `plant_state`：1ユーザー1行。`state` = `{ data: {植物id: {logs, events, tasks}}, photos: {植物id: [{id, date, note, path}]} }`
- 写真の実体は Storage `plant-photos/<user_id>/<植物id>/<写真id>.jpg`（公開URLで表示）

## ローカルで動かす（PowerShell）
```
npm install
copy .env.example .env     # .env を開いて anon key を入れる
npm run dev
```

## 本番（Vercel）
GitHub の main に push → Vercel が自動ビルド。
Vercel 側の Environment Variables に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を登録しておく（.env と同じ値）。

## v2：鉢カードを DB に（2026-10-20）
- `supabase_plant_v2_plants.sql` を実行 → 初回起動時に旧コードの 14 鉢が `plants` テーブルへ自動投入される
- 右上「＋ 鉢」で名前と分類だけで追加できる。目安日数が無い間は分類の既定値で「仮」運用（バッジ表示）、分類も無ければ「目安未設定」で判定しない
- 各鉢の「カードを編集」で目安日数（月ごと）・水の量・土・植え替え・季節メモを直せる。「一覧から外す」で手放した鉢を隠す（記録は残る）
- Claude に書いてもらった鉢カードは JSON で「記録の控え」→「ファイルから」で取り込める。形式：

```json
{"plants":[{
  "id": "monstera_tc", "name": "モンステラ", "sub": "タイコンステレーション（斑入り）",
  "place": "desk", "category": "foliage",
  "soil": "観葉用6＋軽石4。鉢底に軽石2cm", "water_full": "300〜400ml", "water_light": "100ml",
  "repot": "前日に水やり → 翌日植え替え",
  "intervals": [
    {"months":[5,6,7,8,9], "min":7, "max":11, "note":"表土が乾いたらたっぷり"},
    {"months":[4,10], "min":9, "max":14, "note":"乾いてから"},
    {"months":[11,12,1,2,3], "min":14, "max":21, "note":"乾いて数日後に控えめに。10℃以上"}
  ],
  "season_notes": {"spring":"…","summer":"…","winter":"…"}
}]}
```
  同じ `id` があれば上書き（指定した項目だけ）、無ければ追加。place は rack/win/shelf/desk、category は foliage/succulent/caudex/cactus
