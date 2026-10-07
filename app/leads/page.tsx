'use client';
/* S-12 与件一覧 */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { PageHead, StatusBadge, VerBadge, TableCount, EmptyRow } from '@/components/ui';
import { FilterBar, useFilter, useSort } from '@/components/filter';
import { LeadModal, CustLabel } from '@/components/lead-modal';
import { ROLES, myProjects, custOf, estState } from '@/lib/calc';
import { PRE, STAFFS, TODAY } from '@/lib/data';
import { md, yen } from '@/lib/format';

export default function LeadsPage() {
  const { s, ui } = useStore();
  const { go } = useNav();
  const K = 's12';
  const F = useFilter(K); const { sortBy, Th } = useSort(K);
  const [modal, setModal] = useState(false);
  const canEdit = ROLES[ui.role].edit;
  const base = myProjects(s, ui.role, ui.me).filter(p => PRE.includes(p.status) || p.status === '失注'); // 受注したものは与件ではない
  const list = base.filter(p => { const es = estState(s, p); const c = custOf(s, p);
    const st = F.fv('st'); if (st === 'active' && p.status === '失注') return false; if (st === 'lost' && p.status !== '失注') return false;
    return F.fText('kw', p.id, p.title, p.custName, c.name, p.site) && F.fSel('staff', p.staff)
      && F.fSel('hasEst', es ? 'あり' : 'なし') && F.fRange('amt', es && es.amount !== null ? es.amount : null)
      && F.fDue('due', p.estDue) && F.fDue('exp', p.expire) && F.fText('cust', p.custName, c.name); });
  const rows = sortBy(list, { id: p => p.id, cust: p => p.custName, title: p => p.title, staff: p => p.staff, req: p => p.reqDate, due: p => p.estDue, exp: p => p.expire, amt: p => { const e = estState(s, p); return e ? e.amount : null; } }, { k: 'req', dir: -1 });
  return <>
    <PageHead id="S-12" title="与件一覧" sub={ui.role === '職長' ? '担当分のみ' : ''} acts={canEdit ? <button className="btn btn-primary btn-md" onClick={() => setModal(true)}>＋ 与件を登録</button> : null} />
    <div className="card">
      <FilterBar keyName={K} cfg={{
        kw: '与件番号・件名・得意先・現場で検索',
        quick: [{ k: 'st', label: '状態', type: 'select', opts: [['active', '失注を除く'], ['lost', '失注']] }, { k: 'staff', label: '担当', type: 'select', opts: STAFFS }, { k: 'due', label: '見積作成期限', type: 'due' }],
        more: [{ k: 'cust', label: '得意先', type: 'text' }, { k: 'hasEst', label: '見積', type: 'select', opts: [['あり', 'あり'], ['なし', 'なし']] }, { k: 'exp', label: '有効期限', type: 'due' }, { k: 'amt', label: '見積額（税抜・最新版）', type: 'range' }] }} />
      <div className="card-head"><TableCount n={list.length} total={base.length} unit="件" /><span className="cs">受注した与件は案件一覧に移ります</span></div>
      <div className="tbl"><table><thead><tr><Th k="id" label="与件番号" /><Th k="cust" label="得意先" /><Th k="title" label="件名" /><Th k="staff" label="担当" /><Th k="req" label="依頼日" /><Th k="due" label="見積作成期限" /><Th k="exp" label="有効期限" /><Th k="amt" label="見積（最新版）" /><th>状態</th></tr></thead>
        <tbody>{rows.length ? rows.map(p => {
          const es = estState(s, p); const c = custOf(s, p);
          const submitted = p.estimates.some(e => e.versions.some(v => ['提出済', '受注', '失注'].includes(v.state)));
          const live = p.status !== '失注';
          const dueOver = live && p.estDue && p.estDue < TODAY && !submitted;
          const expOver = live && p.expire && p.expire < TODAY;
          return <tr key={p.id} className="click" onClick={() => go('S-02', { id: p.id })}>
            <td className="num">{p.id}</td><td className="nw"><CustLabel unreg={c.unreg} name={p.custName || '（未入力）'} short={c.short} /></td>
            <td><b style={{ color: 'var(--ink)' }}>{p.title}</b>{p.status === '失注' && p.lostReason ? <div className="small muted">失注理由：{p.lostReason}</div> : null}</td>
            <td className="nw small">{p.staff}</td><td className="nw">{md(p.reqDate)}</td>
            <td className="nw">{p.estDue ? md(p.estDue) : '－'}{dueOver ? <span className="warnline">期限切れ</span> : null}</td>
            <td className="nw">{p.expire ? md(p.expire) : '－'}{expOver ? <span className="warnline">期限切れ</span> : null}</td>
            <td>{es ? <><div className="num small">{es.no} 第{es.v}版{es.estCount > 1 ? <> <span className="muted">ほか{es.estCount - 1}件</span></> : null}</div><div className="row" style={{ gap: 6 }}>{es.amount !== null ? <span className="num small">{yen(es.amount)}</span> : null}{live && ['作成中', '提出済'].includes(es.state) ? <VerBadge s={es.state} /> : null}</div></> : <span className="muted small">見積なし</span>}</td>
            <td><StatusBadge s={p.status} /></td></tr>;
        }) : <EmptyRow cols={9} onClear={F.clear} />}</tbody></table></div></div>
    <p className="note">見積作成期限＝先方に見積を出す期限。有効期限＝提出した見積の有効期限。期限は範囲ではなく「期限切れ／7日以内／今月中／来月以降」で絞り込みます。</p>
    {modal ? <LeadModal onClose={() => setModal(false)} onSaved={id => { setModal(false); go('S-02', { id }); }} /> : null}
  </>;
}
