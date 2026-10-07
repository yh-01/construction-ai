/* =========================================================
   データの読み書きはここに集約する（将来DBに差し替えるため、画面から直接データを触らない）
   - createInitialState(): サンプルデータから初期状態を作る
   - 各関数は状態を直接書き換える（呼び出し側の StoreProvider が再描画を起こす）
   ========================================================= */
import type {
  AppState, Project, EstVersion, EstLine, Cost, Punch, Div, Customer, Worker, Partner, Product, Koshu, Vendor, WorkRule, RuleVer,
  Holiday, BudgetRow, MasterName, Summary, Contact, Flags, Company, Role, Proxy, User, BudgetLine, BudgetLineKind,
} from './types';
import {
  TODAY, ANCHOR, PREV_MONTH, SITE_INTERNAL, DEFAULT_RATE, KOSHU, CUSTOMERS, PRODUCTS, PARTNERS, WORKERS, VENDORS, WORK_RULES, COMPANY, HOLIDAYS,
  PROJECTS_INIT, COSTS_INIT, genPunches, DIVS, USERS,
} from './data';
import {
  cust, prod, worker, partner, vendor, isExt, projById, projByNo, custOf, estTotals, budgetRows, groupsOf, latestVer,
  orderables, recCalc, isFinal, budDraft, punchState, todayRec, BREAKS, mySites, ruleOfW, ruleVer,
} from './calc';
import { toMin, fromMin, norm } from './format';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/* サンプルデータの日付（ANCHOR 基準）を、実際の今日に合わせてずらす */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function daysBetween(a: string, b: string) { return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000); }
export function shiftDate(d: string, days: number) { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + days); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
function shiftDates<T>(obj: T, days: number): T {
  if (days === 0) return obj;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return DATE_RE.test(v) ? shiftDate(v, days) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') { const o: Record<string, unknown> = {}; Object.entries(v as Record<string, unknown>).forEach(([k, x]) => { o[k] = (k === 'id' || k === 'no' || k === 'code') ? x : walk(x); }); return o; }
    return v;
  };
  return walk(obj) as T;
}

/* ---- 初期状態（モックの initState をそのまま） ---- */
export function createInitialState(): AppState {
  const s: AppState = {
    customers: clone(CUSTOMERS), projects: clone(PROJECTS_INIT), costs: clone(COSTS_INIT), punches: genPunches(),
    nextSeq: 123, schedules: {}, bl: {}, payroll: {}, koshu: clone(KOSHU), company: clone(COMPANY), holidays: clone(HOLIDAYS),
    budState: {}, payAdj: {},
    products: clone(PRODUCTS), workers: clone(WORKERS), partners: clone(PARTNERS), vendors: clone(VENDORS), workRules: clone(WORK_RULES),
    users: clone(USERS),
  };
  Object.values(s.costs).forEach(l => l.forEach(c => { if (!c.vid) { const v = s.vendors.find(x => x.name === c.vendor); if (v) c.sid = v.id; } }));
  s.projects.forEach(p => { if (p.cust && !p.contactId) { const c = cust(s, p.cust); if (c && c.contacts && c.contacts.length) p.contactId = c.contacts[0].id; } });
  s.projects.forEach(p => p.estimates.forEach(e => { e.rate = p.cust ? (cust(s, p.cust) as Customer).rate : DEFAULT_RATE; }));
  s.projects.forEach(p => {
    if (!p.no) return;
    p.contract = []; p.budget = []; s.bl[p.no] = [];
    p.estimates.forEach(e => {
      const v = e.versions.find(x => x.state === '受注'); if (!v) return;
      const t = estTotals(s, v.lines, e.rate);
      if (!e.branchOf) {
        p.contract!.push({ no: p.no!, label: '当初（' + e.no + ' 第' + v.v + '版）', amount: t.sub });
        p.budget = budgetRows(s, v.lines, e.rate).map(r => ({ ...r, est: r.init }));
        s.budState[p.no!] = { state: '確定', at: v.date, by: '川口（管理者）' };
      } else {
        p.contract!.push({ no: e.branchNo!, label: '追加（' + e.no + ' 第' + v.v + '版）', amount: t.sub });
        budgetRows(s, v.lines, e.rate).forEach(r => {
          let row = p.budget!.find(b => b.div === r.div && b.group === r.group);
          if (!row) { row = { div: r.div, group: r.group, init: 0, change: 0, est: 0 }; p.budget!.push(row); }
          row.est = (row.est || 0) + r.init;
          s.bl[p.no!].push({ kind: '変更', date: v.date, div: r.div, group: r.group, amount: r.init, cat: '契約変更', reason: '追加工事 ' + e.branchNo + '（' + e.no + ' 第' + v.v + '版）を受注', who: '自動（受注時）', auto: true });
        });
      }
    });
    s.schedules[p.no] = [{ ver: 1, date: p.period ? p.period[0] : TODAY, name: '工程表（初版）.png' }];
  });
  s.bl['2026-0112'].push({ kind: '変更', date: '2026-08-24', div: '外注費', group: '電気工事', amount: 400000, cat: '見積漏れ', reason: 'プレス機の電源切替（外注）が見積に含まれていなかった', who: '佐藤 健一（施工管理）' });
  s.bl['2026-0112'].push({ kind: '変更', date: '2026-09-20', div: '経費', group: '撤去・搬出', amount: 6000, cat: '単価差', reason: 'ラフター回送費の値上がり', who: '佐藤 健一（施工管理）' });
  s.bl['2026-0104'].push({ kind: '変更', date: '2026-07-10', div: '外注費', group: '電気工事', amount: 150000, cat: '見積漏れ', reason: 'ポンプ電源の移設（外注）が見積に含まれていなかった', who: '田中 誠（施工管理）' });
  s.bl['2026-0114'].push({ kind: '変更', date: '2026-09-30', div: '経費', group: '仮設・運搬', amount: 30000, cat: '手配変更', reason: '高所作業車を10日→12日に延長', who: '田中 誠（施工管理）' });
  // 2026-0118 は受注したばかりで、実行予算はまだ下書き。確定前の調整の例
  s.budState['2026-0118'] = { state: '下書き' };
  s.bl['2026-0118'].push({ kind: '調整', date: '2026-10-06', div: '外注費', group: '搬入・据付', amount: 180000, cat: '手配変更', reason: '反応槽の吊り込みを浜鳶工業に一部外注（協力会社見積 10/5）', who: '田中 誠（施工管理）' });
  s.bl['2026-0118'].push({ kind: '調整', date: '2026-10-06', div: '労務費', group: '搬入・据付', amount: -144000, cat: '手配変更', reason: '上の外注に振り替えた分の自社人工（6人工）を減らす', who: '田中 誠（施工管理）' });
  s.projects.forEach(p => { if (p.no) syncBudget(s, p); });
  s.schedules['2026-0112'].push({ ver: 2, date: '2026-09-25', name: '工程表（9/25版）.png' });
  const out = shiftDates(s, daysBetween(ANCHOR, TODAY));
  out.payroll[PREV_MONTH] = { gross: '1780000', burden: '267000' }; // 先月の給与ソフトの実額（サンプル）
  return out;
}

