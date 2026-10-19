import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth.jsx";
import PlantLog from "./PlantLog.jsx";

const font = "system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', sans-serif";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = 確認中

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div style={{ background: "#F4F6EF", minHeight: "100vh", padding: 24, color: "#6E7A6B", fontFamily: font }}>確認中…</div>;
  }
  if (!session) return <Auth />;
  return <PlantLog user={session.user} onLogout={() => supabase.auth.signOut()} />;
}
