'use client';
/* S-05 予実対比タブ：見る（区分×工種。実績の金額を押すと、その行の実績の明細へ）。予算は調整・変更の明細で増減する（モック s05money） */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { ConfirmModal, type ConfirmSpec } from '@/components/ui';
import { BudgetLines, BudgetLineModal, blKey } from './budget-lines';
import { ROLES, budDraft, meterCls, laborB, type ProjFin } from '@/lib/calc';
import { fixBudget } from '@/lib/store';
import type { Project, Div, BudgetRow, BudgetLine, BudgetLineKind, Cost } from '@/lib/types';
import { TODAY, DIVS, NOGRP } from '@/lib/data';
import { fmtD, yen, num, nk, pct, uniq } from '@/lib/format';

type Key = { div: Div; group: string; b: BudgetRow | null };

function Bar({ a, t }: { a: number; t: number }) {
  const r = t ? a / t : (a ? 2 : 0);
  if (!(t || a)) return null;
  return <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 110 }}><div className="meter" style={{ flex: 1 }}><i className={meterCls(r)} style={{ width: `${Math.min(100, r * 100)}%` }} /></div><span className="num small">{t ? pct(r, 0) : '予算外'}</span></div>;
}
const Sgn = ({ n }: { n: number }) => n ? <span className="num small" style={{ color: n < 0 ? 'var(--ng-tx)' : 'var(--ink)' }}>{n > 0 ? '＋' : '−'}{num(Math.abs(n))}</span> : null;