/* ---- 実行予算の明細（v0.1.6） ----
   当初予算 ＝ 見積の原価（受注時に作る）＋ 確定前の「調整」明細。確定した時点で固定
   変更予算 ＝ 確定後の「変更」明細の合計（1件ずつ、理由区分つき） */
export function syncBudget(s: AppState, p: Project) {
  const L = s.bl[p.no!] = s.bl[p.no!] || []; const draft = (s.budState[p.no!] || {}).state === '下書き'; p.budget = p.budget || [];
  L.forEach(l => { if (!p.budget!.some(b => b.div === l.div && b.group === l.group)) p.budget!.push({ div: l.div, group: l.group, init: 0, change: 0, est: 0 }); });
  p.budget.forEach(b => { const m = L.filter(l => l.div === b.div && l.group === b.group);
    if (draft) b.init = (b.est || 0) + m.filter(l => l.kind === '調整').reduce((t, l) => t + l.amount, 0);
    b.change = m.filter(l => l.kind === '変更').reduce((t, l) => t + l.amount, 0); });
}

/* ---- 保存・復元（ブラウザの localStorage）。将来は DB に置き換える ---- */
export const STORAGE_KEY = 'hayate.state.v2';
export function serialize(s: AppState): string { return JSON.stringify(s); }
export function deserialize(json: string): AppState | null {
  try { const s = JSON.parse(json) as AppState; if (!s || !Array.isArray(s.projects) || !Array.isArray(s.users) || !s.bl || !s.company || !('laborMethod' in s.company)) return null; return s; } catch { return null; }
}

/* =========================================================
   与件（S-12 / S-02）
   ========================================================= */
export type LeadForm = { custName: string; title: string; reqDate: string; staff: string; site: string; contactName: string; email: string; tel: string; estDue: string };
export function saveLead(s: AppState, f: LeadForm): Project {
  let m = 0; s.projects.forEach(p => { const n = Number(p.id.slice(-3)); if (n > m) m = n; });
  const cn = f.custName.trim(); const hit = s.customers.find(c => c.name === cn);
  const p: Project = { id: 'Y-2026-' + String(m + 1).padStart(3, '0'), status: '与件', cust: hit ? hit.id : null, custName: cn || '（未入力）', title: f.title || '（件名未入力）',
    reqDate: f.reqDate, staff: f.staff, site: f.site || '－', estDue: f.estDue || null, expire: null, contact: { name: f.contactName, email: f.email, tel: f.tel },
    foreman: 'E1', period: null, no: null, members: [], estimates: [], memos: 0, files: [], summary: null };
  s.projects.unshift(p); return p;
}
export type LeadInfoForm = { cust: string; contactId: string; cn: string; t: string; d: string; s: string; site: string; due: string; exp: string; ctn: string; cte: string; ctt: string };
export function leadInfoInit(p: Project): LeadInfoForm {
  return { cust: p.cust || '', contactId: p.contactId || '', cn: p.custName || '', t: p.title, d: p.reqDate, s: p.staff, site: p.site, due: p.estDue || '', exp: p.expire || '', ctn: (p.contact || {}).name || '', cte: (p.contact || {}).email || '', ctt: (p.contact || {}).tel || '' };
}
export function saveLeadInfo(s: AppState, pid: string, d: LeadInfoForm) {
  const p = projById(s, pid)!;
  p.cust = d.cust || null; p.contactId = d.cust && d.contactId !== 'other' ? d.contactId : null; p.custName = d.cn; p.title = d.t || p.title; p.reqDate = d.d || p.reqDate; p.staff = d.s; p.site = d.site; p.estDue = d.due || null; p.expire = d.exp || null;
  if (!p.contactId) p.contact = { name: d.ctn, email: d.cte, tel: d.ctt };
}
export function saveSummary(s: AppState, pid: string, sum: Summary) { const p = projById(s, pid)!; p.summary = { ...(p.summary || {}), ...sum }; }
export function saveCaseSummary(s: AppState, pid: string, sum: Summary) { const p = projById(s, pid)!; p.summary = { ...sum }; }
export function lose(s: AppState, pid: string) { const p = projById(s, pid)!; p.status = '失注'; p.lostReason = p.lostReason || '（理由を入力）'; p.estimates.forEach(e => { const v = e.versions[e.versions.length - 1]; if (v.state !== '受注') v.state = '失注'; }); }
export function unlose(s: AppState, pid: string) { const p = projById(s, pid)!; p.status = p.estimates.length ? '見積中' : '与件'; p.estimates.forEach(e => { const v = e.versions[e.versions.length - 1]; if (v.state === '失注') v.state = '提出済'; }); }
export function deleteLead(s: AppState, pid: string) { const p = projById(s, pid); if (p) s.projects.splice(s.projects.indexOf(p), 1); }
export function photoOnly(s: AppState, pid: string) { projById(s, pid)!.memos++; }
export function photoApply(s: AppState, pid: string, fields: Record<string, string>, dueChecked: boolean) {
  const p = projById(s, pid)!; const sum: Summary = { ...(p.summary || {}) };
  (Object.keys(fields) as (keyof Summary)[]).forEach(k => { if (k !== 'ocr') (sum as Record<string, string | boolean | undefined>)[k] = fields[k]; });
  sum.ocr = true; p.summary = sum; if (dueChecked) p.estDue = '2026-10-16'; p.memos++; p.ocrDone = true;
}

