"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, Building2, CalendarDays, CheckCircle2, ChevronDown,
  CircleDollarSign, FileSpreadsheet, Filter, LayoutDashboard, LogOut, RefreshCw,
  Search, ShieldCheck, Ticket, WalletCards
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Tx = {
  id: string; entity: string; rowNumber: number; date: string; employee: string; nopek: string;
  tripNumber: string; airline: string; bookingCode: string; purchase: number; refund: number;
  transferAmount: number; accountNumber: string; company: string; transfer: string;
  description: string; ra: string; dn: string; cn: string;
};
type Payload = { transactions: Tx[]; sheets: string[]; updatedAt: string };
const money = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const shortMoney = (n: number) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const dateLabel = (s: string) => s || "—";

export default function Dashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entity, setEntity] = useState("Semua entitas");
  const [query, setQuery] = useState("");
  const [airline, setAirline] = useState("Semua maskapai");
  const [transfer, setTransfer] = useState("Semua status");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/transactions", { cache: "no-store" });
      const json = await res.json();
      if (res.status === 401) { setLoggedIn(false); setData(null); return; }
      if (!res.ok) throw new Error(json.error || "Gagal memuat data.");
      setData(json); setLoggedIn(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Terjadi kesalahan."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoginError("");
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login gagal.");
      setPassword(""); await load();
    } catch (e) { setLoginError(e instanceof Error ? e.message : "Login gagal."); }
  }
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    setLoggedIn(false); setData(null);
  }

  const all = data?.transactions ?? [];
  const entities = data?.sheets ?? [];
  const airlines = useMemo(() => [...new Set(all.map(t => t.airline).filter(Boolean))].sort(), [all]);
  const filtered = useMemo(() => all.filter(t => {
    const entityOk = entity === "Semua entitas" || t.entity === entity;
    const queryText = `${t.employee} ${t.nopek} ${t.bookingCode} ${t.tripNumber} ${t.company} ${t.accountNumber}`.toLowerCase();
    const queryOk = queryText.includes(query.toLowerCase());
    const airlineOk = airline === "Semua maskapai" || t.airline === airline;
    const status = t.transfer.toLowerCase();
    const transferOk = transfer === "Semua status" || (transfer === "Sudah transfer" ? /done|sudah|berhasil|transfer/i.test(status) : !/done|sudah|berhasil|transfer/i.test(status));
    return entityOk && queryOk && airlineOk && transferOk;
  }), [all, entity, query, airline, transfer]);
  const totals = useMemo(() => filtered.reduce((a, t) => ({
    purchase: a.purchase + t.purchase, refund: a.refund + t.refund, transfer: a.transfer + t.transferAmount
  }), { purchase: 0, refund: 0, transfer: 0 }), [filtered]);
  const chart = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(t => map.set(t.entity, (map.get(t.entity) ?? 0) + t.purchase));
    return [...map.entries()].sort((a,b) => b[1]-a[1]).slice(0, 8).map(([name, total]) => ({ name: name.replace(/^\d+\.\s*/, ""), total }));
  }, [filtered]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function exportCsv() {
    const headers = ["Entitas","Tanggal","Nama Pekerja","Nopek","Trip Number","Maskapai/Hotel","Kode Booking","Nilai Pembelian","Nilai Refund","Jumlah Transfer","No Rekening","Perusahaan","Status Transfer","Keterangan","RA","DN","CN"];
    const rows = filtered.map(t => [t.entity,t.date,t.employee,t.nopek,t.tripNumber,t.airline,t.bookingCode,t.purchase,t.refund,t.transferAmount,t.accountNumber,t.company,t.transfer,t.description,t.ra,t.dn,t.cn]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "rekap-transaksi.csv"; a.click(); URL.revokeObjectURL(url);
  }

  if (!loggedIn) return <main className="login-wrap">
    <form className="login-card" onSubmit={login}>
      <div className="brand-mark"><FileSpreadsheet size={25}/></div>
      <p className="eyebrow">MTT • INTERNAL SYSTEM</p>
      <h1>Transaction Dashboard</h1>
      <p className="muted">Masuk untuk melihat rekap pembelian, refund, dan transfer dari Google Sheets.</p>
      <label className="field-label" htmlFor="password">Password dashboard</label>
      <input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password" required />
      {loginError && <p className="error-text">{loginError}</p>}
      {error && <p className="error-text">{error}</p>}
      <button className="primary-btn full-btn" type="submit">Masuk ke dashboard</button>
      <div className="secure-note"><ShieldCheck size={15}/> Akses internal • Data tidak dipublikasikan</div>
    </form>
  </main>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><FileSpreadsheet size={22}/></div><div><b>MTT Dashboard</b><small>TRANSACTION CENTER</small></div></div>
      <div className="nav-caption">MENU UTAMA</div>
      <a className="nav-item active"><LayoutDashboard size={18}/> Ringkasan</a>
      <a className="nav-item" href="#transactions"><Ticket size={18}/> Semua Transaksi</a>
      <a className="nav-item" href="#entities"><Building2 size={18}/> Per Entitas</a>
      <div className="sidebar-bottom"><div className="connected"><span/> Google Sheets terhubung</div><button className="nav-item logout" onClick={logout}><LogOut size={18}/> Keluar</button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div><p className="eyebrow">REPORTING & ANALYTICS</p><h1>Ringkasan Transaksi</h1><p className="muted">Pantau transaksi pembelian tiket, refund, dan transfer dalam satu tempat.</p></div>
        <div className="top-actions"><span className="live-pill"><span/> Live data</span><button className="outline-btn" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""}/> Refresh</button></div>
      </header>
      {error && <div className="alert"><b>Data belum bisa dimuat:</b> {error}<p>Pastikan Google Sheets API aktif, service account sudah diberi akses Viewer ke spreadsheet, dan environment variables sudah diisi.</p></div>}
      <section className="filterbar">
        <div className="filter-title"><Filter size={16}/> Filter data</div>
        <label><span>Entitas</span><select value={entity} onChange={e => {setEntity(e.target.value);setPage(1)}}><option>Semua entitas</option>{entities.map(s => <option key={s}>{s}</option>)}</select></label>
        <label><span>Maskapai / hotel</span><select value={airline} onChange={e => {setAirline(e.target.value);setPage(1)}}><option>Semua maskapai</option>{airlines.map(s => <option key={s}>{s}</option>)}</select></label>
        <label><span>Status transfer</span><select value={transfer} onChange={e => {setTransfer(e.target.value);setPage(1)}}><option>Semua status</option><option>Sudah transfer</option><option>Belum transfer</option></select></label>
        <div className="searchbox"><Search size={17}/><input value={query} onChange={e => {setQuery(e.target.value);setPage(1)}} placeholder="Cari nama, Nopek, booking..." /></div>
      </section>
      <section className="stats-grid">
        <article className="stat-card"><div className="stat-top"><span>Total pembelian</span><span className="stat-icon green"><WalletCards size={19}/></span></div><strong>{money(totals.purchase)}</strong><small><Activity size={13}/> {filtered.length.toLocaleString("id-ID")} transaksi terfilter</small></article>
        <article className="stat-card"><div className="stat-top"><span>Total refund</span><span className="stat-icon amber"><CircleDollarSign size={19}/></span></div><strong>{money(totals.refund)}</strong><small>Nilai refund dari data terfilter</small></article>
        <article className="stat-card"><div className="stat-top"><span>Total ditransfer</span><span className="stat-icon blue"><ArrowDownToLine size={19}/></span></div><strong>{money(totals.transfer)}</strong><small>Jumlah transfer terakumulasi</small></article>
        <article className="stat-card"><div className="stat-top"><span>Daftar entitas</span><span className="stat-icon purple"><Building2 size={19}/></span></div><strong>{entities.length}</strong><small>Tab spreadsheet terdeteksi</small></article>
      </section>
      <section className="content-grid" id="entities">
        <article className="panel chart-panel"><div className="panel-head"><div><h2>Pembelian per entitas</h2><p>8 entitas dengan nilai pembelian terbesar</p></div><span className="panel-icon"><Activity size={18}/></span></div>
          <div className="chart-wrap">{chart.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 10, right: 12, left: 5, bottom: 28 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eeea"/><XAxis dataKey="name" tick={{fontSize:11,fill:"#748179"}} angle={-18} textAnchor="end" interval={0}/><YAxis tickFormatter={shortMoney} tick={{fontSize:11,fill:"#748179"}} width={52}/><Tooltip formatter={(v) => money(Number(v))}/><Bar dataKey="total" name="Pembelian" fill="#237653" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer> : <div className="empty-state">Grafik muncul setelah data berhasil dimuat.</div>}</div>
        </article>
        <article className="panel entity-panel"><div className="panel-head"><div><h2>Daftar entitas</h2><p>Sheet yang ditemukan</p></div><Building2 size={19} color="#237653"/></div>
          <div className="entity-list">{entities.slice(0, 9).map((s,i) => <button key={s} className={`entity-row ${entity===s?"selected":""}`} onClick={() => {setEntity(s);setPage(1)}}><span className="entity-number">{String(i+1).padStart(2,"0")}</span><span>{s}</span><ChevronDown size={15}/></button>)}{entities.length===0 && <p className="muted">Nama sheet akan tampil setelah terhubung.</p>}</div>
          {entities.length > 9 && <p className="muted small-note">+ {entities.length - 9} sheet lainnya tersedia pada filter entitas.</p>}
        </article>
      </section>
      <section className="panel table-panel" id="transactions">
        <div className="panel-head table-head"><div><h2>Data transaksi</h2><p>Data diambil dari semua sheet dengan format transaksi yang terdeteksi.</p></div><button className="primary-btn" onClick={exportCsv} disabled={!filtered.length}><ArrowDownToLine size={16}/> Ekspor CSV</button></div>
        <div className="table-scroll"><table><thead><tr><th>Entitas</th><th>Tanggal pembelian</th><th>Nama pekerja</th><th>Nopek</th><th>Maskapai / hotel</th><th>Kode booking</th><th className="right">Pembelian</th><th className="right">Refund</th><th className="right">Ditransfer</th><th>Status</th></tr></thead><tbody>
          {pageRows.map(t => <tr key={t.id}><td><span className="entity-tag">{t.entity.replace(/^\d+\.\s*/,"")}</span></td><td className="nowrap">{dateLabel(t.date)}</td><td className="employee-cell">{t.employee || "—"}</td><td>{t.nopek || "—"}</td><td>{t.airline || "—"}</td><td className="mono">{t.bookingCode || "—"}</td><td className="right money">{money(t.purchase)}</td><td className="right money">{money(t.refund)}</td><td className="right money">{money(t.transferAmount)}</td><td><span className={`status ${/done|sudah|berhasil|transfer/i.test(t.transfer)?"done":"pending"}`}>{/done|sudah|berhasil|transfer/i.test(t.transfer)?<CheckCircle2 size={12}/>:<CalendarDays size={12}/>} {t.transfer || "Belum diketahui"}</span></td></tr>)}
          {!pageRows.length && <tr><td colSpan={10} className="empty-cell">{loading ? "Memuat data..." : "Tidak ada transaksi yang cocok dengan filter."}</td></tr>}
        </tbody></table></div>
        <div className="table-footer"><span>Menampilkan {filtered.length ? (page-1)*pageSize+1 : 0}–{Math.min(page*pageSize,filtered.length)} dari {filtered.length} transaksi</span><div className="pagination"><button disabled={page<=1} onClick={() => setPage(p=>p-1)}>Sebelumnya</button><span>{page} / {pageCount}</span><button disabled={page>=pageCount} onClick={() => setPage(p=>p+1)}>Berikutnya</button></div></div>
      </section>
      <footer className="footer"><span>MTT Transaction Dashboard</span><span>{data?.updatedAt ? `Data dimuat ${new Date(data.updatedAt).toLocaleString("id-ID")}` : "Menunggu koneksi data"}</span></footer>
    </main>
  </div>;
}
