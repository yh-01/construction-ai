'use client';
/* 一覧の検索・フィルター・並べ替え（共通部品）。HTMLモック v0.1.4 の仕様：すべての条件を常に表示 */
import React from 'react';
import { useStore } from '@/lib/store-context';
import { IconSearch } from './ui';
import { DUE_OPTS, duePass } from '@/lib/calc';
import { md, num, norm } from '@/lib/format';

export type Opt = string | [string, string];
export type FilterDef = { k: string; label: string; type: 'text' | 'select' | 'due' | 'range' | 'drange' | 'month'; opts?: Opt[]; ph?: string; unit?: string };
export type FilterCfg = { kw?: string; quick?: FilterDef[]; more?: FilterDef[]; right?: React.ReactNode };

export function useFilter(key: string) {
  const { ui, setF, clearF } = useStore();
  const fv = (k: string) => (ui.f[key] || {})[k] ?? '';
  const fText = (k: string, ...vals: unknown[]) => { const q = fv(k); return !q || vals.some(v => norm(v ?? '').includes(norm(q))); };
  const fSel = (k: string, val: string) => { const q = fv(k); return !q || q === val; };
  const fRange = (k: string, val: number | null | undefined) => { const a = fv(k + '_min'), b = fv(k + '_max'); if (a === '' && b === '') return true; if (val === null || val === undefined) return false; return (a === '' || val >= Number(a)) && (b === '' || val <= Number(b)); };
  const fDue = (k: string, val: string | null | undefined) => duePass(fv(k), val);
  const fOverlap = (k: string, s: string | null, e: string | null) => { const a = fv(k + '_from'), b = fv(k + '_to'); if (!a && !b) return true; if (!s || !e) return false; return (!a || e >= a) && (!b || s <= b); };
  return { fv, fText, fSel, fRange, fDue, fOverlap, set: (k: string, v: string) => setF(key, k, v), clear: () => clearF(key) };
}

const optLabel = (opts: Opt[] | undefined, v: string) => { const o = (opts || []).find(o => (Array.isArray(o) ? o[0] : o) === v); return o ? (Array.isArray(o) ? o[1] : o) : v; };

function FilterInput({ keyName, d }: { keyName: string; d: FilterDef }) {
  const { fv, set } = useFilter(keyName);
  const id = `sf-${keyName}-${d.k}`;
  const lab = <span className="flab">{d.label}</span>;
  if (d.type === 'text') return <label className="fld">{lab}<input id={id} value={fv(d.k)} onChange={e => set(d.k, e.target.value)} placeholder={d.ph || ''} /></label>;
  if (d.type === 'select' || d.type === 'due') {
    const opts: Opt[] = d.type === 'due' ? DUE_OPTS : (d.opts || []);
    return <label className="fld">{lab}<select id={id} value={fv(d.k)} onChange={e => set(d.k, e.target.value)}><option value="">すべて</option>{opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option>; })}</select></label>;
  }
  if (d.type === 'range') return <div className="fld">{lab}<div className="rng"><input id={id + '-min'} type="number" inputMode="numeric" value={fv(d.k + '_min')} onChange={e => set(d.k + '_min', e.target.value)} placeholder="下限" aria-label={`${d.label} 下限`} /><span>〜</span><input id={id + '-max'} type="number" inputMode="numeric" value={fv(d.k + '_max')} onChange={e => set(d.k + '_max', e.target.value)} placeholder="上限" aria-label={`${d.label} 上限`} /></div></div>;
  if (d.type === 'drange') return <div className="fld">{lab}<div className="rng"><input type="date" value={fv(d.k + '_from')} onChange={e => set(d.k + '_from', e.target.value)} aria-label={`${d.label} から`} /><span>〜</span><input type="date" value={fv(d.k + '_to')} onChange={e => set(d.k + '_to', e.target.value)} aria-label={`${d.label} まで`} /></div></div>;
  if (d.type === 'month') return <label className="fld">{lab}<input type="month" id={id} value={fv(d.k)} onChange={e => set(d.k, e.target.value)} /></label>;
  return null;
}