/* =========================================================
   見積（S-03 / S-13）
   ========================================================= */
export function nextEstNo(s: AppState) { let m = 0; s.projects.forEach(p => p.estimates.forEach(e => { const n = Number(e.no.slice(-3)); if (n > m) m = n; })); return 'M-2026-' + String(m + 1).padStart(3, '0'); }
export type EstRef = { pid: string; ei: number; v: number };
export function createEst(s: AppState, pid: string): EstRef {
  const p = projById(s, pid)!;
  p.estimates.push({ no: nextEstNo(s), rate: custOf(s, p).rate, versions: [{ v: 1, date: TODAY, state: '作成中', lines: [], groups: [s.koshu[0].name] }] });
  p.status = '見積中'; if (!p.foreman) p.foreman = 'E1';
  return { pid: p.id, ei: p.estimates.length - 1, v: 1 };
}
export function resolveEst(s: AppState, ref: Partial<EstRef>) {
  let p = projById(s, ref.pid);
  let ei = ref.ei ?? 0;
  if (!p || !p.estimates[ei]) { p = projById(s, 'Y-2026-029') || s.projects.find(x => x.estimates.length); if (!p) return null; ei = 0; }
  const e = p.estimates[ei];
  let v = e.versions.find(x => x.v === ref.v); if (!v) v = e.versions[e.versions.length - 1];
  return { p, e, ei, v, c: { ...custOf(s, p), rate: e.rate } };
}
export function setLine(s: AppState, v: EstVersion, i: number, f: 'qty' | 'cost' | 'rate', n: number) { const l = v.lines[i]; if (!l) return; if (f === 'qty') l.qty = n; if (f === 'cost') l.cost = n; if (f === 'rate') l.rate = n; }
export function deleteLine(s: AppState, v: EstVersion, i: number): EstLine | undefined { const l = v.lines[i]; v.lines.splice(i, 1); return l; }
export function addGroup(s: AppState, v: EstVersion, g: string) { v.groups = v.groups || []; if (!v.groups.includes(g)) v.groups.push(g); }
export function addItems(s: AppState, v: EstVersion, group: string, picks: Record<string, number>): number {
  let idx = -1; v.lines.forEach((x, i) => { if (x.group === group) idx = i; }); if (idx < 0) idx = v.lines.length - 1;
  const add = Object.entries(picks).map(([code, qty]) => { const p = prod(s, code)!; const l: EstLine = { type: 'item', group, code, qty, rate: null }; if (p.cat === '法定福利費') { l.rate = 1.0; l.cost = 0; } return l; });
  v.lines.splice(idx + 1, 0, ...add); return idx + 1;
}
export function newVersion(s: AppState, pid: string, ei: number, fromV: number): number {
  const e = projById(s, pid)!.estimates[ei]; const v = e.versions.find(x => x.v === fromV)!; const nv = Math.max(...e.versions.map(x => x.v)) + 1;
  e.versions.forEach(x => { if (x.state === '作成中') x.state = '提出済'; });
  e.versions.push({ v: nv, date: TODAY, state: '作成中', lines: clone(v.lines), groups: clone(v.groups || []) });
  return nv;
}
export function submitEst(s: AppState, pid: string, v: EstVersion, to: { name: string } | null, exp: string) {
  const p = projById(s, pid)!; v.state = '提出済'; v.sent = { at: TODAY, method: to ? 'mail' : 'manual', to: to ? to.name : '' }; p.expire = exp;
}
export function bulkDelete(s: AppState, v: EstVersion, idx: Set<number>) { v.lines = v.lines.filter((_, i) => !idx.has(i)); }
export function rateTargets(s: AppState, v: EstVersion, target: 'sel' | 'grp' | 'all', group: string, sel: Set<number>): number[] {
  const g = group || groupsOf(v)[0]; const out: number[] = [];
  v.lines.forEach((l, i) => { if (l.type !== 'item') return; const p = prod(s, l.code); if (p?.cat === '法定福利費') return;
    if (target === 'all' || (target === 'grp' && l.group === g) || (target === 'sel' && sel.has(i))) out.push(i); });
  return out;
}
export function applyRate(s: AppState, pid: string, ei: number, v: EstVersion, idx: number[], mode: 'set' | 'reset', rate: number, alsoDefault: boolean, target: string) {
  const e = projById(s, pid)!.estimates[ei];
  if (alsoDefault && mode === 'set' && target === 'all') { e.rate = rate; idx.forEach(i => v.lines[i].rate = null); }
  else idx.forEach(i => { v.lines[i].rate = mode === 'reset' ? null : rate; });
}
export function moveLine(s: AppState, v: EstVersion, from: number, to: number, toGroup: string, after: boolean): number {
  const l = v.lines[from]; if (!l) return -1;
  v.lines.splice(from, 1); const t = to < 0 ? -1 : (to > from ? to - 1 : to);
  if (toGroup) l.group = toGroup;
  if (t < 0) { let last = -1; v.lines.forEach((x, i) => { if (x.group === toGroup) last = i; }); const at = last < 0 ? v.lines.length : last + 1; v.lines.splice(at, 0, l); }
  else v.lines.splice(after ? t + 1 : t, 0, l);
  return v.lines.indexOf(l);
}
export function moveSection(s: AppState, v: EstVersion, g: string, target: string, after: boolean) {
  const order = groupsOf(v).filter(x => x !== g); const k = order.indexOf(target); if (k < 0) return; order.splice(after ? k + 1 : k, 0, g);
  v.lines = order.flatMap(x => v.lines.filter(l => l.group === x));
  // 空の工種も順番を保つため groups を順番どおりに持ち直す
  v.groups = order.filter(x => !v.lines.some(l => l.group === x));
}

