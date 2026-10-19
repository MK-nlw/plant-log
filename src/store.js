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
