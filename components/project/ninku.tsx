'use client';
/* S-05 人工タブ（検索つき）：月×作業員のグリッド */
import React, { useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { TableCount } from '@/components/ui';
import { FilterBar, useFilter } from '@/components/filter';
import { worker, partner, isExt, isFinal, recCalc } from '@/lib/calc';
import type { Project } from '@/lib/types';
import { md, wd, nk, uniq, monthDays } from '@/lib/format';

export function Ninku({ p }: { p: Project }) {
  const { s } = useStore();
  const K = 'nk-' + p.no; const F = useFilter(K);
  const mon = F.fv('mon');
  useEffect(() => { if (!mon) F.set('mon', '2026-10'); }, [mon]); // eslint-disable-line react-hooks/exhaustive-deps
  const ym = mon || '2026-10'; const days = monthDays(ym); const no = p.no!;
  const recsAll = s.punches.filter(r => r.date.startsWith(ym) && recCalc(r).bySite[no]);
  const recs = recsAll.filter(r => F.fSel('kind', isExt(s, r.worker) ? '外部' : '社員') && F.fText('kw', worker(s, r.worker).name, isExt(s, r.worker) ? partner(s, worker(s, r.worker).org).name : '') && (F.fv('st') !== 'final' || isFinal(r)));
  const ws = uniq(recs.map(r => r.worker)).sort((a, b) => (Number(isExt(s, a)) - Number(isExt(s, b))) || a.localeCompare(b));
  let tS = 0, tE = 0; const colTot = days.map(() => 0);
  const body = ws.map(id => {
    let tot = 0;
    const cells = days.map((d, di) => { const r = recs.find(x => x.worker === id && x.date === d); if (!r) return <td key={d}></td>; const n = recCalc(r).bySite[no]; tot += n; colTot[di] += n;
      return <td key={d} className={`${isExt(s, id) ? 'e' : 's'} ${isFinal(r) ? '' : 'p'}`} title={`${worker(s, id).name} ${md(d)} ${r.status}`}>{n}</td>; });
    if (isExt(s, id)) tE += tot; else tS += tot;
    return <tr key={id}><td className="nm">{worker(s, id).name} <span className={`tag ${isExt(s, id) ? 'ext' : 'staff'}`}>{isExt(s, id) ? '外部' : '社員'}</span></td>{cells}<td className="num"><b>{nk(tot)}</b></td></tr>;
  });
  return <div className="card"><FilterBar keyName={K} cfg={{ kw: '作業員名・協力会社名で検索', quick: [{ k: 'mon', label: '月', type: 'month' }, { k: 'kind', label: '区分', type: 'select', opts: ['社員', '外部'] }, { k: 'st', label: '状態', type: 'select', opts: [['final', '承認・確認済みのみ']] }] }} />
    <div className="card-head"><TableCount n={ws.length} total={uniq(recsAll.map(r => r.worker)).length} unit="人" /><span className="cs">この現場に按分した人工（日別×作業員）</span></div>
    <div className="tbl"><table className="ngrid"><thead><tr><th className="nm">作業員</th>{days.map(d => <th key={d} className={['土', '日'].includes(wd(d)) ? 'we' : ''}>{Number(d.slice(8))}<br />{wd(d)}</th>)}<th>計</th></tr></thead>
      <tbody>{body.length ? body : <tr><td className="nm muted" colSpan={days.length + 2}>条件に合う打刻はありません</td></tr>}</tbody>
      <tfoot><tr><td className="nm">日計</td>{colTot.map((n, i) => <td key={i} className="num">{n ? String(n) : ''}</td>)}<td className="num">{nk(tS + tE)}</td></tr></tfoot></table></div>
    <div className="card-body" style={{ borderTop: '1px solid var(--line-2)' }}><div className="row small">
      <span><span className="tag staff">社員</span> {nk(tS)} 人工</span><span><span className="tag ext">外部</span> {nk(tE)} 人工</span><span className="muted">点線の枠＝未承認・未確認（原価には未計上）</span></div>
      <p className="note">人工の換算は【仮：Q6】1日8時間＝1.0人工、複数現場は時間按分、0.25単位。</p></div></div>;
}