export function Money({ p, f, setTab, toCost }: { p: Project; f: ProjFin; setTab: (t: string) => void; toCost: (cat: string, grp: string) => void }) {
  const { s, ui, user, act, toast, clearF, setF } = useStore();
  const ed = ROLES[ui.role].edit; const admin = ui.role === '管理者'; const draft = budDraft(s, p); const bs = s.budState[p.no!] || {};
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [blModal, setBlModal] = useState<BudgetLineKind | null>(null);
  const costs: Cost[] = s.costs[p.no!] || []; const L = f.lab; const budget = p.budget || []; const BL: BudgetLine[] = s.bl[p.no!] || [];
  const keys: Key[] = []; DIVS.forEach(d => {
    budget.filter(b => b.div === d).forEach(b => keys.push({ div: d, group: b.group, b }));
    uniq(costs.filter(c => c.cat === d && !budget.some(b => b.div === d && b.group === (c.group || NOGRP))).map(c => c.group || NOGRP)).forEach(g => keys.push({ div: d, group: g, b: null }));
  });
  const nAdj = (d: Div, g: string) => BL.filter(l => l.div === d && l.group === g).length;
  /* 「明細 N件」→ 予算の明細のフィルターを区分／工種にして、そこへスクロール */
  const blFilter = (v: string) => { const K = blKey(p); clearF(K); setF(K, 'row', v); setTimeout(() => { const c = document.getElementById('sf-' + K + '-row'); if (c) c.scrollIntoView({ block: 'center' }); }, 0); };

  const rows: React.ReactNode[] = [];
  DIVS.forEach(d => {
    const ks = keys.filter(k => k.div === d); const labor = d === '労務費';
    const est = ks.reduce((t, k) => t + (k.b ? (k.b.est || 0) : 0), 0), init = ks.reduce((t, k) => t + (k.b ? k.b.init : 0), 0), chg = ks.reduce((t, k) => t + (k.b ? k.b.change : 0), 0), tot = init + chg, act2 = f.actBy[d];
    rows.push(<tr key={'g' + d} className="grp"><td>{d}{labor ? <span className="small" style={{ fontWeight: 400, color: 'var(--muted)' }}>　〈うち労務外注費〉</span> : null}</td><td className="r num muted">{num(est)}</td><td className="r num">{num(init)}</td>{draft ? null : <><td className="r num">{num(chg)}</td><td className="r num">{num(tot)}</td></>}
      <td className="r num">{labor ? <><button className="lnk num" onClick={() => setTab('人工')} title="人工タブで内訳を見る">{num(act2)}</button><div className="small" style={{ fontWeight: 400, color: 'var(--muted)' }}>〈{num(L.extCost)}〉</div>{L.staffPrem ? <div className="small" style={{ fontWeight: 400, color: 'var(--warn-tx)' }}>うち時間外・休日・深夜 {num(L.staffPrem)}</div> : null}</> : num(act2)}</td><td className="r num" style={tot - act2 < 0 ? { color: 'var(--ng-tx)' } : undefined}>{num(tot - act2)}</td><td><Bar a={act2} t={tot} /></td></tr>);
    if (labor) rows.push(<tr key="labor-sub" className="sub"><td colSpan={draft ? 6 : 8} style={{ paddingLeft: 22 }} className="small muted">労務費は区分の合計で比べます（下の工種は予算の内訳）。予算＝見積の予定人工×労務の原価単価（標準単価の考え方）、実績＝{laborB(s) ? '社員はB（打刻から計算した賃金相当額。残業・休日・深夜の割増を含む）' : '社員はA（人工×標準単価）'}＋外部は人工×常用単価。{L.staffPrem ? '「うち時間外・休日・深夜」は、時間外と深夜の割増分に、法定休日の勤務分（1.35倍の全額）を足したもの（会社負担込み）。' : ''}{L.pendingNinku ? `未承認 ${nk(L.pendingNinku)}人工は未計上。` : ''}</td></tr>);
    ks.forEach((k, ki) => {
      const ent = costs.filter(c => c.cat === d && (c.group || NOGRP) === k.group); const a = ent.reduce((t, c) => t + c.amount, 0);
      const bt = k.b ? k.b.init + k.b.change : 0; const adjN = k.b ? nAdj(d, k.group) : 0;
      const adjSum = k.b && draft ? k.b.init - (k.b.est || 0) : 0;
      rows.push(<tr key={d + '|' + k.group + '|' + ki} className={labor ? 'inner' : ''}><td style={{ paddingLeft: 22 }}>{labor ? <span className="muted small">内訳　</span> : null}{k.group}{!k.b ? <> <span className="tag kari">予算外</span></> : null}{k.group === NOGRP ? <> <span className="small muted">区分の合計にだけ入る</span></> : null}{adjN ? <> <button className="lnk small" onClick={() => blFilter(d + '|' + k.group)}>明細 {adjN}件</button></> : null}</td>
        <td className="r num muted small">{k.b ? num(k.b.est || 0) : '－'}</td>
        <td className="r num">{k.b ? num(k.b.init) : '－'}{draft && adjSum ? <div><Sgn n={adjSum} /></div> : null}</td>{draft ? null : <><td className="r num">{k.b ? num(k.b.change) : '－'}</td><td className="r num">{k.b ? num(bt) : '－'}</td></>}
        <td className="r">{labor ? <span className="muted small">－</span> : (ent.length ? <><button className="lnk num" onClick={() => toCost(d, k.group)} title="この行の実績の明細を見る">{num(a)}</button><div className="small muted">{ent.length}件</div></> : <span className="num muted">0</span>)}</td>
        <td className="r num">{labor ? '' : num(bt - a)}</td><td>{labor ? null : <Bar a={a} t={bt} />}</td></tr>);
    });
  });
  const estTot = budget.reduce((t, b) => t + (b.est || 0), 0), initTot = budget.reduce((t, b) => t + b.init, 0);

  const budFix = () => {
    const tot = initTot, est = estTot; const n = BL.filter(l => l.kind === '調整').length;
    setConfirm({ title: '実行予算を確定しますか', body: <p style={{ margin: 0 }}>見積の原価 {yen(est)} ＋ 調整 {n}件（{tot - est >= 0 ? '＋' : '−'}{num(Math.abs(tot - est))}）＝ <b className="num">{yen(tot)}</b> を当初予算として固定します。以後の増減は「変更」の明細で足していきます。</p>, okLabel: '確定する',
      onOk: () => { act(st => fixBudget(st, p.id, user ? `${user.name}（${ui.role}）` : ui.role)); toast('実行予算を確定しました。当初予算として固定しました'); } });
  };

  const status = draft
    ? <div className="budstate draft"><div><span className="badge warn">下書き</span> <b>実行予算はまだ確定していません</b><div className="small">受注した見積の原価から作った下書きです。見積はそのままにして、協力会社の見積や人工の手配で変わる分を「調整」の明細として足してください。確定すると「見積の原価＋調整」が当初予算として固定され、以後は「変更」の明細で増減します。</div></div>
      <div className="r">{ed ? <button className="btn btn-secondary btn-sm" onClick={() => setBlModal('調整')}>＋ 調整を追加</button> : null}{admin ? <button className="btn btn-primary btn-sm" onClick={budFix}>予算を確定する</button> : ed ? <button className="btn btn-primary btn-sm" onClick={() => toast('管理者に確定の依頼を送りました（モック）')}>確定を依頼する</button> : null}</div></div>
    : <div className="budstate"><div><span className="badge ok">確定</span> <b>実行予算 {fmtD(bs.at || TODAY)} 確定</b><span className="small muted">　{bs.by || ''}。当初予算は固定。増減は「変更」の明細を1件ずつ足す</span></div>
      {ed ? <div className="r"><button className="btn btn-secondary btn-sm" onClick={() => setBlModal('変更')}>＋ 変更を追加</button></div> : null}</div>;

  return <>
    {status}
    <div className="card" style={{ marginBottom: 14 }}><div className="card-head"><h2 className="section-label">予実対比</h2><span className="cs">原価要素×工種。実績の金額を押すと、その行の明細（原価の明細タブ）へ。実績の登録は原価の明細タブから</span></div>
      <div className="tbl"><table className="money"><thead><tr><th>区分／工種</th><th className="r">見積の原価<br /><span style={{ fontWeight: 400 }}>（参考）</span></th><th className="r">{draft ? <>予算（下書き）<br /><span style={{ fontWeight: 400 }}>見積の原価＋調整</span></> : '当初予算'}</th>{draft ? null : <><th className="r">変更予算</th><th className="r">予算計</th></>}<th className="r">実績</th><th className="r">残</th><th>消化率</th></tr></thead>
        <tbody>{rows}</tbody><tfoot><tr><td>合計</td><td className="r num muted">{num(estTot)}</td><td className="r num">{num(initTot)}</td>{draft ? null : <><td className="r num">{num(budget.reduce((t, b) => t + b.change, 0))}</td><td className="r num">{num(f.budget)}</td></>}<td className="r num">{num(f.actual)}</td><td className="r num">{num(f.remain)}</td><td className="num">{pct(f.consume, 0)}</td></tr></tfoot></table></div>
      <p className="note" style={{ padding: '0 16px 12px' }}>見積の原価＝受注した見積（枝番を含む）の原価を区分×工種で集めたもの。見積は直さず、予算の側で調整・変更の明細を足していきます。工種を付けずに登録した実績は「（工種なし）」として区分の合計にだけ入ります。</p></div>
    <BudgetLines p={p} />
    {confirm ? <ConfirmModal spec={confirm} onClose={() => setConfirm(null)} /> : null}
    {blModal ? <BudgetLineModal p={p} kind={blModal} onClose={() => setBlModal(null)} /> : null}
  </>;
}
