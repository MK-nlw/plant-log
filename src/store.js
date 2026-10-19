// Supabase データ層
//   plant_state（1ユーザー1行、state = { data: {植物id: {logs, events, tasks}}, photos: {植物id: [{id, date, note, path}]} }）
//   plant-photos バケット（<user_id>/<植物id>/<写真id>.jpg、公開URLで表示）
import { supabase } from "./supabaseClient";

const BUCKET = "plant-photos";

export async function loadState(userId) {
  const { data, error } = await supabase.from("plant_state").select("state").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  const s = data?.state || {};
  return { data: s.data || {}, photos: s.photos || {} };
}

export async function saveState(userId, state) {
  const { error } = await supabase
    .from("plant_state")
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

export function photoPath(userId, plantId, photoId) {
  return `${userId}/${plantId}/${photoId}.jpg`;
}

export async function uploadPhoto(path, blob) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}

export async function removePhoto(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export function photoUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// data: URL（旧アプリの書き出し）→ Blob
export async function dataUrlToBlob(dataUrl) {
  const r = await fetch(dataUrl);
  return await r.blob();
}

// ---- 鉢カード（plants テーブル）----
const PLANT_COLS = "id,name,sub,place,category,soil,water_full,water_light,repot,intervals,season_notes,sort_order,archived";

export async function loadPlants(userId) {
  const { data, error } = await supabase.from("plants").select(PLANT_COLS).eq("user_id", userId).order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

// 1件を追加・更新（指定した列だけ送る）
export async function upsertPlant(userId, plant) {
  const row = { user_id: userId, updated_at: new Date().toISOString() };
  for (const k of PLANT_COLS.split(",")) if (plant[k] !== undefined) row[k] = plant[k];
  const { data, error } = await supabase.from("plants").upsert(row, { onConflict: "user_id,id" }).select(PLANT_COLS).single();
  if (error) throw error;
  return data;
}

// まとめて追加・更新（初回投入・カードJSONの読み込み用）
export async function upsertPlants(userId, plants) {
  const now = new Date().toISOString();
  const rows = plants.map((p) => { const r = { user_id: userId, updated_at: now }; for (const k of PLANT_COLS.split(",")) if (p[k] !== undefined) r[k] = p[k]; return r; });
  const { data, error } = await supabase.from("plants").upsert(rows, { onConflict: "user_id,id" }).select(PLANT_COLS);
  if (error) throw error;
  return data || [];
}