/* =========================================================
   受注（S-04）
   ========================================================= */
export const nextNo = (s: AppState) => '2026-0' + s.nextSeq;
export type CustAddForm = { name: string; short: string; person: string; tel: string; rate: string; email?: string };
export function addCustomerQuick(s: AppState, f: CustAddForm): Customer {
  const id = 'C' + (s.customers.length + 1);
  const c: Customer = { id, name: f.name, short: f.short || f.name, zip: '', addr: '', note: '', contacts: f.person ? [{ id: id + 'a', name: f.person, dept: '', email: f.email || '', tel: f.tel || '' }] : [], tel: f.tel || '－', rate: Number(f.rate) || DEFAULT_RATE };
  s.customers.push(c); return c;
}
export type OrderResult = { no: string; projectId: string; draft: boolean; branch: boolean };
export function confirmOrder(s: AppState, pid: string, checked: Record<number, number>, custId: string, mode: 'new' | 'branch', target: string | null): OrderResult | null {
  const p = projById(s, pid)!;
  const sel = orderables(p).filter(x => checked[x.ei] === x.v.v); if (!sel.length || !custId) return null;
  p.cust = custId; { const cc = cust(s, custId)!; const hit = (cc.contacts || []).find(k => p.contact && p.contact.name && norm(p.contact.name).includes(norm(k.name.split(' ')[0]))); p.contactId = (hit || (cc.contacts || [])[0] || {}).id || null; }
  sel.forEach(x => x.v.state = '受注');
  if (mode === 'new') {
    const no = nextNo(s); s.nextSeq++;
    p.no = no; p.status = '受注';
    p.contract = sel.map(x => ({ no, label: '当初（' + x.e.no + ' 第' + x.v.v + '版）', amount: estTotals(s, x.v.lines, x.e.rate).sub }));
    p.budget = []; sel.forEach(x => budgetRows(s, x.v.lines, x.e.rate).forEach(r => { let row = p.budget!.find(b => b.div === r.div && b.group === r.group); if (!row) { row = { div: r.div, group: r.group, init: 0, change: 0, est: 0 }; p.budget!.push(row); } row.init += r.init; row.est = (row.est || 0) + r.init; }));
    s.budState[no] = { state: '下書き' }; s.bl[no] = []; syncBudget(s, p);
    p.members = p.foreman ? [p.foreman] : [];
    if (!p.period) p.period = [TODAY, TODAY];
    s.schedules[no] = [];
    return { no, projectId: p.id, draft: true, branch: false };
  }
  const tp = projByNo(s, target)!;
  tp.branches = tp.branches || []; const bno = tp.no + '-' + String(tp.branches.length + 1).padStart(2, '0'); tp.branches.push(bno);
  sel.forEach(x => { tp.contract!.push({ no: bno, label: '追加（' + x.e.no + ' 第' + x.v.v + '版）', amount: estTotals(s, x.v.lines, x.e.rate).sub });
    budgetRows(s, x.v.lines, x.e.rate).forEach(r => { let row = tp.budget!.find(b => b.div === r.div && b.group === r.group); if (!row) { row = { div: r.div, group: r.group, init: 0, change: 0, est: 0 }; tp.budget!.push(row); } row.est = (row.est || 0) + r.init;
      if (!budDraft(s, tp)) (s.bl[tp.no!] = s.bl[tp.no!] || []).push({ kind: '変更', date: TODAY, div: r.div, group: r.group, amount: r.init, cat: '契約変更', reason: '追加工事 ' + bno + '（' + x.e.no + ' 第' + x.v.v + '版）を受注', who: '自動（受注時）', auto: true }); });
    syncBudget(s, tp); });
  p.estimates.forEach(e => { e.branchOf = tp.no!; e.branchNo = bno; tp.estimates.push(e); });
  s.projects.splice(s.projects.indexOf(p), 1);
  return { no: bno, projectId: tp.id, draft: budDraft(s, tp), branch: true };
}

/* =========================================================
   案件詳細（S-05）
   ========================================================= */
