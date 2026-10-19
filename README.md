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
