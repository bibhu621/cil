"use client";
import { useState, useMemo, useCallback, useRef } from "react";

/* ---------- config (edit freely) ---------- */
const START = "2026-10-30", DAYS = 51, TARGET = 300, GOAL = 5e6;
const DEF = Object.entries({ seo: "Website & SEO", meta: "Meta Ads", digital: "Digital Products", ielts: "IELTSAppeal Test Platform", app: "USA Mobile App", move: "EasyMovement Revival", erp: "ERP Sales", abs: "Six Pack Abs", sem: "NonAcad Seminar", aiclass: "Run AI Class", agents: "AI Agents" }); // seeded into the DB once, then fully editable in the app
const S = {}; // live map key -> name, filled from DB inside Page
const sk = p => (S[p.source] ? p.source : Object.keys(S)[0]);
const MODES = ["UPI", "Cash", "Bank Transfer", "Cheque", "Card", "Other"], STAT = ["Planning", "In Progress", "Completed", "On Hold"];
const PAL = ["#22d3ee", "#a78bfa", "#f59e0b", "#34d399", "#f472b6", "#60a5fa", "#fb923c", "#a3e635", "#e879f9", "#2dd4bf", "#f87171", "#94a3b8"];
const SC = { Completed: "text-emerald-400 border-emerald-800 bg-emerald-950", "In Progress": "text-cyan-400 border-cyan-800 bg-cyan-950", Planning: "text-amber-400 border-amber-800 bg-amber-950", "On Hold": "text-slate-400 border-slate-700 bg-slate-800" };

/* ---------- helpers ---------- */
const today = new Date().toLocaleDateString("en-CA");
const sum = (a, f) => a.reduce((s, x) => s + (+f(x) || 0), 0);
const inr = n => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const L = n => (Math.abs(n) >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` : Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(2)}L` : inr(n));
const iso = i => new Date(+new Date(START) + i * 864e5).toISOString().slice(0, 10);
const pad = n => String(n).padStart(2, "0");
const KEY = {
  day: d => d,
  week: d => { const t = new Date(d), j = new Date(t.getFullYear(), 0, 1); return `${t.getFullYear()}-W${pad(Math.ceil(((t - j) / 864e5 + j.getDay() + 1) / 7))}`; },
  month: d => d.slice(0, 7),
  quarter: d => `${d.slice(0, 4)}-Q${Math.ceil(+d.slice(5, 7) / 3)}`,
  year: d => d.slice(0, 4),
};
const roll = (rows, per) => {
  const m = {};
  rows.forEach(x => { const k = KEY[per](x.d), o = (m[k] ??= { l: k, a: 0, b: 0, c: 0 }); o.a += x.a; o.b += x.b; o.c += x.c; });
  return Object.values(m).sort((x, y) => (x.l < y.l ? -1 : 1)).slice(-12).map(o => ({ ...o, l: per === "day" ? o.l.slice(5) : o.l }));
};
const grp = (a, kf, vf) => Object.entries(a.reduce((m, x) => ((m[kf(x)] = (m[kf(x)] || 0) + vf(x)), m), {})).map(([l, v]) => ({ l, v })).filter(x => x.v > 0);
const dt = p => p.date || (p._id ? new Date(parseInt(String(p._id).slice(0, 8), 16) * 1e3).toLocaleDateString("en-CA") : today);
const call = (method, body) => fetch("/api/projects", { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) }).then(r => r.json());

const blankP = { type: "project", name: "", client: "", source: "seo", amount: "", paid: "", cost: "", mode: "UPI", status: "In Progress", date: today, start: today, due: "", remark: "", old: false };
const blankT = source => ({ type: "txn", source, kind: "invest", amount: "", note: "", date: today });
const PF = [["name", "Project name"], ["client", "Client"], ["source", "Source", "text", S], ["amount", "Total amount (₹)", "number"], ["paid", "Received (₹)", "number"], ["cost", "Spent / cost (₹)", "number"], ["mode", "Payment mode", "text", MODES], ["status", "Status", "text", STAT], ["date", "Added on", "date"], ["start", "Start", "date"], ["due", "Deadline", "date"], ["remark", "Remark"], ["old", "Old project (not in 300 sprint)", "checkbox"]];
const TF = [["kind", "Type", "text", { budget: "Budget allotted", invest: "Money spent", earn: "Money earned" }], ["amount", "Amount (₹)", "number"], ["date", "Date", "date"], ["note", "Note"]];
const blankK = source => ({ type: "task", source, title: "", start: today, due: today, note: "", done: false });
const KF = [["title", "Task"], ["source", "Source", "text", S], ["start", "Start", "date"], ["due", "Deadline", "date"], ["note", "Note"]];
const inp = "p-2 rounded bg-slate-800 border border-slate-700 text-sm w-full focus:outline-none focus:border-cyan-600";
const btn = "px-3 py-1.5 rounded text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 transition";
const ghost = "px-3 py-1.5 rounded text-sm bg-slate-800 hover:bg-slate-700 transition";