export function resolveProject(s: AppState, id: string | null | undefined, role: Role, me: string | null = null): Project | undefined {
  let p = projById(s, id);
  if (!p || !p.no) p = s.projects.filter(x => role !== '職長' || x.foreman === me).find(x => x.no && x.status === '施工中') || s.projects.find(x => x.no);
  return p;
}
export function caseBack(s: AppState, pid: string): string {
  const p = projById(s, pid)!; const no = p.no!;
  p.estimates.forEach(e => e.versions.forEach(v => { if (v.state === '受注') v.state = '提出済'; })); p.no = null; p.status = '見積中'; p.contract = []; p.budget = []; delete s.schedules[no];
  return no;
}
export function caseStop(s: AppState, pid: string, reason: string) { const p = projById(s, pid)!; p.stopReason = reason; p.status = '中止'; p.stopDate = TODAY; }
export function caseDelete(s: AppState, pid: string) { const p = projById(s, pid); if (p) s.projects.splice(s.projects.indexOf(p), 1); }
export type CaseForm = { title: string; cust: string; contactId: string; start: string; end: string; site: string; foreman: string; staff: string; status: string };
export function saveCase(s: AppState, pid: string, f: CaseForm) {
  const p = projById(s, pid)!;
  p.title = f.title || p.title; p.cust = f.cust; p.contactId = f.contactId || null; p.period = [f.start || TODAY, f.end || TODAY]; p.site = f.site; p.foreman = f.foreman; p.staff = f.staff;
  if (!p.members.includes(p.foreman)) p.members.unshift(p.foreman); p.status = f.status as Project['status'];
}
export function addMember(s: AppState, pid: string, wid: string) { const p = projById(s, pid)!; if (!p.members.includes(wid)) p.members.push(wid); }
export function removeMember(s: AppState, pid: string, wid: string) { const p = projById(s, pid)!; p.members = p.members.filter(x => x !== wid); }
export function addSchedule(s: AppState, no: string, mdLabel: string): number { const vs = s.schedules[no] = s.schedules[no] || []; vs.push({ ver: vs.length + 1, date: TODAY, name: '工程表（' + mdLabel + '版）.png' }); return vs.length; }

/* 実行予算：調整（確定前）・変更（確定後）の明細 */
export type BudgetLineForm = { kind: BudgetLineKind; date: string; div: Div; group: string; amount: number; cat: string; reason: string; who: string };
export function addBudgetLine(s: AppState, pid: string, f: BudgetLineForm): BudgetLine {
  const p = projById(s, pid)!; const l: BudgetLine = { kind: f.kind, date: f.date || TODAY, div: f.div, group: f.group, amount: f.amount, cat: f.cat, reason: f.reason.trim(), who: f.who };
  (s.bl[p.no!] = s.bl[p.no!] || []).push(l); syncBudget(s, p); return l;
}
export function deleteBudgetLine(s: AppState, pid: string, i: number): BudgetLine | undefined { const p = projById(s, pid)!; const l = (s.bl[p.no!] || []).splice(i, 1)[0]; syncBudget(s, p); return l; }
export function fixBudget(s: AppState, pid: string, by: string) { const p = projById(s, pid)!; syncBudget(s, p); s.budState[p.no!] = { state: '確定', at: TODAY, by }; syncBudget(s, p); }

/* 原価の明細 */
export type CostForm = { date: string; cat: Div; group: string; ven: string; memo: string; amount: string; doc: string };
export function saveCost(s: AppState, no: string, f: CostForm, idx: number): Cost {
  const a = Number(String(f.amount).replace(/[,，]/g, ''));
  const e: Cost = { date: f.date || TODAY, group: f.group || '', cat: f.cat, memo: f.memo || '', amount: a, vendor: '' }; if (f.doc) e.doc = f.doc;
  if (f.ven.startsWith('P:')) { e.vid = f.ven.slice(2); e.vendor = partner(s, e.vid).name; } else if (f.ven.startsWith('W:')) { e.wid = f.ven.slice(2); e.vendor = worker(s, e.wid).name; } else { e.sid = f.ven.slice(2); e.vendor = vendor(s, e.sid).name; }
  const list = s.costs[no] = s.costs[no] || []; if (idx >= 0) list[idx] = e; else list.push(e);
  return e;
}
export function deleteCost(s: AppState, no: string, i: number) { (s.costs[no] || []).splice(i, 1); }

/* =========================================================
   打刻・承認（S-06 / M-02 / M-05 / T-01）
   ========================================================= */
export function approve(s: AppState, id: string) { const r = s.punches.find(x => x.id === id)!; r.status = isExt(s, r.worker) ? '確認' : '承認'; return r; }
export function reject(s: AppState, id: string) { const r = s.punches.find(x => x.id === id)!; r.status = '差戻し'; return r; }
export function approveAll(s: AppState, date: string, site: string, role: Role, me: string | null = null): number {
  const sites = mySites(s, role, me).map(p => p.no); let k = 0;
  s.punches.forEach(r => { if (r.date === date && r.status === '入力済' && !recCalc(r).open && r.segs.some(sg => site === 'all' ? (role !== '職長' || sites.includes(sg.site)) : sg.site === site)) { r.status = isExt(s, r.worker) ? '確認' : '承認'; k++; } });
  return k;
}
export type ProxyForm = { worker: string; site: string; start: string; end: string; brk: number; reason: string };
export function proxySave(s: AppState, f: ProxyForm, by: string = 'E1') {
  const r = s.punches.find(x => x.worker === f.worker && x.date === TODAY);
  const brk: Punch['breaks'] = []; if (f.brk > 0) { const bs = Math.max(toMin(f.start), Math.min(toMin('12:00'), toMin(f.end) - f.brk)); brk.push({ start: fromMin(bs), end: fromMin(bs + f.brk) }); }
  const rec: Punch = { id: '', date: TODAY, worker: f.worker, segs: [{ site: f.site, start: f.start, end: f.end }], breaks: brk, status: '入力済', proxy: { by, reason: f.reason } };
  if (r) Object.assign(r, { ...rec, id: r.id }); else { rec.id = 'R' + (s.punches.length + 2000); s.punches.push(rec); }
}
export function makeBreaks(k: string, start: string, end: string, mins?: number): Punch['breaks'] {
  if (k === 'custom') { const m = Math.max(0, Math.round((mins || 0) / 5) * 5); const out: Punch['breaks'] = []; const lunch = Math.min(60, m); if (lunch) out.push({ start: '12:00', end: fromMin(720 + lunch) }); if (m > 60) out.push({ start: '15:00', end: fromMin(900 + m - 60) }); return out; }
  const b = BREAKS.find(x => x.k === k) || BREAKS[0]; return (b.list || []).filter(([bs, be]) => toMin(bs) >= toMin(start) && toMin(be) <= toMin(end)).map(([bs, be]) => ({ start: bs, end: be }));
}
export function punchIn(s: AppState, wid: string, site: string, t: string, src?: string, proxy?: Proxy) {
  let r = todayRec(s, wid);
  if (!r) { r = { id: 'R' + (s.punches.length + 1000 + Math.floor(Math.random() * 900)), date: TODAY, worker: wid, segs: [], breaks: [], status: '入力済', proxy: null }; s.punches.push(r); }
  r.segs.push({ site, start: t, end: null }); if (src) r.src = src; if (proxy) r.proxy = proxy;
}
export function punchMove(s: AppState, wid: string, site: string, t: string, src?: string): boolean {
  const ps = punchState(s, wid); if (ps.state !== '作業中' || !ps.seg || !ps.r) return false; ps.seg.end = t; ps.r.segs.push({ site, start: t, end: null }); if (src) ps.r.src = src; return true;
}
export function punchOut(s: AppState, wid: string, t: string, brk: string, mins?: number, src?: string): boolean {
  const ps = punchState(s, wid); if (ps.state !== '作業中' || !ps.seg || !ps.r) return false; ps.seg.end = t;
  ps.r.breaks = makeBreaks(brk, fromMin(ps.r.segs[0] ? toMin(ps.r.segs[0].start) : 480), t, mins); ps.r.brk = brk; ps.r.status = '入力済'; if (src) ps.r.src = src; return true;
}

