import { useState, useEffect, useRef, useCallback } from "react";
import { SEASONS, EVENT_TYPES, PLACE, PLACE_DESC, MIST, CATEGORIES, SEED_PLANTS, intervalFor, cardStatus, newPlantId, emptyPlant } from "./plants";
import { loadState, saveState, photoPath, uploadPhoto, removePhoto, photoUrl, dataUrlToBlob, loadPlants, upsertPlant, upsertPlants } from "./store";
import CardEditor from "./CardEditor.jsx";

const C = { bg: "#F4F6EF", ink: "#1E2A1C", mute: "#6E7A6B", line: "#D8DED0", ok: "#4E7A3A", soon: "#C9962E", late: "#B4513A", card: "#FFFFFF", panel: "#FAFBF7" };

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const fmt = (d) => { const x = new Date(d); return `${x.getMonth() + 1}/${x.getDate()}`; };
const fmtY = (d) => { const x = new Date(d); return `${x.getFullYear()}/${x.getMonth() + 1}/${x.getDate()}`; };
const uid = () => Math.random().toString(36).slice(2, 9);

// 画像を縮小して JPEG Blob に（長辺900px）
const shrink = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => { const img = new Image(); img.onload = () => {
    const max = 900, s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.72);
  }; img.onerror = rej; img.src = r.result; };
  r.onerror = rej; r.readAsDataURL(file);
});

const btn = (bg, fg, border) => ({ padding: "10px 0", borderRadius: 10, border: border || "none", background: bg, color: fg, fontSize: 14, fontWeight: 600, cursor: "pointer", flex: 1 });
const small = { fontSize: 12, color: C.mute, background: "none", border: "none", cursor: "pointer", padding: 0 };
const font = "system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', sans-serif";