/* ---------- tiny UI + chart kit (no dependencies) ---------- */
const C = ({ t, children, cls = "" }) => (
  <section className={`p-4 bg-slate-900 border border-slate-800 rounded-xl ${cls}`}>
    {t && <h3 className="text-sm font-semibold text-slate-300 mb-3">{t}</h3>}
    {children}
  </section>
);
const K = ({ l, v, s, c = "text-cyan-400" }) => (
  <C><p className="text-[11px] text-slate-400">{l}</p><p className={`text-xl font-bold ${c}`}>{v}</p>{s && <p className="text-[11px] text-slate-500">{s}</p>}</C>
);
const Bar = ({ p, c = "bg-cyan-500" }) => (
  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden"><div className={`${c} h-full transition-all`} style={{ width: `${Math.min(100, Math.max(0, p || 0))}%` }} /></div>
);
const Bars = ({ d, k = ["a"], c = PAL }) => {
  const m = Math.max(1, ...d.flatMap(x => k.map(y => x[y])));
  return d.length ? (
    <div className="flex items-end gap-1 h-40">
      {d.map(x => (
        <div key={x.l} className="flex-1 min-w-0 flex flex-col items-center gap-1">
          <div className="flex items-end gap-0.5 h-32 w-full justify-center">
            {k.map((y, i) => <div key={y} title={`${x.l}: ${x[y].toLocaleString("en-IN")}`} style={{ height: `${(x[y] / m) * 100}%`, background: c[i] }} className="w-full max-w-5 rounded-t min-h-px" />)}
          </div>
          <span className="text-[9px] text-slate-500 truncate w-full text-center">{x.l}</span>
        </div>
      ))}
    </div>
  ) : <p className="text-xs text-slate-500 py-10 text-center">No data yet</p>;
};
const Line = ({ s }) => {
  const n = s[0][0].length, m = Math.max(1, ...s.flatMap(([p]) => p.filter(v => v != null)));
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-40 bg-slate-950/50 rounded">
      {s.map(([p, c, dash], j) => <polyline key={j} fill="none" stroke={c} strokeWidth="1.5" strokeDasharray={dash} vectorEffect="non-scaling-stroke" points={p.map((v, i) => (v == null ? null : `${(i / (n - 1)) * 100},${39 - (v / m) * 37}`)).filter(Boolean).join(" ")} />)}
    </svg>
  );
};
const Donut = ({ d, f = x => x }) => {
  const t = sum(d, x => x.v) || 1; let o = 0;
  return d.length ? (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90 shrink-0">
        {d.map((x, i) => { const p = (x.v / t) * 100, e = <circle key={i} cx="18" cy="18" r="15.9" fill="none" stroke={PAL[i % PAL.length]} strokeWidth="4" strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={-o} />; o += p; return e; })}
      </svg>
      <ul className="text-[11px] space-y-1 min-w-0">{d.map((x, i) => <li key={x.l} className="flex gap-1.5 items-center truncate"><i className="w-2 h-2 rounded-full shrink-0" style={{ background: PAL[i % PAL.length] }} /><span className="truncate text-slate-300">{S[x.l] || x.l}</span><b className="text-slate-100">{f(x.v)}</b></li>)}</ul>
    </div>
  ) : <p className="text-xs text-slate-500 py-10 text-center">No data yet</p>;
};
const Form = ({ f, v, set, ok, cancel, title }) => (
  <form onSubmit={e => { e.preventDefault(); ok(); }} className="p-4 bg-slate-900 border border-cyan-900 rounded-xl space-y-3">
    <h3 className="text-sm font-semibold text-cyan-400">{title}</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {f.map(([k, l, t = "text", o]) => (
        <label key={k} className={`text-[11px] text-slate-400 flex gap-1 ${t === "checkbox" ? "items-center col-span-2" : "flex-col"}`}>
          {t === "checkbox" && <input type="checkbox" checked={!!v[k]} onChange={e => set({ ...v, [k]: e.target.checked })} />}{l}
          {t !== "checkbox" && (o ? (
            <select className={inp} value={v[k]} onChange={e => set({ ...v, [k]: e.target.value })}>{(Array.isArray(o) ? o.map(s => [s, s]) : Object.entries(o)).map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select>
          ) : <input className={inp} type={t} value={v[k] ?? ""} min={t === "number" ? 0 : undefined} required={k === "name" || k === "amount" || k === "title"} onChange={e => set({ ...v, [k]: e.target.value })} />)}
        </label>
      ))}
    </div>
    <div className="flex gap-2"><button className={btn}>{v._id ? "Update" : "Save"}</button><button type="button" onClick={cancel} className={ghost}>Cancel</button></div>
  </form>
);

/* ---------- page ---------- */
export default function Page() {
  const [user, setUser] = useState(null), [form, setForm] = useState({ username: "", password: "" }), [msg, setMsg] = useState("");
  const [items, setItems] = useState([]), [tab, setTab] = useState("Overview"), [per, setPer] = useState("week"), [src, setSrc] = useState("all");
  const [pf, setPf] = useState(blankP), [showP, setShowP] = useState(false), [tf, setTf] = useState(blankT("seo")), [showT, setShowT] = useState(false);
  const [q, setQ] = useState(""), [fs, setFs] = useState("All"), [tk, setTk] = useState(blankK("seo")), [showK, setShowK] = useState(false), [newSrc, setNewSrc] = useState(null), seeded = useRef(false);
  const srcDocs = items.filter(x => x.type === "source").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  Object.keys(S).forEach(k => delete S[k]); srcDocs.forEach(d => (S[d.key] = d.name));

  const load = useCallback(async () => {
    try {
      const d = await call("GET"); if (!d.ok) return;
      let l = d.projects;
      if (!seeded.current && !l.some(x => x.type === "source")) {
        seeded.current = true;
        await Promise.all(DEF.map(([key, name], i) => call("POST", { type: "source", key, name, order: i })));
        l = (await call("GET")).projects;
      }
      setItems(l);
    } catch (e) { setMsg("Load failed: " + e.message); }
  }, []);
  const login = async e => {
    e.preventDefault(); setMsg("Connecting to MongoDB...");
    try {
      const d = await (await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })).json();
      if (d.ok) { setUser(d.user); setMsg(""); load(); } else setMsg(d.error || "Login failed");
    } catch (err) { setMsg("Failed to connect: " + err.message); }
  };
  const save = async (doc, done) => {
    const n = { ...doc }; if ("source" in n && !S[n.source]) n.source = Object.keys(S)[0];["amount", "paid", "cost"].forEach(k => k in n && (n[k] = +n[k] || 0));
    const r = await call(n._id ? "PUT" : "POST", n);
    if (r.ok) { done(); load(); } else { setMsg("Save failed: " + (r.error || "check /api/projects PUT/POST")); }
  };
  const del = async id => { if (confirm("Delete this entry?")) { const r = await call("DELETE", { _id: id }); if (r.ok) { load(); } else { setMsg("Delete failed: " + (r.error || "")); } } };

  const addSrc = async e => {
    e.preventDefault(); const name = newSrc.trim(); if (!name) return;
    let key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "src";
    while (S[key]) key += "-" + Math.random().toString(36).slice(2, 5);
    const r = await call("POST", { type: "source", key, name, order: Date.now() });
    if (r.ok) { setNewSrc(null); await load(); setSrc(key); } else setMsg("Add failed: " + (r.error || ""));
  };
  const renameSrc = async () => {
    const d = srcDocs.find(x => x.key === src), n = prompt("Rename source", d?.name)?.trim();
    if (n) { const r = await call("PUT", { _id: d._id, name: n }); if (r.ok) { load(); } else { setMsg("Rename failed: " + (r.error || "")); } }
  };
  const removeSrc = async () => {
    const d = srcDocs.find(x => x.key === src), rest = srcDocs.filter(x => x.key !== src);
    if (!rest.length) return setMsg("Keep at least one source.");
    const tx = items.filter(x => x.source === src && (x.type === "txn" || x.type === "task")), pr = items.filter(x => x.source === src && (!x.type || x.type === "project"));
    if (!confirm(`Remove "${d.name}"?\n• ${tx.length} ledger / task entries will be deleted\n• ${pr.length} projects will be moved to "${rest[0].name}"`)) return;
    await Promise.all([call("DELETE", { _id: d._id }), ...tx.map(x => call("DELETE", { _id: x._id })), ...pr.map(x => call("PUT", { _id: x._id, source: rest[0].key }))]);
    setSrc("all"); load();
  };

  const D = useMemo(() => {
    const P = items.filter(x => !x.type || x.type === "project").map(p => ({ ...p, amount: +p.amount || 0, paid: +p.paid || 0, cost: +p.cost || 0, d: dt(p) }));
    const T = items.filter(x => x.type === "txn").map(t => ({ ...t, amount: +t.amount || 0 }));
    const st = Object.fromEntries(Object.keys(S).map(k => {
      const t = T.filter(x => x.source === k), pr = P.filter(p => sk(p) === k), g = z => sum(t.filter(x => x.kind === z), x => x.amount);
      const earn = g("earn") + sum(pr, p => p.paid), inv = g("invest") + sum(pr, p => p.cost);
      return [k, { budget: g("budget"), inv, earn, net: earn - inv }];
    }));
    const tot = Object.values(st).reduce((a, s) => ({ budget: a.budget + s.budget, inv: a.inv + s.inv, earn: a.earn + s.earn, net: a.net + s.net }), { budget: 0, inv: 0, earn: 0, net: 0 });
    return { P, T, st, tot, billed: sum(P, p => p.amount), rec: sum(P, p => p.paid), cnt: P.filter(p => !p.old && p.d >= START).length };
  }, [items]);
  const { P, T, st, tot, billed, rec, cnt } = D;

  const el = Math.min(DAYS, Math.max(0, Math.floor((new Date(today) - new Date(START)) / 864e5))), left = Math.max(0, DAYS - el);
  const sprintP = P.filter(p => !p.old && p.d >= START);
  const actual = Array.from({ length: DAYS + 1 }, (_, i) => (i <= el ? sprintP.filter(p => p.d <= iso(i)).length : null));
  const target = Array.from({ length: DAYS + 1 }, (_, i) => (TARGET * i) / DAYS);
  const diff = Math.round(cnt - (TARGET * el) / DAYS), remG = GOAL - tot.net;
  const projRows = P.map(p => ({ d: p.d, a: 1, b: p.amount, c: p.paid }));
  const listP = P.filter(p => (fs === "All" || p.status === fs) && [p.name, p.client, p.remark].join(" ").toLowerCase().includes(q.toLowerCase())).sort((a, b) => (a.d < b.d ? 1 : -1));
  const events = k => [...T.filter(t => t.source === k && t.kind !== "budget").map(t => ({ d: t.date || today, a: t.kind === "earn" ? t.amount : 0, b: t.kind === "invest" ? t.amount : 0, c: 0 })), ...P.filter(p => sk(p) === k).map(p => ({ d: p.d, a: p.paid, b: p.cost, c: 0 }))];
  const editP = p => { setPf({ ...p }); setShowP(true); setTab("Projects"); window.scrollTo?.(0, 0); };
  const tasks = items.filter(x => x.type === "task"), wk = new Date(Date.now() + 7 * 864e5).toLocaleDateString("en-CA");
  const openT = tasks.filter(t => !t.done).sort((a, b) => ((a.due || "9") < (b.due || "9") ? -1 : 1));
  const nOver = openT.filter(t => t.due && t.due < today).length, nToday = openT.filter(t => t.due === today).length, nSoon = openT.filter(t => t.due > today && t.due <= wk).length;
  const toggle = async t => { const r = await call("PUT", { _id: t._id, done: !t.done }); if (r.ok) { load(); } else { setMsg("Update failed: " + (r.error || "")); } };
  const editK = t => { setTk({ ...t }); setShowK(true); setSrc(t.source); setTab("Sources"); window.scrollTo?.(0, 0); };
  const Task = (t, showSrc) => {
    const late = !t.done && t.due && t.due < today, td = t.due === today;
    return (
      <div key={t._id} className="flex items-center gap-2.5 text-sm py-1.5 border-b border-slate-800 last:border-0">
        <input type="checkbox" checked={!!t.done} onChange={() => toggle(t)} className="accent-cyan-500 w-4 h-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={`truncate ${t.done ? "line-through text-slate-500" : ""}`}>{t.title}</p>
          {((showSrc && S[t.source]) || t.note) && <p className="text-[11px] text-slate-500 truncate">{showSrc && S[t.source]}{showSrc && t.note && " • "}{t.note}</p>}
        </div>
        <span className={`text-[11px] whitespace-nowrap ${t.done ? "text-slate-600" : late ? "text-red-400" : td ? "text-amber-400" : "text-slate-400"}`}>
          {t.start && t.due && t.start !== t.due ? t.start.slice(5) + " → " : ""}{t.due ? (late ? "Overdue • " : td ? "Today • " : "") + t.due.slice(5) : "No date"}
        </span>
        <button className="text-cyan-400 text-xs" onClick={() => editK(t)}>Edit</button><button className="text-red-400 text-xs" onClick={() => del(t._id)}>Del</button>
      </div>
    );
  };
  const Groups = (a, later, showSrc) => [
    ["Overdue", a.filter(t => t.due && t.due < today), "text-red-400"], ["Today", a.filter(t => t.due === today), "text-amber-400"],
    ["Next 7 days", a.filter(t => t.due > today && t.due <= wk), "text-cyan-400"], ...(later ? [["Later / no date", a.filter(t => !t.due || t.due > wk), "text-slate-400"]] : []),
  ].map(([h, x, c]) => x.length > 0 && <div key={h}><p className={`text-[11px] font-semibold mt-2 ${c}`}>{h} ({x.length})</p>{x.map(t => Task(t, showSrc))}</div>);
  const block = list => {
    const op = list.filter(t => !t.done).sort((a, b) => ((a.due || "9") < (b.due || "9") ? -1 : 1)), dn = list.filter(t => t.done);
    return (
      <C t={`✅ Checklist — ${src === "all" ? "all sources" : S[src]} • ${dn.length}/${list.length} done`}>
        <div className="flex items-center gap-3 mb-3">
          <button className={btn} onClick={() => { setTk(blankK(src === "all" ? "seo" : src)); setShowK(true); }}>+ Add task</button>
          <div className="flex-1"><Bar p={list.length ? (dn.length / list.length) * 100 : 0} c="bg-emerald-500" /></div>
        </div>
        {showK && <div className="mb-3"><Form title={tk._id ? "Edit task" : "New task"} f={KF} v={tk} set={setTk} ok={() => save({ ...tk }, () => { setShowK(false); setTk(blankK(src === "all" ? "seo" : src)); })} cancel={() => setShowK(false)} /></div>}
        {Groups(op, true, src === "all")}
        {!op.length && <p className="text-xs text-slate-500">Nothing pending. Add a task with a deadline to track it here and on the Overview.</p>}
        {dn.length > 0 && <details className="mt-3"><summary className="text-[11px] text-slate-500 cursor-pointer">Completed ({dn.length})</summary>{dn.map(t => Task(t, src === "all"))}</details>}
      </C>
    );
  };

  if (!user) return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
      <form onSubmit={login} className="w-full max-w-sm p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-xl">
        <h1 className="text-xl font-bold text-center text-cyan-400">Cosmic Innovation Lab</h1>
        <p className="text-xs text-center text-slate-400">MongoDB Authenticated Portal</p>
        {msg && <p className="text-xs text-amber-400 text-center">{msg}</p>}
        <input className={inp} placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
        <input className={inp} type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        <button className={btn + " w-full"}>Sign In</button>
      </form>
    </main>
  );

  const pills = (opts, val, set, fmt = x => x) => <div className="flex flex-wrap gap-1.5">{opts.map(o => <button key={o} onClick={() => set(o)} className={`px-3 py-1 rounded-full text-xs border ${val === o ? "bg-cyan-600 border-cyan-500" : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"}`}>{fmt(o)}</button>)}</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <header className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3">
        <div><h1 className="text-2xl font-bold text-cyan-400">Cosmic Innovation Lab</h1><p className="text-xs text-slate-400">Work & Finance Tracker • {user.username} • {today}</p></div>
        <div className="flex gap-2 items-center">{pills(["Overview", "Projects", "Sources"], tab, setTab)}<button onClick={() => setUser(null)} className={ghost}>Logout</button></div>
      </header>
      {msg && <p className="text-xs text-amber-400 bg-amber-950/40 border border-amber-900 rounded p-2" onClick={() => setMsg("")}>{msg}</p>}

      {tab === "Overview" && <>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <K l="Net profit (all sources)" v={L(tot.net)} s={`${((tot.net / GOAL) * 100).toFixed(1)}% of ${L(GOAL)}`} c={tot.net >= 0 ? "text-emerald-400" : "text-red-400"} />
          <K l="Project value billed" v={L(billed)} s={`${P.length} projects`} />
          <K l="Received" v={L(rec)} s={`${billed ? ((rec / billed) * 100).toFixed(0) : 0}% collected`} c="text-emerald-400" />
          <K l="Pending money" v={L(billed - rec)} s={`${P.filter(p => p.amount > p.paid).length} unpaid projects`} c="text-amber-400" />
          <K l="Spent (all)" v={L(tot.inv)} s={`Budget ${L(tot.budget)}`} c="text-violet-400" />
        </div>
        <div className="grid lg:grid-cols-2 gap-3">
          <C t={`🚀 ${TARGET}-project sprint • Day ${el}/${DAYS} • ${left} days left`}>
            <div className="flex justify-between text-sm mb-1"><b>{cnt} / {TARGET}</b><span className={diff >= 0 ? "text-emerald-400" : "text-amber-400"}>{diff >= 0 ? `+${diff} ahead` : `${-diff} behind`} of pace</span></div>
            <Bar p={(cnt / TARGET) * 100} />
            <p className="text-[11px] text-slate-400 my-2">Need <b className="text-cyan-400">{((TARGET - cnt) / Math.max(1, left)).toFixed(1)}</b> projects/day for the remaining {left} days.</p>
            <Line s={[[target, "#64748b", "3"], [actual, "#22d3ee"]]} /><p className="text-[10px] text-slate-500 mt-1">Cyan: actual cumulative • Dashed: target pace</p>
          </C>
          <C t={`💰 Net profit goal • ${L(GOAL)}`}>
            <div className="flex justify-between text-sm mb-1"><b>{L(tot.net)}</b><span className="text-slate-400">{L(Math.max(0, remG))} to go</span></div>
            <Bar p={(tot.net / GOAL) * 100} c="bg-emerald-500" />
            <p className="text-[11px] text-slate-400 my-2">Need <b className="text-emerald-400">{L(Math.max(0, remG) / Math.max(1, left))}</b>/day net over the sprint window. Earned {L(tot.earn)} − Spent {L(tot.inv)}.</p>
            <Bars d={Object.keys(S).map(k => ({ l: S[k].split(" ")[0], a: st[k].earn, b: st[k].inv }))} k={["a", "b"]} c={["#34d399", "#a78bfa"]} />
            <p className="text-[10px] text-slate-500 mt-1">Green: earned • Purple: spent, per source</p>
          </C>
        </div>
        <C t={`✅ To do • ${nOver} overdue • ${nToday} today • ${nSoon} next 7 days`}>
          {Groups(openT, false, true)}
          {!(nOver + nToday + nSoon) && <p className="text-xs text-slate-500">Nothing due this week. Add tasks from the Sources tab.</p>}
        </C>
        <C t="📈 Tracker">
          <div className="mb-3">{pills(["day", "week", "month", "quarter", "year"], per, setPer, x => ({ day: "Daily", week: "Weekly", month: "Monthly", quarter: "Quarterly", year: "Yearly" })[x])}</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><p className="text-[11px] text-slate-400 mb-1">Projects added</p><Bars d={roll(projRows, per)} k={["a"]} c={["#22d3ee"]} /></div>
            <div><p className="text-[11px] text-slate-400 mb-1">Billed (amber) vs Received (green)</p><Bars d={roll(projRows, per)} k={["b", "c"]} c={["#f59e0b", "#34d399"]} /></div>
          </div>
        </C>
        <div className="grid md:grid-cols-3 gap-3">
          <C t="Earnings by source"><Donut d={Object.keys(S).map(k => ({ l: k, v: st[k].earn })).filter(x => x.v > 0)} f={L} /></C>
          <C t="Received by payment mode"><Donut d={grp(P, p => p.mode || "Other", p => p.paid)} f={L} /></C>
          <C t="Projects by status"><Donut d={grp(P, p => p.status || "Planning", () => 1)} /></C>
        </div>
        <C t="⏳ Pending collections (top 6)">
          {P.filter(p => p.amount > p.paid).sort((a, b) => b.amount - b.paid - (a.amount - a.paid)).slice(0, 6).map(p => (
            <div key={p._id} className="flex justify-between text-sm py-1.5 border-b border-slate-800 last:border-0 gap-2">
              <span className="truncate">{p.name} <span className="text-slate-500 text-xs">{p.client}</span></span>
              <span className={p.due && p.due < today ? "text-red-400" : "text-amber-400"}>{inr(p.amount - p.paid)}{p.due && p.due < today ? " • overdue" : ""}</span>
            </div>
          ))}
          {!P.some(p => p.amount > p.paid) && <p className="text-xs text-slate-500">Nothing pending 🎉</p>}
        </C>
      </>}

      {tab === "Projects" && <>
        <div className="flex flex-wrap gap-2 items-center">
          <button className={btn} onClick={() => { setPf(blankP); setShowP(true); }}>+ New project</button>
          <button className={ghost} onClick={() => { setPf({ ...blankP, old: true, date: "" }); setShowP(true); }}>+ Add old project</button>
          <input className={inp + " !w-56"} placeholder="Search name / client / remark" value={q} onChange={e => setQ(e.target.value)} />
          <select className={inp + " !w-36"} value={fs} onChange={e => setFs(e.target.value)}>{["All", ...STAT].map(s => <option key={s}>{s}</option>)}</select>
          <span className="text-xs text-slate-500 ml-auto">{listP.length} shown • Pending {inr(sum(listP, p => p.amount - p.paid))}</span>
        </div>
        {showP && <Form title={pf._id ? "Edit project" : "Add project"} f={PF} v={pf} set={setPf} ok={() => save({ ...pf, date: pf.date || today }, () => { setShowP(false); setPf(blankP); })} cancel={() => { setShowP(false); setPf(blankP); }} />}
        <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
          <table className="w-full text-xs">
            <thead className="text-slate-400 text-left"><tr>{["Project", "Source", "Total", "Received", "Pending", "Mode", "Timeline", "Status", "Remark", ""].map(h => <th key={h} className="p-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {listP.map(p => (
                <tr key={p._id} className="border-t border-slate-800 hover:bg-slate-800/40">
                  <td className="p-2.5"><b>{p.name}</b>{p.old && <span className="ml-1 text-[9px] text-slate-400 border border-slate-700 rounded px-1">OLD</span>}<br /><span className="text-slate-500">{p.client}</span></td>
                  <td className="p-2.5">{S[p.source] || "—"}</td>
                  <td className="p-2.5">{inr(p.amount)}</td>
                  <td className="p-2.5 text-emerald-400">{inr(p.paid)}</td>
                  <td className={`p-2.5 ${p.amount > p.paid ? "text-amber-400" : "text-slate-500"}`}>{inr(p.amount - p.paid)}</td>
                  <td className="p-2.5">{p.mode || "—"}</td>
                  <td className={`p-2.5 whitespace-nowrap ${p.due && p.due < today && p.status !== "Completed" ? "text-red-400" : ""}`}>{p.start || "—"} → {p.due || "—"}</td>
                  <td className="p-2.5"><span className={`px-2 py-0.5 rounded-full border ${SC[p.status] || SC.Planning}`}>{p.status || "Planning"}</span></td>
                  <td className="p-2.5 max-w-48 truncate" title={p.remark}>{p.remark}</td>
                  <td className="p-2.5 whitespace-nowrap"><button className="text-cyan-400 mr-2" onClick={() => editP(p)}>Edit</button><button className="text-red-400" onClick={() => del(p._id)}>Delete</button></td>
                </tr>
              ))}
              {!listP.length && <tr><td colSpan={10} className="p-6 text-center text-slate-500">No projects yet — add your first one.</td></tr>}
            </tbody>
          </table>
        </div>
      </>}

      {tab === "Sources" && <>
        {pills(["all", ...Object.keys(S)], src, k => { setSrc(k); setTf(blankT(k === "all" ? "seo" : k)); setShowT(false); }, k => (k === "all" ? "All sources" : S[k]))}
        <div className="flex flex-wrap items-center gap-2">
          {newSrc === null ? <button className={ghost} onClick={() => setNewSrc("")}>+ Add source</button> : (
            <form onSubmit={addSrc} className="flex gap-2"><input autoFocus className={inp + " !w-56"} placeholder="New source name" value={newSrc} onChange={e => setNewSrc(e.target.value)} /><button className={btn}>Add</button><button type="button" className={ghost} onClick={() => setNewSrc(null)}>Cancel</button></form>
          )}
          {src !== "all" && S[src] && <><button className={ghost} onClick={renameSrc}>Rename</button><button className={ghost + " !text-red-400"} onClick={removeSrc}>Remove</button></>}
        </div>
        {block(src === "all" ? tasks : tasks.filter(t => t.source === src))}
        {src === "all" ? (
          <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
            <table className="w-full text-xs">
              <thead className="text-slate-400 text-left"><tr>{["Source", "Budget", "Spent", "Earned", "Net", "ROI", "Budget used"].map(h => <th key={h} className="p-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>{Object.keys(S).map(k => {
                const s = st[k]; return (
                  <tr key={k} className="border-t border-slate-800 hover:bg-slate-800/40 cursor-pointer" onClick={() => setSrc(k)}>
                    <td className="p-2.5 font-semibold">{S[k]}</td><td className="p-2.5">{inr(s.budget)}</td><td className="p-2.5 text-violet-400">{inr(s.inv)}</td><td className="p-2.5 text-emerald-400">{inr(s.earn)}</td>
                    <td className={`p-2.5 ${s.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>{inr(s.net)}</td><td className="p-2.5">{s.inv ? ((s.net / s.inv) * 100).toFixed(0) + "%" : "—"}</td>
                    <td className="p-2.5 w-40">{s.budget ? <Bar p={(s.inv / s.budget) * 100} c={s.inv > s.budget ? "bg-red-500" : "bg-violet-500"} /> : "—"}</td>
                  </tr>);
              })}
                <tr className="border-t-2 border-slate-700 font-bold"><td className="p-2.5">Total</td><td className="p-2.5">{inr(tot.budget)}</td><td className="p-2.5">{inr(tot.inv)}</td><td className="p-2.5">{inr(tot.earn)}</td><td className="p-2.5">{inr(tot.net)}</td><td colSpan={2} /></tr>
              </tbody>
            </table>
          </div>
        ) : (() => {
          const s = st[src], tx = T.filter(t => t.source === src).sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1)); return <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <K l="Budget" v={L(s.budget)} c="text-slate-200" /><K l="Spent" v={L(s.inv)} s={s.budget ? `${((s.inv / s.budget) * 100).toFixed(0)}% of budget` : ""} c="text-violet-400" />
              <K l="Earned" v={L(s.earn)} s={`incl. ${L(sum(P.filter(p => sk(p) === src), p => p.paid))} from projects`} c="text-emerald-400" />
              <K l="Net profit" v={L(s.net)} c={s.net >= 0 ? "text-emerald-400" : "text-red-400"} /><K l="ROI" v={s.inv ? ((s.net / s.inv) * 100).toFixed(0) + "%" : "—"} s={`${((s.net / GOAL) * 100).toFixed(1)}% of goal`} />
            </div>
            <C t="Spent (purple) vs Earned (green) — monthly"><Bars d={roll(events(src), "month").map(o => ({ l: o.l, a: o.a, b: o.b }))} k={["a", "b"]} c={["#34d399", "#a78bfa"]} /></C>
            <div><button className={btn} onClick={() => { setTf(blankT(src)); setShowT(true); }}>+ Add budget / expense / earning</button></div>
            {showT && <Form title={tf._id ? "Edit entry" : `New entry — ${S[src]}`} f={TF} v={tf} set={setTf} ok={() => save({ ...tf, source: src }, () => { setShowT(false); setTf(blankT(src)); })} cancel={() => setShowT(false)} />}
            <C t="Ledger">
              {tx.map(t => (
                <div key={t._id} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-800 last:border-0">
                  <span className="text-xs text-slate-500 w-20">{t.date}</span>
                  <span className={`text-[10px] px-2 rounded-full border ${t.kind === "earn" ? SC.Completed : t.kind === "invest" ? "text-violet-400 border-violet-800 bg-violet-950" : SC["On Hold"]}`}>{t.kind === "invest" ? "spent" : t.kind}</span>
                  <b className="w-24">{inr(t.amount)}</b><span className="flex-1 truncate text-slate-400">{t.note}</span>
                  <button className="text-cyan-400 text-xs" onClick={() => { setTf({ ...t }); setShowT(true); }}>Edit</button><button className="text-red-400 text-xs" onClick={() => del(t._id)}>Delete</button>
                </div>
              ))}
              {!tx.length && <p className="text-xs text-slate-500">No entries yet. Projects tagged to this source add their received money automatically.</p>}
            </C>
          </>;
        })()}
      </>}
    </main>
  );
}