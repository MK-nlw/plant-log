import { useState } from "react";
import { supabase } from "./supabaseClient";

const C = { bg: "#F4F6EF", ink: "#1E2A1C", mute: "#6E7A6B", line: "#D8DED0", ok: "#4E7A3A", late: "#B4513A" };
const font = "system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
const input = { width: "100%", boxSizing: "border-box", padding: "11px 12px", fontSize: 16, border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff", marginBottom: 10 };

// Atlas と同じ Supabase プロジェクトなので、Atlas のアカウント（メール＋パスワード）でそのまま入れる
export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr(error.message === "Invalid login credentials" ? "メールアドレスかパスワードが違います" : error.message);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: font }}>
      <form onSubmit={submit} style={{ maxWidth: 360, margin: "0 auto", padding: "80px 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>植物の水やり</h1>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: C.mute }}>Atlas と同じアカウントでログイン</p>
        <input type="email" autoComplete="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} style={input} required />
        <input type="password" autoComplete="current-password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} style={input} required />
        {err && <p style={{ margin: "0 0 10px", fontSize: 13, color: C.late }}>{err}</p>}
        <button type="submit" disabled={busy} style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: C.ok, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "ログイン中…" : "ログイン"}
        </button>
      </form>
    </div>
  );
}
