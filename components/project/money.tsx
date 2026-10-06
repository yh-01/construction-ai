'use client';
/* S-05 予実対比タブ：見る（区分×工種。行を押すと、その行の実績の明細へ） */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { Modal, ConfirmModal, type ConfirmSpec } from '@/components/ui';
import { CostModal } from './cost-modal';
import { ROLES, budDraft, meterCls, type ProjFin } from '@/lib/calc';
import { setBudgetInit, saveBudgetChanges, fixBudget, addBudgetRow } from '@/lib/store';
import type { Project, Div, BudgetRow, Cost } from '@/lib/types';
import { TODAY, DIVS, NOGRP } from '@/lib/data';
import { fmtD, yen, num, nk, pct, uniq } from '@/lib/format';

type Key = { div: Div; group: string; b: BudgetRow | null };

function Bar({ a, t }: { a: number; t: number }) {
  const r = t ? a / t : (a ? 2 : 0);
  if (!(t || a)) return null;
  return <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 110 }}><div className="meter" style={{ flex: 1 }}><i className={meterCls(r)} style={{ width: `${Math.min(100, r * 100)}%` }} /></div><span className="num small">{t ? pct(r, 0) : '予算外'}</span></div>;
}
function Diff({ b }: { b: BudgetRow }) {
  const d = b.init - (b.est || 0);
  return d ? <span className="small" style={{ color: d > 0 ? 'var(--ng-tx)' : 'var(--ok-tx,var(--brand-800))' }}>{d > 0 ? '＋' : '−'}{num(Math.abs(d))}</span> : <span className="small muted">±0</span>;
}

