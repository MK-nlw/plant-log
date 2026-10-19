import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  // .env（ローカル）か Vercel の Environment Variables に設定する
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が設定されていません");
}
export const supabase = createClient(url, key);
