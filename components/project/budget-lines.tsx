'use client';
/* S-05 予算の明細（調整・変更）：何がいくら、なぜ増減したかを1件ずつ残す（モック blList / MODALS.bl） */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { Modal } from '@/components/ui';
import { FilterBar, useFilter } from '@/components/filter';
import { ROLES, budDraft } from '@/lib/calc';
import { addBudgetLine, deleteBudgetLine } from '@/lib/store';
import type { Project, Div, BudgetLine, BudgetLineKind } from '@/lib/types';
import { TODAY, DIVS, BCATS } from '@/lib/data';
import { md, num, uniq } from '@/lib/format';

/** 予算の明細のフィルターキー（予実対比の「明細 N件」からも使う） */
export const blKey = (p: Project) => 'bl-' + p.no;

export function BudgetLines({ p }: { p: Project }) {
  const { s, ui, act, toast } = useStore();
  const BL: BudgetLine[] = s.bl[p.no!] || []; const draft = budDraft(s, p); const ed = ROLES[ui.role].edit; const K = blKey(p);
  const F = useFilter(K);
  const list = BL.map((l, i) => ({ i, ...l })).filter(l => F.fSel('kind', l.kind) && F.fSel('cat', l.cat) && (!F.fv('row') || (l.div + '|' + l.group) === F.fv('row')) && F.fText('kw', l.reason, l.group, l.who));
  const byCat = BCATS.map(c => [c, BL.filter(l => l.kind === '変更' && l.cat === c).reduce((t, l) => t + l.amount, 0)] as [string, number]).filter(x => x[1]);
  const rows = list.slice().sort((a, b) => b.date.localeCompare(a.date) || b.i - a.i);
  const blDel = (i: number) => { const l = act(st => deleteBudgetLine(st, p.id, i)); toast('調整を削除しました（' + (l ? l.div + '／' + l.group : '') + '）'); };
  return <div className="card"><div className="card-head"><h2 className="section-label">予算の明細（調整・変更）</h2><span className="cs">{draft ? '確定前の調整は削除できます' : '確定後の変更は消さずに、逆の金額の明細で訂正します（履歴を残すため）'}</span>
      {byCat.length ? <div className="r small">{byCat.map(([c, v]) => <span key={c} className="catsum">{c} <b className="num">{v > 0 ? '＋' : '−'}{num(Math.abs(v))}</b></span>)}</div> : null}</div>
    <FilterBar keyName={K} cfg={{ kw: '理由・工種・登録者で検索', quick: [{ k: 'kind', label: '種類', type: 'select', opts: ['調整', '変更'] }, { k: 'cat', label: '理由区分', type: 'select', opts: BCATS }, { k: 'row', label: '区分／工種', type: 'select', opts: uniq(BL.map(l => l.div + '|' + l.group)).map(x => [x, x.replace('|', '／')] as [string, string]) }] }} />
    <div className="tbl"><table><thead><tr><th>日付</th><th>種類</th><th>区分／工種</th><th>理由区分</th><th>理由</th><th className="r">金額</th><th>登録者</th><th></th></tr></thead><tbody>
      {rows.length ? rows.map(l => <tr key={l.i}><td className="nw num">{md(l.date)}</td><td>{l.kind === '調整' ? <span className="badge warn">調整</span> : <span className="badge info">変更</span>}</td><td className="small nw">{l.div}／{l.group}</td><td className="small nw">{l.cat}{l.auto ? <> <span className="tag kari" title="枝番の受注で自動追加">自動</span></> : null}</td><td>{l.reason}</td><td className="r num" style={l.amount < 0 ? { color: 'var(--ng-tx)' } : undefined}>{l.amount > 0 ? '＋' : '−'}{num(Math.abs(l.amount))}</td><td className="small muted nw">{l.who}</td>
        <td className="nw">{ed && (l.kind === '調整' && draft) ? <button className="icon-btn" onClick={() => blDel(l.i)} aria-label="この調整を削除">×</button> : null}</td></tr>)
        : <tr><td colSpan={8} className="muted small" style={{ padding: '14px 16px' }}>{BL.length ? '条件に合う明細はありません' : draft ? 'まだ調整はありません。見積の原価のままなら、そのまま確定できます' : '変更はありません'}</td></tr>}</tbody>
      {list.length ? <tfoot><tr><td colSpan={5}>合計（{list.length}件）</td><td className="r num">{num(list.reduce((t, l) => t + l.amount, 0))}</td><td colSpan={2}></td></tr></tfoot> : null}</table></div></div>;
}