export default function PlantLog({ user, onLogout }) {
  const [data, setData] = useState({});
  const [plants, setPlants] = useState([]); // 鉢カード（plants テーブル）
  const [editor, setEditor] = useState(null); // { plant, isNew }
  const [showArchived, setShowArchived] = useState(false);
  const [photos, setPhotos] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [open, setOpen] = useState(null);
  const [tab, setTab] = useState("water"); // water | plan
  const [filter, setFilter] = useState("all");
  const [noteDraft, setNoteDraft] = useState("");
  const [evType, setEvType] = useState("植え替え");
  const [evNote, setEvNote] = useState("");
  const [evDate, setEvDate] = useState(today()); // できごとの日付（既定＝今日、過去も可）
  const [taskDraft, setTaskDraft] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [viewer, setViewer] = useState(null);
  const [photoDate, setPhotoDate] = useState(today()); // 写真の日付（既定＝今日、過去の写真も入れられる）
  const [guideOpen, setGuideOpen] = useState(false);
  const [ioOpen, setIoOpen] = useState(false);
  const [ioText, setIoText] = useState("");
  const [guideKey, setGuideKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);
  const ioFileRef = useRef(null);
  const stateRef = useRef({ data: {}, photos: {} });
  const now = new Date();
  const month = now.getMonth() + 1;

  const say = (t) => { setToast(t); setTimeout(() => setToast(""), 2200); };

  // ---- 読み込み ----
  const reload = useCallback(async () => {
    try {
      const [s, pl] = await Promise.all([loadState(user.id), loadPlants(user.id)]);
      stateRef.current = s;
      setData(s.data); setPhotos(s.photos);
      // 鉢カードがまだ無ければ、旧コードの 14 鉢を初回投入
      setPlants(pl.length ? pl : await upsertPlants(user.id, SEED_PLANTS));
      setLoadErr("");
    } catch (e) {
      console.error(e); setLoadErr("記録を読み込めませんでした。通信状態を確認して再読み込みしてください");
    }
    setLoaded(true);
  }, [user.id]);

  useEffect(() => { reload(); }, [reload]);
  // 別の端末で更新した分を、画面に戻ってきたときに取り込む
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reload]);

  // ---- 保存（data と photos をまとめて1行に）----
  const persist = async (nextData, nextPhotos) => {
    const next = { data: nextData ?? stateRef.current.data, photos: nextPhotos ?? stateRef.current.photos };
    const prev = stateRef.current;
    stateRef.current = next;
    setData(next.data); setPhotos(next.photos);
    try { await saveState(user.id, next); return true; }
    catch (e) {
      console.error(e); stateRef.current = prev; setData(prev.data); setPhotos(prev.photos);
      say("保存できませんでした。もう一度お試しください"); return false;
    }
  };
  const save = (nextData) => persist(nextData, undefined);
  const P = (id) => data[id] || {};
  const upd = (id, patch) => save({ ...data, [id]: { ...P(id), ...patch } });
  const nameOf = (id) => plants.find((x) => x.id === id)?.name || id;

  // ---- 鉢カード ----
  const savePlant = async (card, msg) => {
    try {
      const saved = await upsertPlant(user.id, card);
      setPlants((cur) => { const i = cur.findIndex((x) => x.id === saved.id); const next = i >= 0 ? cur.map((x) => (x.id === saved.id ? saved : x)) : [...cur, saved]; return next.sort((a, b) => a.sort_order - b.sort_order); });
      setEditor(null); say(msg || (editor?.isNew ? `${saved.name}を追加しました` : `${saved.name}のカードを保存`));
    } catch (e) { console.error(e); say("保存できませんでした。もう一度お試しください"); }
  };
  const openNewPlant = () => { const maxOrder = Math.max(0, ...plants.map((x) => x.sort_order || 0)); setEditor({ plant: { ...emptyPlant(newPlantId()), sort_order: maxOrder + 1000 }, isNew: true }); };
  const archivePlant = async (plant) => { await savePlant({ ...plant, archived: !plant.archived }, plant.archived ? `${plant.name}を一覧に戻しました` : `${plant.name}を一覧から外しました`); setOpen(null); };

  // ---- 水やり ----
  const water = async (id, kind) => {
    const logs = P(id).logs || [];
    const ok = await upd(id, { logs: [{ date: today(), kind, note: noteDraft.trim() }, ...logs].slice(0, 80) });
    if (ok) { setNoteDraft(""); say(`${nameOf(id)}に水やりを記録`); }
  };
  const undoWater = (id) => { const logs = P(id).logs || []; if (logs.length) upd(id, { logs: logs.slice(1) }); };

  // ---- できごと・予定 ----
  const addEvent = async (id, type, note, date) => {
    const ev = P(id).events || [];
    const list = [{ id: uid(), date: date || today(), type, note: (note || "").trim() }, ...ev].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return upd(id, { events: list });
  };
  const delEvent = (id, eid) => upd(id, { events: (P(id).events || []).filter((e) => e.id !== eid) });
  const addTask = async (id) => {
    if (!taskDraft.trim()) return;
    const ok = await upd(id, { tasks: [...(P(id).tasks || []), { id: uid(), title: taskDraft.trim(), due: taskDue || "", done: false }] });
    if (ok) { setTaskDraft(""); setTaskDue(""); }
  };
  const doneTask = async (id, t) => {
    // 完了 → できごととして記録し、予定から外す
    const type = EVENT_TYPES.find((k) => t.title.includes(k)) || "その他";
    const ev = P(id).events || [];
    const ok = await save({ ...data, [id]: { ...P(id), tasks: (P(id).tasks || []).filter((x) => x.id !== t.id), events: [{ id: uid(), date: today(), type, note: t.title }, ...ev] } });
    if (ok) say(`${nameOf(id)}：完了して記録しました`);
  };
  const delTask = (id, tid) => upd(id, { tasks: (P(id).tasks || []).filter((x) => x.id !== tid) });

  // ---- 写真（Storage にアップロードし、メタ情報だけ state に持つ）----
  const addPhoto = async (id, file) => {
    if (!file) return; setBusy(true);
    try {
      const blob = await shrink(file);
      const pid = uid();
      const path = await uploadPhoto(photoPath(user.id, id, pid), blob);
      const date = photoDate || today();
      const list = [{ id: pid, date, path }, ...(photos[id] || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      const ok = await persist(undefined, { ...photos, [id]: list });
      if (ok) say(`${nameOf(id)}の写真を保存（${fmtY(date)}）`);
    } catch (e) { console.error(e); say("写真を保存できませんでした"); }
    setBusy(false);
  };
  const delPhoto = async (id, pid) => {
    const target = (photos[id] || []).find((p) => p.id === pid);
    const list = (photos[id] || []).filter((p) => p.id !== pid);
    const ok = await persist(undefined, { ...photos, [id]: list });
    if (ok) { setViewer(null); if (target?.path) { try { await removePhoto(target.path); } catch (e) { console.error(e); } } }
    else say("削除できませんでした");
  };
  const srcOf = (x) => x.path ? photoUrl(x.path) : (x.src || "");

  // ---- 書き出し／読み込み ----
  const exportAll = () => {
    const ph = {};
    for (const id of Object.keys(photos)) ph[id] = (photos[id] || []).map((x) => ({ id: x.id, date: x.date, note: x.note, path: x.path, url: x.path ? photoUrl(x.path) : undefined }));
    setIoText(JSON.stringify({ version: 2, exportedAt: today(), plants, data, photos: ph }));
  };
  // 旧アプリ（version 1、写真は data: URL）と新形式（version 2、写真は path）の両方を受け付ける
  const importAll = async (text) => {
    let obj;
    try { obj = JSON.parse(text || ioText); if (!obj || (!obj.data && !obj.plants)) throw new Error(); }
    catch (e) { say("読み込めませんでした。書き出した文字列をそのまま貼ってください"); return; }
    setBusy(true);
    try {
      // 鉢カード（{plants:[...]} だけのファイルでも可。同じ id は上書き、無ければ追加）
      if (Array.isArray(obj.plants) && obj.plants.length) {
        const maxOrder = Math.max(0, ...plants.map((x) => x.sort_order || 0));
        const cards = obj.plants.filter((c) => c && c.id && c.name).map((c, i) => {
          const exists = plants.find((x) => x.id === c.id);
          const cur = exists || emptyPlant(c.id);
          return { ...cur, ...c, sort_order: c.sort_order ?? (exists ? cur.sort_order : maxOrder + (i + 1) * 1000) };
        });
        const saved = await upsertPlants(user.id, cards);
        setPlants((curList) => { const m = new Map(curList.map((x) => [x.id, x])); for (const x of saved) m.set(x.id, x); return [...m.values()].sort((a, b) => a.sort_order - b.sort_order); });
      }
      const nextData = { ...data };
      for (const k of Object.keys(obj.data || {})) if (!k.startsWith("__")) nextData[k] = obj.data[k];
      const nextPhotos = { ...photos };
      if (obj.photos) {
        const all = Object.entries(obj.photos).flatMap(([id, list]) => (list || []).map((x) => ({ id, x })));
        const toUpload = all.filter(({ x }) => !x.path && typeof x.src === "string" && x.src.startsWith("data:"));
        let n = 0;
        for (const [id, list] of Object.entries(obj.photos)) {
          const cur = nextPhotos[id] || [];
          const merged = [];
          for (const x of list || []) {
            if (cur.some((c) => c.id === x.id)) continue; // 既にある写真は飛ばす
            let path = x.path;
            if (!path && typeof x.src === "string" && x.src.startsWith("data:")) {
              n += 1; setToast(`写真を移行中 ${n}/${toUpload.length}`);
              const blob = await dataUrlToBlob(x.src);
              path = await uploadPhoto(photoPath(user.id, id, x.id || uid()), blob);
            }
            if (path) merged.push({ id: x.id || uid(), date: x.date, note: x.note, path });
          }
          nextPhotos[id] = [...merged, ...cur].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        }
      }
      const ok = (!obj.data && !obj.photos) ? true : await persist(nextData, nextPhotos);
      if (ok) { setIoText(""); setIoOpen(false); say("読み込みました"); }
    } catch (e) { console.error(e); say("読み込み中にエラーが出ました。もう一度お試しください"); }
    setBusy(false);
  };
  const importFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    setIoText(text);
    await importAll(text);
  };

  // ---- 状態計算 ----
  const status = (plant) => {
    const logs = P(plant.id).logs || []; const iv = intervalFor(plant, month);
    // 水やり記録が無い鉢は「追加日」（購入のできごとがあればその日）を0日として数える
    const bought = (P(plant.id).events || []).filter((e) => e.type === "購入").map((e) => e.date).sort().pop();
    const base = logs.length ? logs[0].date : (bought || (plant.created_at || "").slice(0, 10) || null);
    const days = base ? Math.max(0, daysBetween(base, today())) : null;
    const fromAdd = !logs.length && days !== null;
    if (!iv) return { days, iv: null, level: "none", ratio: 0 }; // 目安未設定：判定しない
    if (days === null) return { days: null, iv, level: "none", ratio: 0 };
    const ratio = Math.min(days / iv.max, 1.15);
    return { days, iv, ratio, fromAdd, level: days < iv.min ? "ok" : days <= iv.max ? "soon" : "late" };
  };
  const color = (lv) => lv === "late" ? C.late : lv === "soon" ? C.soon : lv === "ok" ? C.ok : C.mute;
  const label = (lv, d) => lv === "none" ? (d === null ? "未記録" : `${d}日`) : lv === "late" ? `${d}日 · 遅れ気味` : lv === "soon" ? `${d}日 · そろそろ` : `${d}日 · まだ`;

  const active = plants.filter((p) => !p.archived);
  const archived = plants.filter((p) => p.archived);
  const list = active.filter((p) => filter === "all" || p.place === filter).map((p) => ({ p, s: status(p) }));
  if (tab === "water") list.sort((a, b) => (b.s.ratio ?? 0) - (a.s.ratio ?? 0));
  const due = list.filter(({ s }) => s.level !== "ok" && s.level !== "none").length;
  const allTasks = active.flatMap((p) => (P(p.id).tasks || []).map((t) => ({ ...t, plant: p }))).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const weekTasks = allTasks.filter((t) => t.due && daysBetween(today(), t.due) <= 7);

  if (!loaded) return <div style={{ background: C.bg, minHeight: "100vh", padding: 24, color: C.mute, fontFamily: font }}>読み込み中…</div>;
  if (loadErr) return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: 24, color: C.ink, fontFamily: font }}>
      <p style={{ fontSize: 14, lineHeight: 1.6 }}>{loadErr}</p>
      <button onClick={() => { setLoaded(false); reload(); }} style={{ ...btn(C.ink, "#fff"), flex: "none", padding: "8px 16px" }}>再読み込み</button>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: font }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 60px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{tab === "water" ? "水やり" : "予定と記録"}</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
            <span style={{ fontSize: 14, color: C.mute }}>{month}月{now.getDate()}日</span>
            <button onClick={openNewPlant} style={{ padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${C.ink}`, background: C.ink, color: "#fff" }}>＋ 鉢</button>
          </div>
        </div>
        <p style={{ margin: "4px 0 14px", fontSize: 14, color: C.mute }}>
          {tab === "water" ? (due === 0 ? "今日やる鉢はありません" : `そろそろの鉢が${due}つ`) : (weekTasks.length === 0 ? "今週の予定はありません" : `今週の予定が${weekTasks.length}件`)}
        </p>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {[["water", "水やり"], ["plan", "予定・記録・写真"]].map(([k, v]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer", border: `1px solid ${tab === k ? C.ink : C.line}`, background: tab === k ? C.ink : "transparent", color: tab === k ? "#fff" : C.ink }}>{v}</button>
          ))}
          <span style={{ flex: 1 }} />
          {[["all", "全部"], ...Object.entries(PLACE)].map(([k, v]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "6px 10px", borderRadius: 999, fontSize: 12, cursor: "pointer", border: `1px solid ${C.line}`, background: filter === k ? "#E4EAD9" : "transparent", color: C.ink }}>{v}</button>
          ))}
        </div>

        {(() => {
          const cur = SEASONS.find((x) => x.test(month)) || SEASONS[0];
          const g = SEASONS.find((x) => x.key === (guideKey || cur.key)) || cur;
          return (
            <div style={{ background: "#EEF3E6", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
              <button onClick={() => setGuideOpen(!guideOpen)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 12px", cursor: "pointer", color: C.ink, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>置き場所：{cur.name}</span>
                <span style={{ fontSize: 12, color: C.mute }}>{guideOpen ? "閉じる" : "見る"}</span>
              </button>
              {guideOpen && (
                <div style={{ padding: "0 12px 12px", fontSize: 13, lineHeight: 1.6 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {SEASONS.map((x) => <button key={x.key} onClick={() => setGuideKey(x.key)} style={{ padding: "4px 9px", borderRadius: 999, fontSize: 12, cursor: "pointer", border: `1px solid ${g.key === x.key ? C.ink : C.line}`, background: g.key === x.key ? C.ink : "#fff", color: g.key === x.key ? "#fff" : C.ink }}>{x.name.split("（")[0]}</button>)}
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{PLACE_DESC.A}</div>
                  {g.A.map((t, i) => <div key={i}>・{t}</div>)}
                  <div style={{ fontWeight: 600, marginTop: 8 }}>{PLACE_DESC.B}</div>
                  {g.B.map((t, i) => <div key={i}>・{t}</div>)}
                  <div style={{ fontWeight: 600, marginTop: 8 }}>鉢ごと</div>
                  {active.filter((p) => (p.season_notes || {})[g.key]).map((p) => <div key={p.id}><span style={{ color: C.mute }}>{p.name}：</span>{p.season_notes[g.key]}</div>)}
                </div>
              )}
            </div>
          );
        })()}

        {tab === "plan" && weekTasks.length > 0 && (
          <div style={{ background: "#FFF6E3", border: `1px solid #EBD9A8`, borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>今週の予定</div>
            {weekTasks.map((t) => (
              <div key={t.id} style={{ display: "flex", gap: 8, fontSize: 13, padding: "3px 0", alignItems: "center" }}>
                <input type="checkbox" onChange={() => doneTask(t.plant.id, t)} />
                <span style={{ fontWeight: 600, minWidth: 64 }}>{t.plant.name}</span><span style={{ flex: 1 }}>{t.title}</span><span style={{ color: C.mute }}>{fmt(t.due)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.line}`, overflow: "hidden" }}>
          {list.map(({ p, s }, i) => {
            const isOpen = open === p.id; const logs = P(p.id).logs || []; const tasks = P(p.id).tasks || []; const events = P(p.id).events || []; const ph = photos[p.id] || [];
            return (
              <div key={p.id} style={{ borderTop: i ? `1px solid ${C.line}` : "none" }}>
                <button onClick={() => { setOpen(isOpen ? null : p.id); setNoteDraft(""); setEvNote(""); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 14px 12px", cursor: "pointer", color: C.ink, display: "block" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <div><span style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</span>{p.sub && <span style={{ fontSize: 12, color: C.mute, marginLeft: 6 }}>{p.sub}</span>}{cardStatus(p) === "provisional" && <span title="分類の既定値で仮運用中" style={{ fontSize: 11, marginLeft: 6, padding: "1px 6px", borderRadius: 6, background: "#FFF6E3", border: "1px solid #EBD9A8", color: "#8A6A1E" }}>仮</span>}{tab === "water" && p.mist_level === "need" && <span title={p.mist || "葉水が必要"} style={{ fontSize: 11, marginLeft: 6, padding: "1px 6px", borderRadius: 6, background: "#E6F0F7", color: "#2F6A8F" }}>葉水</span>}{cardStatus(p) === "none" && <span style={{ fontSize: 11, marginLeft: 6, padding: "1px 6px", borderRadius: 6, background: "#EEF0EA", color: C.mute }}>目安未設定</span>}</div>
                    {tab === "water"
                      ? <span style={{ fontSize: 13, fontWeight: 600, color: color(s.level), whiteSpace: "nowrap" }}>{s.fromAdd ? "追加から " : ""}{label(s.level, s.days)}</span>
                      : <span style={{ fontSize: 12, color: C.mute, whiteSpace: "nowrap" }}>{tasks.length ? `予定${tasks.length}` : ""}{ph.length ? ` 写真${ph.length}` : ""}</span>}
                  </div>
                  {tab === "water" ? (<>
                    {s.iv ? (<>
                    <div style={{ position: "relative", height: 6, background: "#E9EDE2", borderRadius: 3, marginTop: 10 }}>
                      <div style={{ position: "absolute", left: `${(s.iv.min / (s.iv.max * 1.15)) * 100}%`, width: `${((s.iv.max - s.iv.min) / (s.iv.max * 1.15)) * 100}%`, top: 0, bottom: 0, background: "#D9E4CC", borderRadius: 3 }} />
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(s.ratio / 1.15, 1) * 100}%`, background: color(s.level), borderRadius: 3, transition: "width .3s" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.mute, marginTop: 6 }}><span>{PLACE[p.place] ? `置き場所 ${PLACE[p.place]}` : "置き場所 未設定"}</span><span>目安 {s.iv.min}〜{s.iv.max}日{s.iv.provisional ? "（仮）" : ""}</span></div>
                    </>) : (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.mute, marginTop: 8 }}><span>{PLACE[p.place] ? `置き場所 ${PLACE[p.place]}` : "置き場所 未設定"}</span><span>カード編集で分類か目安を設定すると判定します</span></div>
                    )}
                  </>) : (
                    <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>{events[0] ? `最近：${fmtY(events[0].date)} ${events[0].type}` : "まだ記録がありません"}</div>
                  )}
                </button>

                {isOpen && tab === "water" && (
                  <div style={{ padding: "0 14px 16px", background: C.panel }}>
                    {s.iv?.note && <p style={{ margin: "10px 0 6px", fontSize: 14, lineHeight: 1.6 }}>{s.iv.note}</p>}
                    {p.soil && <p style={{ margin: "0 0 12px", fontSize: 12, color: C.mute }}>土：{p.soil}</p>}
                    {(p.water_full || p.water_light) && (
                      <div style={{ fontSize: 13, background: "#EEF3E6", borderRadius: 8, padding: "7px 10px", marginBottom: 8, lineHeight: 1.6 }}>
                        {p.water_full && <div><span style={{ color: C.mute }}>たっぷり：</span>{p.water_full}（半分→1〜2分待つ→残り。底から出たら止める）</div>}
                        {p.water_light && <div><span style={{ color: C.mute }}>少量：</span>{p.water_light}（表面が湿る程度）</div>}
                      </div>
                    )}
                    {(p.light_rule || p.dormancy || p.mist) && (
                      <div style={{ fontSize: 13, background: "#FFF9EC", border: "1px solid #EFE2C2", borderRadius: 8, padding: "7px 10px", marginBottom: 8, lineHeight: 1.6 }}>
                        {p.light_rule && <div><span style={{ color: C.mute }}>少量にする条件：</span>{p.light_rule}</div>}
                        {p.dormancy && <div style={{ marginTop: 4 }}><span style={{ color: C.mute }}>休眠の判断：</span>{p.dormancy}</div>}
                        {p.mist && <div style={{ marginTop: 4 }}><span style={{ color: C.mute }}>{MIST[p.mist_level] || "葉水"}：</span>{p.mist}</div>}
                      </div>
                    )}
                    <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="メモ（乾き具合・様子など、任意）" style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", fontSize: 16, border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => water(p.id, "たっぷり")} style={btn(C.ok, "#fff")}>今日たっぷり{p.water_full ? ` ${p.water_full}` : ""}</button>
                      <button onClick={() => water(p.id, "少量")} style={btn("#fff", C.ok, `1px solid ${C.ok}`)}>今日少量{p.water_light ? ` ${p.water_light}` : ""}</button>
                    </div>
                    {logs.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 13, color: C.mute }}>これまでの記録</span><button onClick={() => undoWater(p.id)} style={{ ...small, color: C.late }}>直近を取り消す</button></div>
                        {logs.slice(0, 8).map((l, j) => (
                          <div key={j} style={{ display: "flex", gap: 10, fontSize: 13, padding: "4px 0", borderTop: j ? `1px dashed ${C.line}` : "none" }}>
                            <span style={{ color: C.mute, minWidth: 40 }}>{fmt(l.date)}</span><span style={{ minWidth: 44 }}>{l.kind}</span>
                            {j < logs.length - 1 && <span style={{ color: C.mute }}>{daysBetween(logs[j + 1].date, l.date)}日ぶり</span>}
                            {l.note && <span style={{ flex: 1 }}>{l.note}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: 12, textAlign: "right" }}><button onClick={() => setEditor({ plant: p, isNew: false })} style={small}>カードを編集</button></div>
                  </div>
                )}

                {isOpen && tab === "plan" && (
                  <div style={{ padding: "0 14px 16px", background: C.panel }}>
                    {/* 予定 */}
                    <div style={{ fontSize: 13, color: C.mute, margin: "10px 0 6px" }}>予定</div>
                    {(p.soil || p.repot) && (
                      <div style={{ fontSize: 13, background: "#EEF3E6", borderRadius: 8, padding: "7px 10px", marginBottom: 8, lineHeight: 1.6 }}>
                        {p.soil && <div><span style={{ color: C.mute }}>土：</span>{p.soil}</div>}
                        {p.repot && <div><span style={{ color: C.mute }}>順番：</span>{p.repot}</div>}
                      </div>
                    )}
                    {tasks.length === 0 && <div style={{ fontSize: 13, color: C.mute }}>なし</div>}
                    {tasks.map((t) => (
                      <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, padding: "5px 0" }}>
                        <input type="checkbox" onChange={() => doneTask(p.id, t)} />
                        <span style={{ flex: 1 }}>{t.title}</span>
                        {t.due && <span style={{ fontSize: 12, color: daysBetween(today(), t.due) < 0 ? C.late : C.mute }}>{fmtY(t.due)}</span>}
                        <button onClick={() => delTask(p.id, t.id)} style={small}>削除</button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <input value={taskDraft} onChange={(e) => setTaskDraft(e.target.value)} placeholder="予定を追加" style={{ flex: 1, minWidth: 0, padding: "8px 10px", fontSize: 16, border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff" }} />
                      <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} style={{ padding: "8px 6px", fontSize: 16, border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", appearance: "none", WebkitAppearance: "none", minWidth: 0 }} />
                      <button onClick={() => addTask(p.id)} style={{ ...btn(C.ink, "#fff"), flex: "none", padding: "8px 12px" }}>追加</button>
                    </div>

                    {/* できごと */}
                    <div style={{ fontSize: 13, color: C.mute, margin: "18px 0 6px" }}>できごとを記録</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                      {EVENT_TYPES.map((k) => <button key={k} onClick={() => setEvType(k)} style={{ padding: "5px 10px", borderRadius: 999, fontSize: 12, cursor: "pointer", border: `1px solid ${evType === k ? C.ink : C.line}`, background: evType === k ? C.ink : "#fff", color: evType === k ? "#fff" : C.ink }}>{k}</button>)}
                    </div>
                    <input value={evNote} onChange={(e) => setEvNote(e.target.value)} placeholder="内容（鉢サイズ・土など）" style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 16, border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", marginBottom: 6 }} />
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="date" value={evDate} max={today()} onChange={(e) => setEvDate(e.target.value)} title="できごとの日付" style={{ flex: 1, padding: "8px 6px", fontSize: 16, border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", appearance: "none", WebkitAppearance: "none", minWidth: 0 }} />
                      <button onClick={async () => { const ok = await addEvent(p.id, evType, evNote, evDate); if (ok) { setEvNote(""); say(`${fmtY(evDate || today())}で記録しました`); } }} style={{ ...btn(C.ok, "#fff"), flex: "none", padding: "8px 14px" }}>{evDate && evDate !== today() ? "この日付で記録" : "今日で記録"}</button>
                    </div>
                    {events.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        {events.slice(0, 12).map((e, j) => (
                          <div key={e.id} style={{ display: "flex", gap: 10, fontSize: 13, padding: "5px 0", borderTop: j ? `1px dashed ${C.line}` : "none", alignItems: "center" }}>
                            <span style={{ color: C.mute, minWidth: 66 }}>{fmtY(e.date)}</span><span style={{ fontWeight: 600, minWidth: 48 }}>{e.type}</span><span style={{ flex: 1 }}>{e.note}</span>
                            <button onClick={() => delEvent(p.id, e.id)} style={small}>削除</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 写真 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, margin: "18px 0 6px" }}>
                      <span style={{ fontSize: 13, color: C.mute, whiteSpace: "nowrap" }}>写真（{ph.length}）</span>
                      <span style={{ flex: 1 }} />
                      <input type="date" value={photoDate} max={today()} onChange={(e) => setPhotoDate(e.target.value)} title="写真の日付（撮った日）" style={{ padding: "6px 6px", fontSize: 16, border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", appearance: "none", WebkitAppearance: "none", minWidth: 0, width: 140 }} />
                      <button disabled={busy} onClick={() => fileRef.current && fileRef.current.click()} style={{ ...btn(C.ink, "#fff"), flex: "none", padding: "7px 12px", fontSize: 13, opacity: busy ? .5 : 1 }}>{busy ? "保存中…" : "写真を追加"}</button>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { addPhoto(p.id, e.target.files[0]); e.target.value = ""; }} />
                    </div>
                    {ph.length === 0 ? <div style={{ fontSize: 13, color: C.mute }}>植え替え前後や数ヶ月ごとに撮っておくと成長が見比べられます。日付を変えれば過去に撮った写真も入れられます</div> : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                        {ph.map((x) => (
                          <button key={x.id} onClick={() => setViewer({ plant: p.id, photo: x })} style={{ position: "relative", padding: 0, border: "none", background: "#E9EDE2", cursor: "pointer", aspectRatio: "1", borderRadius: 8, overflow: "hidden" }}>
                            <img src={srcOf(x)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            <span style={{ position: "absolute", left: 4, bottom: 4, fontSize: 11, color: "#fff", background: "rgba(0,0,0,.55)", padding: "1px 6px", borderRadius: 6 }}>{fmtY(x.date)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: 12, textAlign: "right" }}><button onClick={() => setEditor({ plant: p, isNew: false })} style={small}>カードを編集</button></div>
                  </div>
                )}
              </div>
            );
          })}
          {list.length === 0 && <div style={{ padding: 20, fontSize: 13, color: C.mute, textAlign: "center" }}>鉢がありません。右上の「＋ 鉢」で追加できます</div>}
        </div>
        {archived.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.mute }}>
            <button onClick={() => setShowArchived(!showArchived)} style={small}>{showArchived ? "外した鉢を隠す" : `外した鉢（${archived.length}）`}</button>
            {showArchived && archived.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px dashed ${C.line}` }}><span>{p.name} {p.sub}</span><button onClick={() => archivePlant(p)} style={small}>一覧に戻す</button></div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14, background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, overflow: "hidden" }}>
          <button onClick={() => setIoOpen(!ioOpen)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 12px", cursor: "pointer", color: C.ink, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>記録の控え（書き出し／読み込み）</span><span style={{ fontSize: 12, color: C.mute }}>{ioOpen ? "閉じる" : "開く"}</span>
          </button>
          {ioOpen && (
            <div style={{ padding: "0 12px 12px", fontSize: 13 }}>
              <p style={{ margin: "0 0 8px", color: C.mute, lineHeight: 1.6 }}>記録は Supabase に保存されるので、普段は控えを取らなくて大丈夫です。書き出した文字列やファイルを「読み込み」すると、鉢カード・記録・写真を引き継げます。Claude に書いてもらった鉢カードのファイルもここから取り込めます。</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button onClick={exportAll} disabled={busy} style={btn(C.ink, "#fff")}>書き出し</button>
                <button onClick={() => importAll()} disabled={busy} style={btn("#fff", C.ink, `1px solid ${C.ink}`)}>{busy ? "読み込み中…" : "読み込み"}</button>
                <button onClick={() => ioFileRef.current && ioFileRef.current.click()} disabled={busy} style={btn("#fff", C.ink, `1px solid ${C.ink}`)}>ファイルから</button>
                <input ref={ioFileRef} type="file" accept=".json,.txt,application/json,text/plain" style={{ display: "none" }} onChange={(e) => { importFile(e.target.files[0]); e.target.value = ""; }} />
              </div>
              <textarea value={ioText} onChange={(e) => setIoText(e.target.value)} placeholder="ここに書き出した文字列が出ます／貼り付けます" style={{ width: "100%", boxSizing: "border-box", height: 120, fontSize: 11, fontFamily: "monospace", border: `1px solid ${C.line}`, borderRadius: 8, padding: 8, background: "#fff" }} />
            </div>
          )}
        </div>

        <p style={{ fontSize: 12, color: C.mute, marginTop: 14, lineHeight: 1.6 }}>
          「そろそろ」は目安の日数に入っただけなので、実際は土の乾きを確かめてから。目安は月ごとに自動で切り替わります。軽石を混ぜていない土・湿度の高い部屋を前提に少し長めにしてあります（来春軽石を混ぜたら短く戻す）。予定を完了にすると「できごと」に日付付きで残ります。
        </p>
        <p style={{ fontSize: 12, color: C.mute, marginTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span>{user.email}</span>
          <button onClick={onLogout} style={small}>ログアウト</button>
        </p>
      </div>

      {editor && <CardEditor plant={editor.plant} isNew={editor.isNew} onSave={savePlant} onArchive={() => archivePlant(editor.plant)} onClose={() => setEditor(null)} />}
      {viewer && (
        <div onClick={() => setViewer(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 20 }}>
          <img src={srcOf(viewer.photo)} alt="" style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 10 }} />
          <div style={{ color: "#fff", fontSize: 13, marginTop: 10, display: "flex", gap: 16, alignItems: "center" }}>
            <span>{nameOf(viewer.plant)} · {fmtY(viewer.photo.date)}{viewer.photo.note ? ` · ${viewer.photo.note}` : ""}</span>
            <button onClick={(e) => { e.stopPropagation(); delPhoto(viewer.plant, viewer.photo.id); }} style={{ ...small, color: "#F5B8A8", fontSize: 13 }}>この写真を削除</button>
          </div>
        </div>
      )}
      {toast && <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#fff", padding: "10px 16px", borderRadius: 999, fontSize: 13, whiteSpace: "nowrap", zIndex: 30 }}>{toast}</div>}
    </div>
  );
}
