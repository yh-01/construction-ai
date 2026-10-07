'use client';
/* S-13 見積一覧 */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { PageHead, VerBadge, TableCount, EmptyRow, Modal } from '@/components/ui';
import { FilterBar, useFilter, useSort } from '@/components/filter';
import { CustLabel } from '@/components/lead-modal';
import { ROLES, myProjects, custOf, estTotals, estState } from '@/lib/calc';
import { createEst } from '@/lib/store';
import { PRE, STAFFS } from '@/lib/data';
import { md, yen, pct } from '@/lib/format';
import type { Project, Estimate, EstVersion } from '@/lib/types';

type Row = { p: Project; e: Estimate; ei: number; v: EstVersion };

export default function EstimatesPage() {
  const { s, ui, act, setUi, toast } = useStore();
  const { go } = useNav();
  const K = 's13';
  const F = useFilter(K); const { sortBy, Th } = useSort(K);
  const [pick, setPick] = useState(false);
  const canEdit = ROLES[ui.role].edit;
  const cv = ROLES[ui.role].cost !== 'hide';
  const all: Row[] = [];
  myProjects(s, ui.role, ui.me).forEach(p => p.estimates.forEach((e, ei) => { all.push({ p, e, ei, v: e.versions[e.versions.length - 1] }); }));
  const list = all.filter(({ p, e, v }) => F.fText('kw', e.no, p.id, p.title, p.custName, custOf(s, p).name) && F.fSel('st', v.state) && F.fSel('staff', p.staff)
    && F.fRange('amt', v.lines.length ? estTotals(s, v.lines, e.rate).sub : null) && (!F.fv('mon') || v.date.slice(0, 7) === F.fv('mon')));
  const rows = sortBy(list, { no: x => x.e.no, lead: x => x.p.id, cust: x => x.p.custName, date: x => x.v.date, amt: x => x.v.lines.length ? estTotals(s, x.v.lines, x.e.rate).sub : null, gp: x => x.v.lines.length ? estTotals(s, x.v.lines, x.e.rate).gp : null }, { k: 'date', dir: -1 });
  const openProj = (p: Project) => { if (p.no) { setUi({ s05tab: '概要' }); go('S-05', { id: p.id }); } else go('S-02', { id: p.id }); };
  return <>
    <PageHead id="S-13" title="見積一覧" sub="見積はすべて与件にひもづきます" acts={canEdit ? <button className="btn btn-primary btn-md" onClick={() => setPick(true)}>＋ 見積を作成</button> : null} />
    <div className="card">
      <FilterBar keyName={K} cfg={{
        kw: '見積番号・与件番号・件名・得意先で検索',
        quick: [{ k: 'st', label: '状態', type: 'select', opts: ['作成中', '提出済', '受注', '失注'] }, { k: 'staff', label: '担当', type: 'select', opts: STAFFS }],
        more: [{ k: 'mon', label: '見積日（月）', type: 'month' }, { k: 'amt', label: '金額（税抜）', type: 'range' }] }} />
      <div className="card-head"><TableCount n={list.length} total={all.length} unit="件" /><span className="cs">最新版を表示。与件番号（工事番号）を押すと与件詳細（案件詳細）へ</span></div>
      <div className="tbl"><table><thead><tr><Th k="no" label="見積番号" /><Th k="lead" label="与件" /><Th k="cust" label="得意先" /><th>担当</th><th>版</th><Th k="date" label="日付" /><Th k="amt" label="金額（税抜）" cls="r" />{cv ? <Th k="gp" label="粗利率" cls="r" /> : null}<th>状態</th></tr></thead>
        <tbody>{rows.length ? rows.map(({ p, e, ei, v }) => {
          const t = v.lines.length ? estTotals(s, v.lines, e.rate) : null; const c = custOf(s, p);
          return <tr key={e.no + '-' + p.id} className="click" onClick={() => go('S-03', { pid: p.id, ei, v: v.v, from: 'S-13' })}>
            <td className="num">{e.no}{e.branchNo ? <div className="small muted">追加 {e.branchNo}</div> : null}</td>
            <td><button className="lnk num small" onClick={ev => { ev.stopPropagation(); openProj(p); }}>{p.no ? '工事 ' + p.no : p.id}</button><div><b style={{ color: 'var(--ink)' }}>{p.title}</b></div></td>
            <td className="nw"><CustLabel unreg={c.unreg} name={p.custName || '（未入力）'} short={c.short} /></td><td className="nw small">{p.staff}</td>
            <td className="nw">第{v.v}版<span className="small muted">／全{e.versions.length}版</span></td><td className="nw">{md(v.date)}</td>
            <td className="r num">{t ? yen(t.sub) : '－'}</td>{cv ? <td className="r num">{t ? pct(t.gp) : '－'}</td> : null}<td><VerBadge s={v.state} /></td></tr>;
        }) : <EmptyRow cols={9} onClear={F.clear} />}</tbody></table></div></div>
    {pick ? <PickLeadModal onClose={() => setPick(false)} onPick={pid => { setPick(false); const ref = act(st => createEst(st, pid)); go('S-03', { ...ref, from: 'S-13' }); toast('見積を作成しました。工種を追加して明細を入れてください'); }} /> : null}
  </>;
}

/* 見積を作成する与件を選ぶ */
function PickLeadModal({ onClose, onPick }: { onClose: () => void; onPick: (pid: string) => void }) {
  const { s, ui } = useStore();
  const leads = myProjects(s, ui.role, ui.me).filter(p => PRE.includes(p.status));
  const [sel, setSel] = useState<string>(leads[0]?.id || '');
  return <Modal onClose={onClose}>
    <div className="card-head"><h2 className="section-label">見積を作成する与件を選ぶ</h2><span className="cs">見積は与件にひもづけて作ります</span></div>
    <div className="card-body stack" style={{ gap: 6 }}>{leads.map(p => { const es = estState(s, p);
      return <label key={p.id} className="opt"><input type="radio" name="pl" value={p.id} checked={sel === p.id} onChange={() => setSel(p.id)} /><span><b>{p.title}</b><small>{p.id}　{p.custName || custOf(s, p).short}　{es ? `見積あり（${es.no} 第${es.v}版 ${es.state}）→ 別の見積として追加` : '見積なし'}</small></span></label>; })}
      <p className="note" style={{ margin: 0 }}>一覧にない場合は、先に与件を登録してください。</p></div>
    <div className="foot"><button className="btn btn-secondary" onClick={onClose}>キャンセル</button><button className="btn btn-primary" onClick={() => { if (sel) onPick(sel); }}>この与件で作成する</button></div>
  </Modal>;
}