type BlForm = { kind: BudgetLineKind; date: string; div: Div; group: string; amount: string; sign: '+' | '-'; cat: string; reason: string };

/** 調整（確定前）／変更（確定後）の明細を追加するモーダル */
export function BudgetLineModal({ p, kind, onClose }: { p: Project; kind: BudgetLineKind; onClose: () => void }) {
  const { s, ui, user, act, toast } = useStore();
  const [d, setD] = useState<BlForm>({ kind, date: TODAY, div: '外注費', group: '', amount: '', sign: '+', cat: kind === '調整' ? '手配変更' : '単価差', reason: '' });
  const budget = p.budget || [];
  const groups = uniq([...budget.filter(b => b.div === d.div).map(b => b.group), ...s.koshu.filter(k => !k.stopped).map(k => k.name)]);
  const b = budget.find(x => x.div === d.div && x.group === (d.group || groups[0])); const cur = b ? b.init + b.change : 0;
  const n = Number(String(d.amount).replace(/[,，]/g, '')) || 0; const amt = d.sign === '-' ? -n : n;
  const up = (k: keyof BlForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value;
    if (k === 'div') setD({ ...d, div: v as Div, group: '' }); else setD({ ...d, [k]: v });
  };
  const save = () => {
    if (!n) { toast('金額を入れてください'); return; }
    if (!d.reason.trim()) { toast('理由を入れてください（履歴に残ります）'); return; }
    const who = user ? `${user.name}（${ui.role}）` : ui.role;
    const l = act(st => addBudgetLine(st, p.id, { kind: d.kind, date: d.date || TODAY, div: d.div, group: d.group || groups[0], amount: amt, cat: d.cat, reason: d.reason, who }));
    onClose(); toast(`${l.kind}を追加しました（${l.div}／${l.group} ${l.amount > 0 ? '＋' : '−'}${num(Math.abs(l.amount))}）`);
  };
  return <Modal size="mid" onClose={onClose}>
    <div className="card-head"><h2 className="section-label">{d.kind === '調整' ? '調整を追加（確定前）' : '変更を追加（確定後）'}</h2><span className="cs">{p.no} {p.title}</span></div><div className="card-body"><div className="form form2">
      <label>日付<input type="date" value={d.date} onChange={up('date')} /></label>
      <label>理由区分<select value={d.cat} onChange={up('cat')}>{BCATS.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>区分<select value={d.div} onChange={up('div')}>{DIVS.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>工種<select value={d.group || groups[0] || ''} onChange={up('group')}>{groups.map(g => <option key={g} value={g}>{g}</option>)}</select></label>
      <label>増やす／減らす<span className="seg" style={{ width: 'max-content' }}><button onClick={() => setD({ ...d, sign: '+' })} aria-pressed={d.sign !== '-'}>増やす（＋）</button><button onClick={() => setD({ ...d, sign: '-' })} aria-pressed={d.sign === '-'}>減らす（−）</button></span></label>
      <label>金額（税抜）<input value={d.amount} onChange={up('amount')} inputMode="numeric" placeholder="例：180000" /></label>
      <label style={{ gridColumn: '1/-1' }}><span>理由<span className="req">必須</span></span><input value={d.reason} onChange={up('reason')} placeholder={d.kind === '調整' ? '例：吊り込みを浜鳶工業に一部外注（協力会社見積 10/5）' : '例：設計変更でSUS配管50Aを20m追加（変更見積 M-2026-045 第3版）'} /></label>
    </div>
    <div className="rate-prev" style={{ marginTop: 12 }}><div><span className="small muted">この行の予算（今）</span><b className="num">{num(cur)}</b></div><div><span className="small muted">この明細</span><b className="num">{amt >= 0 ? '＋' : '−'}{num(Math.abs(amt))}</b></div><div><span className="small muted">追加後</span><b className="num">{num(cur + amt)}</b></div></div>
    <p className="note">{d.kind === '調整' ? '調整は「見積の原価」に足し引きして当初予算を作るための明細です。確定すると当初予算に含まれて固定されます。' : '理由区分ごとに集計できます（契約変更による増減か、単価差・手配変更・見積漏れなど現場側の読み違いかを分けて見るため）。'}</p></div>
    <div className="foot"><button className="btn btn-secondary" onClick={onClose}>キャンセル</button><button className="btn btn-primary" onClick={save}>追加する</button></div>
  </Modal>;
}