/* 外注支払 */
export function setPayAdj(s: AppState, month: string, pid: string, field: 'contract' | 'deduct', n: number) {
  const cur = s.payAdj[month + pid] || { contract: 0, deduct: pid === 'K2' ? 6000 : 0 }; cur[field] = n; s.payAdj[month + pid] = cur;
}

/* =========================================================
   マスタ（S-10）
   ========================================================= */
type MasterItem = Product | Koshu | Customer | Worker | Partner | Vendor | WorkRule;
export type MasterDef = { list: (s: AppState) => MasterItem[]; key: string; name: (x: MasterItem) => string; used: (s: AppState, x: MasterItem) => boolean; usedMsg: string };
const anyX = (x: MasterItem) => x as unknown as Record<string, string>;
export const MDEF: Record<Exclude<MasterName, '会社設定'>, MasterDef> = {
  '品目': { list: s => s.products, key: 'code', name: x => anyX(x).name,
    used: (s, x) => s.projects.some(p => p.estimates.some(e => e.versions.some(v => v.lines.some(l => l.code === anyX(x).code)))), usedMsg: '見積で使われています' },
  '工種': { list: s => s.koshu, key: 'code', name: x => anyX(x).name,
    used: (s, x) => s.projects.some(p => p.estimates.some(e => e.versions.some(v => v.lines.some(l => l.group === anyX(x).name))) || (p.budget || []).some(b => b.group === anyX(x).name)) || Object.values(s.costs).some(l => l.some(c => c.group === anyX(x).name)), usedMsg: '見積・予算・実績で使われています' },
  '得意先': { list: s => s.customers, key: 'id', name: x => anyX(x).name, used: (s, x) => s.projects.some(p => p.cust === anyX(x).id), usedMsg: '与件・案件で使われています' },
  '作業員': { list: s => s.workers, key: 'id', name: x => anyX(x).name, used: (s, x) => s.punches.some(r => r.worker === anyX(x).id) || s.projects.some(p => p.members.includes(anyX(x).id)), usedMsg: '打刻・配置で使われています' },
  '協力会社': { list: s => s.partners, key: 'id', name: x => anyX(x).name, used: (s, x) => s.workers.some(w => w.org === anyX(x).id) || Object.values(s.costs).some(l => l.some(c => c.vid === anyX(x).id)), usedMsg: '作業員・原価実績で使われています' },
  '取引先': { list: s => s.vendors, key: 'id', name: x => anyX(x).name, used: (s, x) => Object.values(s.costs).some(l => l.some(c => c.sid === anyX(x).id)), usedMsg: '原価の明細で使われています' },
  '就業ルール': { list: s => s.workRules, key: 'id', name: x => anyX(x).name, used: (s, x) => s.workers.some(w => w.rule === anyX(x).id || (w.ruleHist || []).some(h => h.rule === anyX(x).id)), usedMsg: '社員に設定されています（過去の分も含む）' },
};
export type MasterTab = keyof typeof MDEF;
export function findMaster(s: AppState, t: MasterTab, v: string): MasterItem | undefined { const d = MDEF[t]; return d.list(s).find(x => String(anyX(x)[d.key]) === String(v)); }
/* 編集フォームの値（文字列中心） */
export type MasterDraft = Record<string, unknown> & { contacts?: Contact[]; flags?: Flags };
export function masterDraft(s: AppState, t: MasterTab, id: string | null): MasterDraft {
  if (!id) {
    const NEWD: Record<MasterTab, () => MasterDraft> = {
      '得意先': () => ({ contacts: [{ name: '', dept: '', email: '', tel: '' }], rate: DEFAULT_RATE }),
      '作業員': () => ({ kind: '社員', org: '建設事業部', rateFrom: TODAY, wageFrom: TODAY, excl: 0, means: 'スマホ', emp: '正社員', pay: '日給月給', rule: 'R1', approver: '川口（管理者）', hired: TODAY, flags: { punch: true, att: true, cost: true, ot: true }, lvBase: '', lvGrant: '', lvUsed: '' }),
      '協力会社': () => ({ type: '法人', close: '月末', pay: '翌月末', contract: '常用・請負', ot: '人工に足す（0.25単位）', fee: '先方負担', safety: 0, wht: '不要', checker: '職長', rateFrom: TODAY }),
      '取引先': () => ({ cat: '材料', close: '月末', pay: '翌月末' }),
      '就業ルール': () => ({ from: TODAY, days: 255, start: '08:00', end: '17:00', hours: 8, brk: '昼60分', system: '通常', cal: '現場カレンダー', ot: '1日8時間超・週40時間超', late: '判定する' }),
      '品目': () => ({ cat: '材料' }), '工種': () => ({}),
    };
    return NEWD[t]();
  }
  const x = findMaster(s, t, id)!; const d: MasterDraft = clone(x) as MasterDraft;
  if (t === '作業員' && (x as Worker).kind === '社員') { const w = x as Worker; const r = (w.rates || [])[(w.rates || []).length - 1]; d.rateV = r ? r.v : ''; d.rateFrom = r ? r.from : TODAY; const g = (w.wage || [])[(w.wage || []).length - 1]; d.wageV = g ? g.v : ''; d.wageFrom = g ? g.from : TODAY; d.excl = w.excl || 0; d.lvBase = (w.lv || {}).base || ''; d.lvGrant = (w.lv || {}).grant ?? ''; d.lvUsed = (w.lv || {}).used ?? ''; }
  if (t === '就業ルール') { const r = x as WorkRule; const v = r.vers[r.vers.length - 1]; Object.assign(d, v, { from: nextMonthFirst() }); delete d.note; }
  if (t === '協力会社') { const pt = x as Partner; const h = pt.rateHist || []; d.rateFrom = h.length ? h[h.length - 1].from : TODAY; d.rate = pt.rate ?? ''; d.half = pt.half ?? ''; }
  if (t === '得意先' && !(d.contacts || []).length) d.contacts = [{ name: '', dept: '', email: '', tel: '' }];
  return d;
}
/** 翌月1日（版・付け替えの適用開始日の既定） */
export function nextMonthFirst(): string { const [y, m] = TODAY.split('-').map(Number); const d = new Date(y, m, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'; }
/** 社員の就業ルールを適用開始日つきで付け替える */
export function setRule(w: Worker, rule: string, from: string) {
  if (ruleOfW(w, from) === rule && !(w.ruleHist || []).some(x => x.from > from)) return;
  const h = (w.ruleHist = w.ruleHist || []); const same = h.find(x => x.from === from); if (same) same.rule = rule; else h.push({ from, rule });
  h.sort((a, b) => a.from.localeCompare(b.from)); w.rule = ruleOfW(w, TODAY);
}
export function setRules(s: AppState, ids: string[], rule: string, from: string) { ids.forEach(id => { const w = s.workers.find(x => x.id === id); if (w) setRule(w, rule, from || TODAY); }); }
function pushHist(arr: { from: string; v: number }[], v: number, from: string) { const last = arr[arr.length - 1]; if (last && last.from === from) last.v = v; else if (!last || last.v !== v) arr.push({ from, v }); }
const str = (v: unknown) => (v === undefined || v === null) ? '' : String(v);
export function saveMaster(s: AppState, t: MasterTab, id: string | null, d: MasterDraft): string | null {
  if (!str(d.name).trim()) return '名称を入れてください';
  if ((t === '協力会社' || t === '取引先') && str(d.invNo) && !/^T\d{13}$/.test(str(d.invNo).trim())) return 'インボイス登録番号は T＋13桁の数字です';
  const arr = MDEF[t].list(s) as Record<string, unknown>[];
  let x = (id ? findMaster(s, t, id) : null) as Record<string, unknown> | null;
  if (!x) { x = {}; if (t === '品目') x.code = 'P-' + String(900 + arr.length).padStart(4, '0'); if (t === '工種') x.code = 'K' + String(arr.length + 1).padStart(2, '0');
    if (t === '得意先') x.id = 'C' + (arr.length + 1); if (t === '作業員') x.id = 'W' + (arr.length + 1); if (t === '協力会社') x.id = 'K' + (arr.length + 11); if (t === '取引先') x.id = 'V' + (arr.length + 1); if (t === '就業ルール') x.id = 'R' + (arr.length + 1); arr.push(x); }
  if (t === '品目') Object.assign(x, { name: d.name, alias: d.alias || '', spec: d.spec || '', unit: d.unit || '式', cost: Number(d.cost) || 0, cat: d.cat, kind: d.kind || '' });
  if (t === '工種') Object.assign(x, { name: d.name, desc: d.desc || '' });
  if (t === '得意先') Object.assign(x, { name: d.name, short: d.short || d.name, zip: d.zip || '', addr: d.addr || '', tel: d.tel || '', rate: Number(d.rate) || DEFAULT_RATE, note: d.note || '', contacts: (d.contacts || []).filter(k => k.name).map((k, i) => ({ ...k, id: k.id || x!.id + '-' + i })) });
  if (t === '作業員') { Object.assign(x, { name: d.name, kana: d.kana || '', kind: d.kind, org: d.org, job: d.job || '', means: d.means || 'スマホ' });
    if (d.kind === '社員') { Object.assign(x, { empNo: d.empNo || '', hired: d.hired || '', left: d.left || '', emp: d.emp, pay: d.pay || '日給月給', approver: d.approver, flags: { ...(d.flags as Flags) }, lv: { base: d.lvBase || '', grant: Number(d.lvGrant) || 0, used: Number(d.lvUsed) || 0 } });
      const w = x as unknown as Worker; if (d.rule && d.rule !== w.rule) setRule(w, str(d.rule), w.ruleHist && w.ruleHist.length ? TODAY : (str(d.hired) || TODAY));
      w.excl = Number(d.excl) || 0; w.wage = w.wage || []; if (d.wageV !== '' && d.wageV !== undefined) pushHist(w.wage, Number(d.wageV) || 0, str(d.wageFrom) || TODAY);
      x.rates = x.rates || []; if (d.rateV !== '' && d.rateV !== undefined) pushHist(x.rates as { from: string; v: number }[], Number(d.rateV) || 0, str(d.rateFrom) || TODAY); }
    else { delete x.rates; x.flags = { punch: true, att: false, cost: true, ot: false }; ['emp', 'pay', 'rule', 'approver', 'lv', 'empNo', 'hired'].forEach(k => delete x![k]); } }
  if (t === '協力会社') { const rate = d.rate === '' || d.rate === undefined || d.rate === null ? null : Number(d.rate);
    Object.assign(x, { name: d.name, type: d.type, person: d.person || '', tel: d.tel || '', addr: d.addr || '', invNo: str(d.invNo).trim(), license: d.license || '', contract: d.contract, rate, half: d.half === '' ? null : Number(d.half) || null, ot: d.ot, close: d.close || '月末', pay: d.pay || '翌月末', fee: d.fee, safety: Number(d.safety) || 0, other: d.other || '', wht: d.wht, checker: d.checker });
    x.invoice = !!x.invNo; x.rateHist = x.rateHist || []; if (rate) pushHist(x.rateHist as { from: string; v: number }[], rate, str(d.rateFrom) || TODAY); }
  if (t === '取引先') Object.assign(x, { name: d.name, cat: d.cat, invNo: str(d.invNo).trim(), tel: d.tel || '', close: d.close, pay: d.pay, note: d.note || '' });
  if (t === '就業ルール') { const v: RuleVer = { from: str(d.from) || TODAY, days: Number(d.days) || 255, start: str(d.start), end: str(d.end), hours: Number(d.hours) || 8, brk: str(d.brk), system: str(d.system), cal: str(d.cal), ot: str(d.ot), late: str(d.late) };
    const r = x as unknown as WorkRule; r.name = str(d.name); r.vers = r.vers || []; const same = r.vers.find(z => z.from === v.from); if (same) Object.assign(same, v); else r.vers.push(v); r.vers.sort((a, b) => a.from.localeCompare(b.from));
    const cur = ruleVer(r, TODAY); Object.assign(r, { days: cur.days, start: cur.start, end: cur.end, hours: cur.hours, brk: cur.brk, system: cur.system, cal: cur.cal, ot: cur.ot, late: cur.late }); delete (r as unknown as Record<string, unknown>).from; }
  return null;
}
export function toggleMasterStop(s: AppState, t: MasterTab, id: string): { name: string; stopped: boolean } { const x = findMaster(s, t, id) as MasterItem & { stopped?: boolean }; x.stopped = !x.stopped; return { name: MDEF[t].name(x), stopped: !!x.stopped }; }
export function deleteMaster(s: AppState, t: MasterTab, id: string) { const x = findMaster(s, t, id); if (!x) return; const a = MDEF[t].list(s) as MasterItem[]; a.splice(a.indexOf(x), 1); }
export function saveCompany(s: AppState, patch: Partial<Company>) { Object.assign(s.company, patch); }
/* 月次の差異（経理向け）：給与ソフトの実額を手入力 */
export function setPayroll(s: AppState, month: string, k: 'gross' | 'burden', v: string) { const pr = s.payroll[month] = s.payroll[month] || { gross: '', burden: '' }; pr[k] = v.replace(/[,，]/g, ''); }
export function addHoliday(s: AppState, h: Holiday) { s.holidays.push(h); }
export function deleteHoliday(s: AppState, i: number): Holiday { return s.holidays.splice(i, 1)[0]; }

/* 見積の版をまとめて保存（画面で編集した下書きを書き戻す） */
export function saveVersion(s: AppState, pid: string, ei: number, draft: EstVersion, rate: number) {
  const e = projById(s, pid)?.estimates[ei]; if (!e) return;
  const i = e.versions.findIndex(x => x.v === draft.v); if (i < 0) return;
  e.versions[i] = clone(draft); e.rate = rate;
}
/* 本人からの修正依頼（M-03）。職長は日次チェックで見て差戻す */
export function requestFix(s: AppState, id: string, reason: string) { const r = s.punches.find(x => x.id === id); if (r) r.fix = { reason, at: TODAY }; }

/* ---- ユーザー（S-11） ---- */
export type UserForm = { name: string; loginId: string; role: Role; workerId: string };
export function saveUser(s: AppState, id: string | null, f: UserForm): string | null {
  if (!f.name.trim()) return '氏名を入れてください';
  if (!f.loginId.trim()) return 'ログインIDを入れてください';
  if (s.users.some(u => u.loginId === f.loginId.trim() && u.id !== id)) return 'このログインIDは使われています';
  if ((f.role === '社員職人' || f.role === '協力会社' || f.role === '職長') && !f.workerId) return 'この役割は作業員マスタの人を選んでください';
  const u: User = { id: id || 'U' + (Math.max(0, ...s.users.map(x => Number(x.id.slice(1)) || 0)) + 1), name: f.name.trim(), loginId: f.loginId.trim(), role: f.role, workerId: f.workerId || null };
  const i = s.users.findIndex(x => x.id === id); if (i >= 0) s.users[i] = { ...s.users[i], ...u }; else s.users.push(u);
  return null;
}
export function toggleUserStop(s: AppState, id: string) { const u = s.users.find(x => x.id === id); if (u) u.stopped = !u.stopped; }
export function deleteUser(s: AppState, id: string) { const i = s.users.findIndex(x => x.id === id); if (i >= 0) s.users.splice(i, 1); }

export type { BudgetRow, Punch, Project, EstVersion };
export { SITE_INTERNAL, DIVS };
