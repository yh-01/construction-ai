'use client';
/* S-01 案件一覧 */
import React from 'react';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { PageHead, StatusBadge, TableCount, EmptyRow } from '@/components/ui';
import { FilterBar, useFilter, useSort, type FilterDef } from '@/components/filter';
import { ROLES, myProjects, custOf, projFin, worker, meterCls } from '@/lib/calc';
import { md, yen, pct, uniq } from '@/lib/format';

export default function ProjectsPage() {
  const { s, ui, setUi } = useStore();
  const { go } = useNav();
  const K = 's01';
  const F = useFilter(K); const { sortBy, Th } = useSort(K);
  const cv = ROLES[ui.role].cost !== 'hide';
  const base = myProjects(s, ui.role).filter(p => p.no);
  const list = base.filter(p => { const f = projFin(s, p); const st = F.fv('st');
    if (st === 'active' && !(p.status === '受注' || p.status === '施工中')) return false;
    if (st && st !== 'active' && p.status !== st) return false;
    return F.fText('kw', p.no, p.title, p.custName, custOf(s, p).name, p.site) && F.fSel('fm', p.foreman ? worker(s, p.foreman).name : '')
      && (!F.fv('cons') || (F.fv('cons') === '85' ? f.consume > 0.85 : f.consume > 1)) && F.fRange('amt', f.contract)
      && F.fOverlap('term', p.period ? p.period[0] : null, p.period ? p.period[1] : null) && F.fRange('gp', f.contract ? Math.round(f.planGP / f.contract * 1000) / 10 : null); });
  const rows = sortBy(list, { no: p => p.no, cust: p => custOf(s, p).short, title: p => p.title, start: p => p.period ? p.period[0] : null, amt: p => projFin(s, p).contract, act: p => projFin(s, p).actual, gp: p => { const f = projFin(s, p); return f.contract ? f.planGP / f.contract : null; }, cons: p => projFin(s, p).consume }, { k: 'no', dir: -1 });
  const quick: FilterDef[] = [{ k: 'st', label: '状態', type: 'select', opts: [['active', '完了・中止を除く'], '受注', '施工中', '完了', '中止'] }, { k: 'fm', label: '職長', type: 'select', opts: uniq(s.projects.filter(p => p.foreman).map(p => worker(s, p.foreman!).name)) }];
  if (cv) quick.push({ k: 'cons', label: '予算消化率', type: 'select', opts: [['85', '85%超（注意）'], ['100', '100%超（超過）']] });
  const more: FilterDef[] = [{ k: 'term', label: '工期（この期間にかかる工事）', type: 'drange' }, { k: 'amt', label: '受注額（税抜・円）', type: 'range' }];
  if (cv) more.push({ k: 'gp', label: '予定粗利率（%）', type: 'range', unit: '%' });
  return <>
    <PageHead id="S-01" title="案件一覧" sub={ui.role === '職長' ? '担当案件のみ' : ''} />
    <div className="card">
      <FilterBar keyName={K} cfg={{ kw: '工事番号・件名・得意先・現場で検索', quick, more }} />
      <div className="card-head"><TableCount n={list.length} total={base.length} unit="件" /></div>
      <div className="tbl"><table><thead><tr><Th k="no" label="工事番号" /><Th k="cust" label="得意先" /><Th k="title" label="件名" /><th>状態</th><Th k="start" label="工期" /><th>職長</th><Th k="amt" label="受注額（税抜）" cls="r" />{cv ? <><Th k="act" label="原価実績" cls="r" /><Th k="gp" label="予定粗利率" cls="r" /><Th k="cons" label="予算消化率" /></> : null}</tr></thead>
        <tbody>{rows.length ? rows.map(p => {
          const c = custOf(s, p), f = projFin(s, p);
          const cons = f.budget ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 130 }}><div className="meter" style={{ flex: 1 }}><i className={meterCls(f.consume)} style={{ width: `${Math.min(100, f.consume * 100)}%` }} /></div><span className="num small">{pct(f.consume, 0)}</span></div> : <span className="muted">－</span>;
          return <tr key={p.id} className="click" onClick={() => { setUi({ s05tab: '概要' }); go('S-05', { id: p.id }); }}>
            <td className="num">{p.no}{(p.branches || []).length ? <div className="small muted">枝番 {p.branches!.length}件</div> : null}</td><td className="nw">{c.short}</td><td><b style={{ color: 'var(--ink)' }}>{p.title}</b></td><td><StatusBadge s={p.status} /></td>
            <td className="nw small">{p.period ? md(p.period[0]) + '〜' + md(p.period[1]) : '－'}</td><td className="nw">{p.foreman ? worker(s, p.foreman).name : '－'}</td>
            <td className="r num">{yen(f.contract)}</td>
            {cv ? <><td className="r num">{yen(f.actual)}</td><td className="r num">{f.contract ? pct(f.planGP / f.contract) : '－'}</td><td>{cons}</td></> : null}</tr>;
        }) : <EmptyRow cols={10} onClear={F.clear} />}</tbody></table></div></div>
    <p className="note">予定粗利率＝（受注額−実行予算）÷受注額。予算消化率の色は 85%超でアンバー、100%超で赤【仮：閾値はヒアリングで決める】。</p>
  </>;
}