export function Money({ p, f, setTab, toCost }: { p: Project; f: ProjFin; setTab: (t: string) => void; toCost: (cat: string, grp: string) => void }) {
  const { s, ui, act, toast } = useStore();
  const ed = ROLES[ui.role].edit; const admin = ui.role === '管理者'; const draft = budDraft(s, p); const bs = s.budState[p.no!] || {};
  const [editing, setEditing] = useState(false);
  const [budChg, setBudChg] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [rowModal, setRowModal] = useState<{ div: Div; group: string; amount: string } | null>(null);
  const [costModal, setCostModal] = useState(false);
  const costs: Cost[] = s.costs[p.no!] || []; const L = f.lab; const budget = p.budget || [];
  const keys: Key[] = []; DIVS.forEach(d => {
    budget.filter(b => b.div === d).forEach(b => keys.push({ div: d, group: b.group, b }));
    uniq(costs.filter(c => c.cat === d && !budget.some(b => b.div === d && b.group === (c.group || NOGRP))).map(c => c.group || NOGRP)).forEach(g => keys.push({ div: d, group: g, b: null }));
  });
  const rows: React.ReactNode[] = [];
  DIVS.forEach(d => {
    const ks = keys.filter(k => k.div === d);
    const est = ks.reduce((t, k) => t + (k.b ? (k.b.est || 0) : 0), 0), init = ks.reduce((t, k) => t + (k.b ? k.b.init : 0), 0), chg = ks.reduce((t, k) => t + (k.b ? k.b.change : 0), 0), tot = init + chg, act2 = f.actBy[d];
    rows.push(<tr key={'g' + d} className="grp"><td>{d}{d === '労務費' ? <span className="small" style={{ fontWeight: 400, color: 'var(--muted)' }}>　〈うち労務外注費〉</span> : null}</td><td className="r num muted">{num(est)}</td><td className="r num">{num(init)}</td>{draft ? null : <><td className="r num">{num(chg)}</td><td className="r num">{num(tot)}</td></>}
      <td className="r num">{num(act2)}{d === '労務費' ? <div className="small" style={{ fontWeight: 400, color: 'var(--muted)' }}>〈{num(L.extCost)}〉</div> : null}</td><td className="r num" style={tot - act2 < 0 ? { color: 'var(--ng-tx)' } : undefined}>{num(tot - act2)}</td><td><Bar a={act2} t={tot} /></td></tr>);
    ks.forEach((k, ki) => {
      const labor = d === '労務費';
      const ent = costs.filter(c => c.cat === d && (c.group || NOGRP) === k.group); const a = ent.reduce((t, c) => t + c.amount, 0);
      const bi = k.b ? budget.indexOf(k.b) : -1; const bt = k.b ? k.b.init + k.b.change : 0;
      const goRow = () => { if (!labor) toCost(d, k.group); else setTab('人工'); };
      const initCell = draft && ed && k.b ? <input className="w" key={'i' + bi} defaultValue={k.b.init} inputMode="numeric" aria-label={`${k.group}の予算`} onChange={e => { const n = Number(e.target.value.replace(/[,，]/g, '')); if (isNaN(n)) return; act(st => setBudgetInit(st, p.id, bi, n)); }} /> : <span className="num">{k.b ? num(k.b.init) : '－'}</span>;
      const chgCell = editing && k.b ? <input className="w" key={'c' + bi} defaultValue={k.b.change} inputMode="numeric" aria-label={`${k.group}の変更予算`} onChange={e => { const n = Number(e.target.value.replace(/[,，]/g, '')); if (isNaN(n)) return; setBudChg(o => ({ ...o, [bi]: n })); }} /> : <span className="num">{k.b ? num(k.b.change) : '－'}</span>;
      rows.push(<tr key={d + '|' + k.group + '|' + ki}><td style={{ paddingLeft: 22 }}>{k.group}{!k.b ? <> <span className="tag kari">予算外</span></> : null}{k.group === NOGRP ? <> <span className="small muted" title="工種を付けずに登録した実績">区分の合計にだけ入る</span></> : null}</td>
        <td className="r num muted small">{k.b ? num(k.b.est || 0) : '－'}{draft && k.b ? <><br /><Diff b={k.b} /></> : null}</td>
        <td className="r">{initCell}</td>{draft ? null : <><td className="r">{chgCell}</td><td className="r num">{k.b ? num(bt) : '－'}</td></>}
        <td className="r">{labor ? <span className="muted small">工種に配分しない</span> : (ent.length ? <><button className="lnk num" onClick={goRow} title="この行の実績の明細を見る">{num(a)}</button><div className="small muted">{ent.length}件</div></> : <span className="num muted">0</span>)}</td>
        <td className="r num">{labor ? '' : num(bt - a)}</td><td>{labor ? null : <Bar a={a} t={bt} />}</td></tr>);
    });
    if (d === '労務費') rows.push(<tr key="labor"><td style={{ paddingLeft: 22 }}>打刻からの労務費</td><td className="r num muted">－</td><td className="r num">－</td>{draft ? null : <><td className="r num">－</td><td className="r num">－</td></>}<td className="r"><button className="lnk num" onClick={() => setTab('人工')}>{num(L.staffCost + L.extCost)}</button><div className="small muted">社員 {nk(L.staffNinku)}／外部 {nk(L.extNinku)}人工</div></td><td></td><td></td></tr>);
  });
  const logs = (s.blog[p.no!] || []).slice().reverse();
  const estTot = budget.reduce((t, b) => t + (b.est || 0), 0), initTot = budget.reduce((t, b) => t + b.init, 0);

  const budSave = () => {
    const r = reason.trim();
    if (!r) { toast('変更の理由を入れてください（履歴に残ります）'); return; }
    const diff = act(st => saveBudgetChanges(st, p.id, budChg, r));
    setBudChg({}); setEditing(false); setReason(''); toast(diff ? '変更予算を保存し、履歴に残しました' : '変更はありませんでした');
  };
  const budFix = () => {
    const tot = initTot, est = estTot;
    setConfirm({ title: '実行予算を確定しますか', body: <p style={{ margin: 0 }}>予算 <b className="num">{yen(tot)}</b>（見積の原価 {yen(est)}、差 {tot - est >= 0 ? '＋' : '−'}{num(Math.abs(tot - est))}）を当初予算として固定します。以後の増減は理由つきの変更予算になります。</p>, okLabel: '確定する',
      onOk: () => { act(st => fixBudget(st, p.id)); toast('実行予算を確定しました。当初予算として固定しました'); } });
  };
  const budRowOk = () => {
    if (!rowModal) return; const a = Number(rowModal.amount.replace(/[,，]/g, '')) || 0;
    act(st => addBudgetRow(st, p.id, rowModal.div, rowModal.group, a)); setRowModal(null); toast(rowModal.div + '／' + rowModal.group + ' に ' + num(a) + ' 円を追加しました（下書き）');
  };
  const koshu = s.koshu.filter(k => !k.stopped);

  const status = draft
    ? <div className="budstate draft"><div><span className="badge warn">下書き</span> <b>実行予算はまだ確定していません</b><div className="small">受注した見積の原価から作った下書きです。協力会社の見積・人工の手配を見直して、金額を直してから確定してください。確定した金額が「当初予算」になり、以後は理由つきの「変更予算」で増減します。</div></div>
      <div className="r">{ed ? <button className="btn btn-secondary btn-sm" onClick={() => setRowModal({ div: '外注費', group: koshu[0]?.name || '', amount: '200000' })}>＋ 行を追加</button> : null}{admin ? <button className="btn btn-primary btn-sm" onClick={budFix}>予算を確定する</button> : ed ? <button className="btn btn-primary btn-sm" onClick={() => toast('管理者に確定の依頼を送りました（モック）')}>確定を依頼する</button> : null}</div></div>
    : <div className="budstate"><div><span className="badge ok">確定</span> <b>実行予算 {fmtD(bs.at || TODAY)} 確定</b><span className="small muted">　{bs.by || ''}。当初予算は固定。増減は「予算を変更」から理由つきで</span></div>
      {ed ? <div className="r">{editing ? <><input value={reason} onChange={e => setReason(e.target.value)} placeholder="変更の理由（必須）" style={{ width: 240 }} /><button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setBudChg({}); setReason(''); }}>やめる</button><button className="btn btn-primary btn-sm" onClick={budSave}>変更を保存</button></> : <button className="btn btn-secondary btn-sm" onClick={() => { setBudChg({}); setEditing(true); }}>予算を変更</button>}</div> : null}</div>;

  return <>
    {status}
    <div className="card" style={{ marginBottom: 14 }}><div className="card-head"><h2 className="section-label">予実対比</h2><span className="cs">原価要素×工種。実績の金額を押すと、その行の明細（原価の明細タブ）へ</span>
      {ed ? <div className="r"><button className="btn btn-soft btn-sm" onClick={() => setCostModal(true)}>＋ 実績を登録</button></div> : null}</div>
      <div className="tbl"><table className="money"><thead><tr><th>区分／工種</th><th className="r">見積の原価<br /><span style={{ fontWeight: 400 }}>（参考）</span></th><th className="r">{draft ? '予算（下書き）' : '当初予算'}</th>{draft ? null : <><th className="r">変更予算</th><th className="r">予算計</th></>}<th className="r">実績</th><th className="r">残</th><th>消化率</th></tr></thead>
        <tbody>{rows}</tbody><tfoot><tr><td>合計</td><td className="r num muted">{num(estTot)}</td><td className="r num">{num(initTot)}</td>{draft ? null : <><td className="r num">{num(budget.reduce((t, b) => t + b.change, 0))}</td><td className="r num">{num(f.budget)}</td></>}<td className="r num">{num(f.actual)}</td><td className="r num">{num(f.remain)}</td><td className="num">{pct(f.consume, 0)}</td></tr></tfoot></table></div>
      <p className="note" style={{ padding: '0 16px 12px' }}>見積の原価＝受注した見積（枝番を含む）の原価を区分×工種で集めたもの。実行予算と違ってよい（協力会社の見積や人工の手配で変わる）。労務費は打刻から工事全体で計上するため工種には配分しません。工種を付けずに登録した実績は「（工種なし）」として区分の合計にだけ入ります。{L.pendingNinku ? `未承認の ${nk(L.pendingNinku)}人工は承認されると計上されます。` : ''}</p></div>
    <div className="grid2">
      <div className="card"><div className="card-head"><h2 className="section-label">予算の変更履歴</h2><span className="cs">確定後の増減。理由と金額</span></div><div className="card-body">
        {logs.length ? logs.map((l, i) => <div key={i} className="logrow"><div className="row" style={{ justifyContent: 'space-between' }}><span className="num small">{fmtD(l.date)}</span><span className="num small" style={{ color: l.amount < 0 ? 'var(--ng-tx)' : 'var(--ink)' }}>{l.amount >= 0 ? '＋' : '−'}{num(Math.abs(l.amount))}</span></div><div>{l.reason}</div><div className="small muted">{l.who}</div></div>) : <span className="muted small">{draft ? '確定すると、以後の変更がここに残ります' : '変更はありません'}</span>}</div></div>
      <div className="card"><div className="card-head"><h2 className="section-label">実行予算の流れ</h2></div><div className="card-body"><ol className="flow">
        <li className="done">受注：見積の原価から下書きを作る（自動）</li>
        <li className={draft ? 'cur' : 'done'}>施工管理が見直す（協力会社の見積・人工の手配）</li>
        <li className={draft ? '' : 'done'}>管理者が確定 → 当初予算として固定</li>
        <li className={draft ? '' : 'cur'}>変更は理由つきで「変更予算」へ（追加工事・設計変更・単価差）</li></ol>
        <p className="note">【要確認】今、実行予算を作っているか。作っていなければ「見積の原価をそのまま確定」から始める。</p></div></div>
    </div>
    {confirm ? <ConfirmModal spec={confirm} onClose={() => setConfirm(null)} /> : null}
    {costModal ? <CostModal p={p} idx={-1} onClose={() => setCostModal(false)} /> : null}
    {rowModal ? <Modal onClose={() => setRowModal(null)}>
      <div className="card-head"><h2 className="section-label">予算の行を追加</h2><span className="cs">見積に無かった費用（外注・重機など）</span></div><div className="card-body"><div className="form">
        <label>区分<select value={rowModal.div} onChange={e => setRowModal({ ...rowModal, div: e.target.value as Div })}>{DIVS.map(d => <option key={d}>{d}</option>)}</select></label>
        <label>工種<select value={rowModal.group} onChange={e => setRowModal({ ...rowModal, group: e.target.value })}>{koshu.map(k => <option key={k.code}>{k.name}</option>)}</select></label>
        <label>金額（税抜）<input value={rowModal.amount} onChange={e => setRowModal({ ...rowModal, amount: e.target.value })} inputMode="numeric" /></label></div></div>
      <div className="foot"><button className="btn btn-secondary" onClick={() => setRowModal(null)}>キャンセル</button><button className="btn btn-primary" onClick={budRowOk}>追加</button></div>
    </Modal> : null}
  </>;
}
