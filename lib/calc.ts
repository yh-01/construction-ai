/* =========================================================
   計算（見積・実行予算・打刻→人工→原価・外注支払）。すべて純関数。
   HTMLモック v0.1.5 の計算をそのまま移植
   ========================================================= */
import type {
  AppState, Project, Estimate, EstVersion, EstLine, Punch, Customer, Contact, Div, Product, Worker, Partner, Vendor, Cost, Role,
} from './types';
import { TODAY, SITE_INTERNAL, DEFAULT_RATE, DIVS, CAT2DIV } from './data';
import { toMin, round025, norm, hm } from './format';

/* ---- 参照 ---- */
export const prod = (s: AppState, code?: string): Product | undefined => s.products.find(p => p.code === code);
export const cust = (s: AppState, id: string | null | undefined): Customer | undefined => id ? s.customers.find(c => c.id === id) : undefined;
export const worker = (s: AppState, id: string): Worker => s.workers.find(w => w.id === id) as Worker;
export const partner = (s: AppState, id: string): Partner => s.partners.find(p => p.id === id) as Partner;
export const vendor = (s: AppState, id: string): Vendor => s.vendors.find(v => v.id === id) as Vendor;
export const isExt = (s: AppState, wid: string) => worker(s, wid).kind !== '社員';
export const projById = (s: AppState, id: string | null | undefined): Project | undefined => s.projects.find(p => p.id === id);
export const projByNo = (s: AppState, no: string | null | undefined): Project | undefined => s.projects.find(p => !!p.no && p.no === no);
export const ruleName = (s: AppState, id?: string) => (s.workRules.find(r => r.id === id) || {}).name || '－';

export type CustView = { id: string | null; name: string; short: string; tel: string; rate: number; unreg: boolean; contacts?: Contact[]; note?: string };
export function custOf(s: AppState, p: Project): CustView {
  const c = cust(s, p.cust);
  if (c) return { id: c.id, name: c.name, short: c.short, tel: c.tel, rate: c.rate, unreg: false, contacts: c.contacts, note: c.note };
  return { id: null, name: p.custName || '（未入力）', short: p.custName || '（未入力）', tel: '－', rate: DEFAULT_RATE, unreg: true };
}
export function contactOf(s: AppState, p: Project): Contact | null {
  const c = custOf(s, p);
  if (!c.unreg && p.contactId) { const k = (c.contacts || []).find(x => x.id === p.contactId); if (k) return k; }
  return p.contact ? { name: p.contact.name, dept: '', email: p.contact.email, tel: p.contact.tel } : null;
}
export const persons = (c: Customer) => (c.contacts || []).map(k => k.name).join('・') || '－';
export const siteName = (s: AppState, no: string) => no === SITE_INTERNAL ? '社内作業' : (projByNo(s, no)?.title || no);
export const siteShort = (no: string) => no === SITE_INTERNAL ? '社内作業' : no;

/* ---- 見積 ---- */
export type LineCalc = { cost: number; rate: number | null; sale: number; amount: number; costAmt: number; gross: number };
export function lineCalc(s: AppState, l: EstLine, custRate: number): LineCalc {
  if (l.type === 'misc' || l.type === 'disc') return { cost: 0, rate: null, sale: l.amount || 0, amount: l.amount || 0, costAmt: 0, gross: l.amount || 0 };
  const p = prod(s, l.code);
  const cost = l.cost ?? p?.cost ?? 0;
  const rate = l.rate ?? custRate;
  const sale = Math.round(cost * rate);
  const amount = sale * l.qty, costAmt = cost * l.qty;
  return { cost, rate, sale, amount, costAmt, gross: amount - costAmt };
}
export type EstTotals = { sub: number; tax: number; total: number; cost: number; gross: number; gp: number };
export function estTotals(s: AppState, lines: EstLine[], custRate: number): EstTotals {
  let sub = 0, cost = 0;
  lines.forEach(l => { const c = lineCalc(s, l, custRate); sub += c.amount; cost += c.costAmt; });
  const tax = Math.floor(sub * 0.10);
  return { sub, tax, total: sub + tax, cost, gross: sub - cost, gp: sub ? (sub - cost) / sub : 0 };
}
export type BudgetSrcRow = { div: Div; group: string; init: number; change: number };
export function budgetRows(s: AppState, lines: EstLine[], custRate: number): BudgetSrcRow[] {
  const rows: Record<string, BudgetSrcRow> = {};
  lines.forEach(l => {
    if (l.type !== 'item') return;
    const p = prod(s, l.code); if (!p) return; const div = CAT2DIV[p.cat];
    const k = div + '|' + l.group; rows[k] = rows[k] || { div, group: l.group, init: 0, change: 0 };
    rows[k].init += lineCalc(s, l, custRate).costAmt;
  });
  return Object.values(rows);
}
export function groupsOf(v: EstVersion): string[] {
  const g: string[] = []; v.lines.forEach(l => { if (!g.includes(l.group)) g.push(l.group); });
  (v.groups || []).forEach(x => { if (!g.includes(x)) g.push(x); });
  return g;
}
export function searchProducts(s: AppState, q: string) { const n = norm(q); return s.products.filter(p => !p.stopped && (!n || norm(p.name + p.alias + p.code + p.spec).includes(n))); }

