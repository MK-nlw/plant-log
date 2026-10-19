import { useState } from "react";
import { PLACE, CATEGORIES, MONTHS, SEASONS } from "./plants";

const C = { bg: "#F4F6EF", ink: "#1E2A1C", mute: "#6E7A6B", line: "#D8DED0", ok: "#4E7A3A", late: "#B4513A", card: "#FFFFFF", panel: "#FAFBF7" };
const field = { width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 16, border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff" };
const label = { fontSize: 12, color: C.mute, margin: "12px 0 4px" };
const btn = (bg, fg, border) => ({ padding: "10px 14px", borderRadius: 10, border: border || "none", background: bg, color: fg, fontSize: 14, fontWeight: 600, cursor: "pointer" });

// 鉢カードの編集（新規追加も同じ画面。name だけ必須、目安日数は空でもよい＝分類の既定値で「仮」運用）
export default function CardEditor({ plant, isNew, onSave, onArchive, onClose }) {
  const [p, setP] = useState({ ...plant, intervals: (plant.intervals || []).map((x) => ({ ...x, months: [...(x.months || [])] })), season_notes: { ...(plant.season_notes || {}) } });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setP({ ...p, [k]: v });
  const setIv = (i, patch) => set("intervals", p.intervals.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const toggleMonth = (i, m) => { const x = p.intervals[i]; const months = x.months.includes(m) ? x.months.filter((y) => y !== m) : [...x.months, m].sort((a, b) => a - b); setIv(i, { months }); };
  const usedElsewhere = (i, m) => p.intervals.some((x, j) => j !== i && x.months.includes(m));
  const addRow = () => { const used = new Set(p.intervals.flatMap((x) => x.months)); set("intervals", [...p.intervals, { months: MONTHS.filter((m) => !used.has(m)), min: 7, max: 10, note: "" }]); };
  const delRow = (i) => set("intervals", p.intervals.filter((_, j) => j !== i));

  const submit = async () => {
    if (!p.name.trim()) return;
    const clean = { ...p, name: p.name.trim(), intervals: p.intervals.filter((x) => x.months.length && Number(x.min) > 0 && Number(x.max) >= Number(x.min)).map((x) => ({ months: x.months, min: Number(x.min), max: Number(x.max), note: (x.note || "").trim() })) };
    setBusy(true); await onSave(clean); setBusy(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,42,28,.45)", zIndex: 40, overflowY: "auto", WebkitOverflowScrolling: "touch" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, margin: "0 auto", minHeight: "100%", background: C.bg, color: C.ink, padding: "16px 16px 40px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>{isNew ? "鉢を追加" : "カードを編集"}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={btn("#fff", C.ink, `1px solid ${C.line}`)}>キャンセル</button>
            <button onClick={submit} disabled={busy || !p.name.trim()} style={{ ...btn(C.ok, "#fff"), opacity: busy || !p.name.trim() ? .5 : 1 }}>{busy ? "保存中…" : "保存"}</button>
          </div>
        </div>
        {isNew && <p style={{ margin: "0 0 8px", fontSize: 13, color: C.mute, lineHeight: 1.6 }}>名前と分類だけで作れます。目安日数は後から（カードを書いてもらったら）埋めれば OK。それまでは分類の既定値で「仮」運用になります。</p>}

        <div style={label}>名前 *</div>
        <input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="アロカシア" style={field} />
        <div style={label}>品種・補足</div>
        <input value={p.sub} onChange={(e) => set("sub", e.target.value)} placeholder="グリーンベルベット" style={field} />

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={label}>置き場所</div>
            <select value={p.place} onChange={(e) => set("place", e.target.value)} style={field}>{Object.entries(PLACE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>分類</div>
            <select value={p.category} onChange={(e) => set("category", e.target.value)} style={field}>
              <option value="">未設定</option>
              {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </div>
        </div>

        <div style={label}>土</div>
        <input value={p.soil} onChange={(e) => set("soil", e.target.value)} placeholder="観葉用6＋軽石4。鉢底に軽石2cm" style={field} />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><div style={label}>たっぷりの量</div><input value={p.water_full} onChange={(e) => set("water_full", e.target.value)} placeholder="250〜350ml" style={field} /></div>
          <div style={{ flex: 1 }}><div style={label}>少量の量</div><input value={p.water_light} onChange={(e) => set("water_light", e.target.value)} placeholder="100ml" style={field} /></div>
        </div>
        <div style={label}>植え替えの順番</div>
        <input value={p.repot} onChange={(e) => set("repot", e.target.value)} placeholder="前日に水やり → 翌日植え替え" style={field} />

        <div style={{ ...label, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
          <span>水やりの目安日数（月ごと）</span>
          <button onClick={addRow} style={{ ...btn("#fff", C.ink, `1px solid ${C.line}`), padding: "4px 10px", fontSize: 12 }}>＋ 期間を追加</button>
        </div>
        {p.intervals.length === 0 && <div style={{ fontSize: 13, color: C.mute, background: "#EEF3E6", borderRadius: 8, padding: "8px 10px" }}>未設定。{p.category ? `分類「${CATEGORIES[p.category].name}」の既定値で仮運用します` : "分類も未設定なので、そろそろ／遅れの判定はしません"}</div>}
        {p.intervals.map((x, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
              {MONTHS.map((m) => { const on = x.months.includes(m); const other = usedElsewhere(i, m); return (
                <button key={m} onClick={() => !other && toggleMonth(i, m)} disabled={other} style={{ width: 34, padding: "4px 0", borderRadius: 6, fontSize: 12, cursor: other ? "default" : "pointer", border: `1px solid ${on ? C.ink : C.line}`, background: on ? C.ink : other ? "#EEF0EA" : "#fff", color: on ? "#fff" : other ? "#B7BDB2" : C.ink }}>{m}</button>
              ); })}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="number" inputMode="numeric" min={1} value={x.min} onChange={(e) => setIv(i, { min: e.target.value })} style={{ ...field, width: 64, textAlign: "center" }} />
              <span style={{ color: C.mute, fontSize: 13 }}>〜</span>
              <input type="number" inputMode="numeric" min={1} value={x.max} onChange={(e) => setIv(i, { max: e.target.value })} style={{ ...field, width: 64, textAlign: "center" }} />
              <span style={{ color: C.mute, fontSize: 13 }}>日</span>
              <span style={{ flex: 1 }} />
              <button onClick={() => delRow(i)} style={{ fontSize: 12, color: C.late, background: "none", border: "none", cursor: "pointer" }}>削除</button>
            </div>
            <input value={x.note || ""} onChange={(e) => setIv(i, { note: e.target.value })} placeholder="ひとこと（表土が乾いたらたっぷり、など）" style={{ ...field, marginTop: 6, fontSize: 14 }} />
          </div>
        ))}

        <div style={{ ...label, marginTop: 18 }}>季節ごとのメモ（置き場所ガイドの「鉢ごと」に出ます）</div>
        {SEASONS.map((s) => (
          <input key={s.key} value={p.season_notes[s.key] || ""} onChange={(e) => set("season_notes", { ...p.season_notes, [s.key]: e.target.value })} placeholder={s.name.split("（")[0]} style={{ ...field, marginBottom: 6, fontSize: 14 }} />
        ))}

        {!isNew && (
          <div style={{ marginTop: 24, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            <button onClick={() => { if (p.archived || window.confirm(`「${p.name}」を一覧から外しますか？\n記録と写真は消えず、「外した鉢」から戻せます。`)) onArchive(); }} style={{ fontSize: 13, color: C.late, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {p.archived ? "一覧に戻す" : "この鉢を一覧から外す（手放した・枯れた）"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