export function FilterBar({ keyName, cfg }: { keyName: string; cfg: FilterCfg }) {
  const { fv, set, clear } = useFilter(keyName);
  const { setF } = useStore();
  const defs = [...(cfg.quick || []), ...(cfg.more || [])];
  const chips: { k: string; label: string }[] = [];
  if (fv('kw')) chips.push({ k: 'kw', label: `「${fv('kw')}」` });
  defs.forEach(d => {
    if (d.type === 'drange') { const a = fv(d.k + '_from'), b = fv(d.k + '_to'); if (a || b) chips.push({ k: d.k + '_from,' + d.k + '_to', label: `${d.label}：${a ? md(a) : ''}〜${b ? md(b) : ''}` }); return; }
    if (d.type === 'range') { const a = fv(d.k + '_min'), b = fv(d.k + '_max'); if (a !== '' || b !== '') chips.push({ k: d.k + '_min,' + d.k + '_max', label: `${d.label}：${a !== '' ? num(a) : ''}〜${b !== '' ? num(b) : ''}${d.unit || ''}` }); }
    else { const v = fv(d.k); if (v !== '') chips.push({ k: d.k, label: `${d.label}：${d.type === 'due' ? optLabel(DUE_OPTS, v) : d.type === 'month' ? v.replace('-', '/') : optLabel(d.opts, v)}` }); }
  });
  return <div className="fbar">
    <div className="fgrid">
      {cfg.kw ? <label className="fld fkw"><span className="flab">キーワード</span><span className="kw"><IconSearch /><input id={`sf-${keyName}-kw`} value={fv('kw')} onChange={e => set('kw', e.target.value)} placeholder={cfg.kw} aria-label="キーワードで検索" /></span></label> : null}
      {defs.map(d => <FilterInput key={d.k} keyName={keyName} d={d} />)}
      {cfg.right ? <div className="fbar-right">{cfg.right}</div> : null}
    </div>
    {chips.length ? <div className="fchips"><span className="small muted">絞り込み中：</span>{chips.map(c => <span key={c.k} className="fchip">{c.label}<button onClick={() => c.k.split(',').forEach(k => setF(keyName, k, ''))} aria-label={`${c.label} を外す`}>×</button></span>)}<button className="lnk small" onClick={clear}>すべてクリア</button></div> : null}
  </div>;
}

/* ---- 並べ替え ---- */
export function useSort(key: string) {
  const { ui, setUi } = useStore();
  const s = ui.sort[key];
  const toggle = (k: string) => setUi(u => ({ sort: { ...u.sort, [key]: u.sort[key]?.k === k ? { k, dir: -u.sort[key].dir } : { k, dir: 1 } } }));
  function sortBy<T>(rows: T[], getters: Record<string, (r: T) => unknown>, def?: { k: string; dir: number }): T[] {
    const cur = s || def; if (!cur || !getters[cur.k]) return rows;
    const g = getters[cur.k];
    return rows.slice().sort((a, b) => { const x = g(a) as number | string | null | undefined, y = g(b) as number | string | null | undefined; if (x === y) return 0; if (x === null || x === undefined || x === '') return 1; if (y === null || y === undefined || y === '') return -1; return (x > y ? 1 : -1) * cur.dir; });
  }
  const Th = ({ k, label, cls }: { k: string; label: string; cls?: string }) => { const on = s?.k === k;
    return <th className={cls || ''}><button className={`sortbtn ${on ? 'on' : ''}`} onClick={() => toggle(k)} aria-label={`${label}で並べ替え`}>{label}<span aria-hidden="true">{on ? (s.dir > 0 ? '▲' : '▼') : '↕'}</span></button></th>; };
  return { sortBy, Th };
}