export type LatestVer = { e: Estimate; ei: number; v: EstVersion };
export function latestVer(p: Project): LatestVer | null { // 最も新しい版（枝番の見積は除く）
  let best: LatestVer | null = null;
  p.estimates.forEach((e, ei) => { if (e.branchOf) return; const v = e.versions[e.versions.length - 1]; if (!best || v.date > best.v.date) best = { e, ei, v }; });
  return best;
}
export function estState(s: AppState, p: Project) {
  const le = latestVer(p); if (!le) return null;
  return { no: le.e.no, v: le.v.v, state: le.v.state, amount: le.v.lines.length ? estTotals(s, le.v.lines, le.e.rate).sub : null, estCount: p.estimates.filter(e => !e.branchOf).length };
}
export function orderables(p: Project): LatestVer[] { const out: LatestVer[] = []; p.estimates.forEach((e, ei) => { if (e.branchOf) return; e.versions.forEach(v => { if (v.lines.length && v.state !== '失注') out.push({ e, ei, v }); }); }); return out; }
export function custSuggest(s: AppState, name?: string): Customer | null {
  if (!name) return null;
  const n = norm(name);
  return s.customers.find(c => { const sh = norm(c.short), f = norm(c.name); return n.includes(sh) || f.includes(n.slice(0, 4)) || n.includes(f.slice(0, 4)); }) || null;
}

/* ---- 打刻 ---- */
export function rateOf(s: AppState, wid: string, date: string): number {
  const w = worker(s, wid);
  if (w.kind === '社員') { let v = 0; (w.rates || []).forEach(r => { if (r.from <= date) v = r.v; }); return v; }
  const pt = partner(s, w.org); if (pt.rateHist && pt.rateHist.length) { let v = pt.rateHist[0].v; pt.rateHist.forEach(r => { if (r.from <= date) v = r.v; }); return v; } return pt.rate || 0;
}
export const isFinal = (r: Punch) => r.status === '承認' || r.status === '確認';
export type RecCalc = {
  siteMin: Record<string, number>; internal: number; work: number; breakMin: number; dayNinku: number; bySite: Record<string, number>;
  open: boolean; start: number | null; end: number | null; over: number; normal: number; extra: number;
};
export function recCalc(r: Punch): RecCalc {
  const brk = r.breaks.filter(b => b.end) as { start: string; end: string }[];
  const siteMin: Record<string, number> = {}; let internal = 0, open = false, first: number | null = null, last: number | null = null;
  r.segs.forEach(sg => {
    if (first === null || toMin(sg.start) < first) first = toMin(sg.start);
    if (!sg.end) { open = true; return; }
    const a = toMin(sg.start), b = toMin(sg.end);
    if (last === null || b > last) last = b;
    let m = b - a;
    brk.forEach(k => { const o = Math.min(b, toMin(k.end)) - Math.max(a, toMin(k.start)); if (o > 0) m -= o; });
    if (sg.site === SITE_INTERNAL) internal += m; else siteMin[sg.site] = (siteMin[sg.site] || 0) + m;
  });
  const breakMin = brk.reduce((t, k) => t + toMin(k.end) - toMin(k.start), 0);
  const siteTot = Object.values(siteMin).reduce((a, b) => a + b, 0);
  const work = siteTot + internal;
  const dayNinku = round025(siteTot / 480);
  const bySite: Record<string, number> = {}; const keys = Object.keys(siteMin); let acc = 0;
  keys.forEach((k, i) => { const v = i === keys.length - 1 ? dayNinku - acc : round025(dayNinku * siteMin[k] / siteTot); bySite[k] = v; acc += v; });
  const extra = Math.max(0, dayNinku - 1);
  return { siteMin, internal, work, breakMin, dayNinku, bySite, open, start: first, end: open ? null : last, over: Math.max(0, work - 480), normal: dayNinku - extra, extra };
}
export function recWarnings(s: AppState, r: Punch): string[] {
  const c = recCalc(r), w: string[] = [];
  if (c.open) w.push(r.date < TODAY ? '退勤の打ち忘れ' : '退勤の打刻がまだ');
  r.segs.forEach(sg => { if (sg.site !== SITE_INTERNAL) { const p = projByNo(s, sg.site); if (p && !p.members.includes(r.worker)) w.push('割り当てていない現場（' + sg.site + '）'); } });
  if (c.work > 600) w.push('長時間（' + hm(c.work) + '）');
  if (r.date < TODAY && r.status === '入力済') w.push('未承認のまま翌日');
  return w;
}

/* ---- 案件の原価・予算 ---- */
export type Labor = { staffNinku: number; staffCost: number; extNinku: number; extCost: number; pendingNinku: number };
export function laborOf(s: AppState, no: string, opt?: { noPast?: boolean }): Labor {
  const p = projByNo(s, no);
  const res: Labor = { staffNinku: 0, staffCost: 0, extNinku: 0, extCost: 0, pendingNinku: 0 };
  if (p && p.pastLabor && !opt?.noPast) { const pl = p.pastLabor; res.staffNinku += pl.staffNinku; res.staffCost += pl.staffCost; res.extNinku += pl.extNinku; res.extCost += pl.extCost; }
  s.punches.forEach(r => {
    const c = recCalc(r); const n = c.bySite[no]; if (!n) return;
    if (!isFinal(r)) { res.pendingNinku += n; return; }
    const cost = n * rateOf(s, r.worker, r.date);
    if (isExt(s, r.worker)) { res.extNinku += n; res.extCost += cost; } else { res.staffNinku += n; res.staffCost += cost; }
  });
  return res;
}
export type ProjFin = {
  contract: number; budget: number; budgetBy: Record<Div, number>; actual: number; actBy: Record<Div, number>; lab: Labor;
  remain: number; planGP: number; actGP: number; consume: number;
};
export function projFin(s: AppState, p: Project): ProjFin {
  const contract = (p.contract || []).reduce((t, c) => t + c.amount, 0);
  const budgetBy = {} as Record<Div, number>; DIVS.forEach(d => budgetBy[d] = 0);
  (p.budget || []).forEach(b => budgetBy[b.div] += b.init + b.change);
  const budget = Object.values(budgetBy).reduce((a, b) => a + b, 0);
  const actBy = {} as Record<Div, number>; DIVS.forEach(d => actBy[d] = 0);
  const lab = p.no ? laborOf(s, p.no) : { staffNinku: 0, staffCost: 0, extNinku: 0, extCost: 0, pendingNinku: 0 };
  actBy['労務費'] = lab.staffCost + lab.extCost;
  (p.no ? s.costs[p.no] || [] : []).forEach(c => actBy[c.cat] += c.amount);
  const actual = Object.values(actBy).reduce((a, b) => a + b, 0);
  return { contract, budget, budgetBy, actual, actBy, lab, remain: budget - actual, planGP: contract - budget, actGP: contract - actual, consume: budget ? actual / budget : 0 };
}
export const meterCls = (r: number) => r > 1 ? 'over' : r > 0.85 ? 'warn' : '';
export const budDraft = (s: AppState, p: Project) => (s.budState[p.no || ''] || {}).state === '下書き';
export const caseHasActuals = (s: AppState, p: Project) => (s.costs[p.no || ''] || []).length > 0 || s.punches.some(r => r.segs.some(sg => sg.site === p.no)) || !!p.pastLabor;
export const costVendorName = (s: AppState, c: Cost) => c.vid ? partner(s, c.vid).name : c.sid ? vendor(s, c.sid).name : c.vendor;

/* ---- 外注支払 ---- */
export function ptRate(pt: Partner, date: string): number { const h = pt.rateHist || []; if (!h.length) return pt.rate || 0; let v = h[0].v; h.forEach(r => { if (r.from <= date) v = r.v; }); return v; }
export const monthEnd = (m: string) => m + '-31';
export type PayCalc = {
  normal: number; extra: number; pending: number; bySite: Record<string, number>; byDay: { date: string; worker: string; site: string; n: number }[];
  amount: number; adj: { contract: number; deduct: number }; ukeoi: (Cost & { no: string })[]; contract: number; safety: number; pay: number;
};
export function payCalc(s: AppState, pid: string, month: string): PayCalc {
  const ws = s.workers.filter(w => w.org === pid);
  const recs = s.punches.filter(r => ws.some(w => w.id === r.worker) && r.date.startsWith(month));
  let normal = 0, extra = 0, pending = 0, amt = 0; const bySite: Record<string, number> = {}; const byDay: PayCalc['byDay'] = [];
  const pt = partner(s, pid);
  recs.forEach(r => { const c = recCalc(r); if (c.open) return;
    if (!isFinal(r)) { pending += c.dayNinku; return; }
    normal += c.normal; extra += c.extra; amt += (c.normal + c.extra) * ptRate(pt, r.date);
    Object.entries(c.bySite).forEach(([k, v]) => { bySite[k] = (bySite[k] || 0) + v; byDay.push({ date: r.date, worker: r.worker, site: k, n: v }); }); });
  const adj = s.payAdj[month + pid] || { contract: 0, deduct: pid === 'K2' ? 6000 : 0 };
  const amount = amt; // 単価は打刻日時点（協力会社マスタの単価履歴）
  // 請負（出来高）は案件の原価実績（外注費・この協力会社）から自動で集計する
  const ukeoi: PayCalc['ukeoi'] = []; Object.entries(s.costs).forEach(([no, list]) => list.forEach(c => { if (c.vid === pid && c.date.startsWith(month)) ukeoi.push({ no, ...c }); }));
  const contract = ukeoi.reduce((t, c) => t + c.amount, 0);
  const safety = Math.floor((amount + contract) * (pt.safety || 0) / 100); // 安全協力会費（協力会社マスタの率）
  return { normal, extra, pending, bySite, byDay, amount, adj, ukeoi, contract, safety, pay: amount + contract - safety - adj.deduct };
}

/* ---- 役割・権限 ---- */
export type RoleDef = { pc: string[]; mobile: string[]; me: string | null; edit: boolean; cost: 'show' | 'kari' | 'hide' };
export const ROLES: Record<Role, RoleDef> = {
  '管理者':   { pc: ['S-12', 'S-13', 'S-01', 'S-02', 'S-03', 'S-05', 'S-06', 'S-07', 'S-08', 'S-10', 'S-11'], mobile: [], me: null, edit: true, cost: 'show' },
  '経理':     { pc: ['S-12', 'S-13', 'S-01', 'S-02', 'S-03', 'S-05', 'S-06', 'S-07', 'S-08', 'S-10'], mobile: [], me: null, edit: false, cost: 'show' },
  '職長':     { pc: ['S-12', 'S-13', 'S-01', 'S-02', 'S-03', 'S-05', 'T-01', 'S-06'], mobile: ['M-01', 'M-02', 'M-03', 'M-04', 'M-05'], me: 'E1', edit: true, cost: 'kari' },
  '社員職人': { pc: [], mobile: ['M-01', 'M-02', 'M-03', 'M-04'], me: 'E2', edit: false, cost: 'hide' },
  '協力会社': { pc: [], mobile: ['M-01', 'M-02', 'M-03', 'M-04'], me: 'X1', edit: false, cost: 'hide' },
};
export const ROLE_NAMES = Object.keys(ROLES) as Role[];
export type ScreenDef = { name: string; mock: '○' | '△'; grp?: string; hidden?: boolean };
export const SCREENS: Record<string, ScreenDef> = {
  'S-12': { name: '与件一覧', mock: '○', grp: '与件・見積' }, 'S-13': { name: '見積一覧', mock: '○', grp: '与件・見積' },
  'S-02': { name: '与件詳細', mock: '○', hidden: true }, 'S-03': { name: '見積作成・編集', mock: '○', hidden: true },
  'S-01': { name: '案件一覧', mock: '○', grp: '案件' }, 'S-05': { name: '案件詳細（工事台帳）', mock: '○', hidden: true },
  'T-01': { name: '打刻（共用端末）', mock: '○', grp: '打刻・承認' }, 'S-06': { name: '日次チェック・承認', mock: '○', grp: '打刻・承認' },
  'S-07': { name: '勤怠集計・CSV', mock: '△', grp: '集計・支払' }, 'S-08': { name: '外注支払', mock: '○', grp: '集計・支払' },
  'S-10': { name: 'マスタ', mock: '○', grp: 'マスタ' }, 'S-11': { name: 'ユーザー・権限', mock: '△', grp: '管理' },
  'M-01': { name: 'ログイン', mock: '△' }, 'M-02': { name: '打刻', mock: '○' }, 'M-03': { name: '自分の記録', mock: '△' }, 'M-04': { name: '工程表', mock: '○' }, 'M-05': { name: '代理入力', mock: '○' },
};
/* 画面ID → URL（App Router） */
export const SCREEN_PATH: Record<string, string> = {
  'S-12': '/leads/', 'S-13': '/estimates/', 'S-02': '/leads/detail/', 'S-03': '/estimates/edit/',
  'S-01': '/projects/', 'S-05': '/projects/detail/', 'T-01': '/kiosk/', 'S-06': '/approvals/',
  'S-07': '/attendance/', 'S-08': '/payments/', 'S-10': '/masters/', 'S-11': '/users/',
};
export const PATH_SCREEN: Record<string, string> = Object.fromEntries(Object.entries(SCREEN_PATH).map(([k, v]) => [v, k]));
export const MASTERS = ['品目', '工種', '得意先', '作業員', '協力会社', '取引先', '就業ルール', '会社設定'] as const;

/* 職長は担当案件のみ */
export const myProjects = (s: AppState, role: Role) => s.projects.filter(p => role !== '職長' || p.foreman === 'E1');
export const mySites = (s: AppState, role: Role) => s.projects.filter(p => p.no && (p.status === '受注' || p.status === '施工中') && (role !== '職長' || p.foreman === 'E1'));
export const activeSites = (s: AppState) => s.projects.filter(p => p.no && (p.status === '受注' || p.status === '施工中'));
export const assignedSites = (s: AppState, wid: string) => s.projects.filter(p => p.no && (p.status === '受注' || p.status === '施工中') && p.members.includes(wid));
export const todayRec = (s: AppState, wid: string) => s.punches.find(r => r.worker === wid && r.date === TODAY);
export type PunchState = { state: '未出勤' | '作業中' | '退勤済'; r?: Punch; seg?: Punch['segs'][number] };
export function punchState(s: AppState, wid: string): PunchState { const r = todayRec(s, wid); if (!r) return { state: '未出勤' }; const seg = r.segs.find(x => !x.end); return seg ? { state: '作業中', r, seg } : { state: '退勤済', r }; }

/* 休憩のパターン（退勤時に選ぶ）【仮】 */
export type BreakDef = { k: string; label: string; sub: string; list: [string, string][] | null };
export const BREAKS: BreakDef[] = [
  { k: 'std', label: '標準 90分', sub: '10時15分・昼60分・15時15分', list: [['10:00', '10:15'], ['12:00', '13:00'], ['15:00', '15:15']] },
  { k: '60', label: '60分', sub: '昼のみ', list: [['12:00', '13:00']] },
  { k: '30', label: '30分', sub: '昼のみ短縮', list: [['12:00', '12:30']] },
  { k: '0', label: 'なし', sub: '', list: [] },
  { k: 'custom', label: '分で入力', sub: '5分単位', list: null },
];

/* 期限のプリセット判定（範囲指定はしない） */
export const DUE_OPTS: [string, string][] = [['over', '期限切れ'], ['7d', '7日以内'], ['month', '今月中'], ['later', '来月以降'], ['none', '未設定']];
export function duePass(v: string, d: string | null | undefined): boolean {
  if (!v) return true;
  if (v === 'none') return !d;
  if (!d) return false;
  const t = new Date(TODAY + 'T00:00:00'), x = new Date(d + 'T00:00:00'); const diff = (x.getTime() - t.getTime()) / 86400000;
  if (v === 'over') return diff < 0;
  if (v === '7d') return diff >= 0 && diff <= 7;
  if (v === 'month') return d.slice(0, 7) === TODAY.slice(0, 7) && diff >= 0;
  if (v === 'later') return d.slice(0, 7) > TODAY.slice(0, 7);
  return true;
}
