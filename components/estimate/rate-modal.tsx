'use client';
/* S-03 掛率を一括変更モーダル。モックの ACT.rateOpen / MODALS.rate / rateApply をそのまま */
import React, { useState } from 'react';
import { Modal } from '@/components/ui';
import { useStore } from '@/lib/store-context';
import { estTotals, groupsOf } from '@/lib/calc';
import { rateTargets, applyRate } from '@/lib/store';
import { yen, pct } from '@/lib/format';
import type { Estimate, EstVersion, EstLine } from '@/lib/types';

export function RateModal({ pid, e, ei, v, custRate, sel, initialTarget, onClose, onApplied }: {
  pid: string; e: Estimate; ei: number; v: EstVersion; custRate: number; sel: Set<number>; initialTarget: 'sel' | 'all'; onClose: () => void; onApplied: () => void;
}) {
  const { s, act, toast } = useStore();
  const [target, setTarget] = useState<'sel' | 'grp' | 'all'>(initialTarget);
  const [group, setGroup] = useState('');
  const [rate, setRate] = useState(e.rate.toFixed(2));
  const [mode, setMode] = useState<'set' | 'reset'>('set');
  const [alsoDefault, setAlsoDefault] = useState(false);
  const groups = groupsOf(v);
  const idx = rateTargets(s, v, target, group, sel);
  const before = estTotals(s, v.lines, custRate);
  const sim: EstLine[] = JSON.parse(JSON.stringify(v.lines)); idx.forEach(i => { sim[i].rate = mode === 'reset' ? null : Number(rate); });
  const r = Number(rate); const okRate = mode === 'reset' || (r > 0 && r < 10);
  const after = estTotals(s, sim, alsoDefault && okRate && mode === 'set' ? r : custRate);
  const apply = () => {
    act(st => applyRate(st, pid, ei, v, idx, mode, r, alsoDefault, target)); onClose(); onApplied();
    toast(mode === 'reset' ? idx.length + '件の掛率を初期値に戻しました' : idx.length + '件の掛率を ' + r.toFixed(2) + ' にしました');
  };
  return <Modal onClose={onClose}>
    <div className="card-head"><h2 className="section-label">掛率を一括変更</h2><span className="cs">{e.no} 第{v.v}版</span></div>
    <div className="card-body stack">
      <div><div className="step">1. どの明細を変えるか</div><div className="stack" style={{ gap: 6 }}>
        <label className="opt"><input type="radio" name="rt" value="sel" checked={target === 'sel'} disabled={!sel.size} onChange={() => setTarget('sel')} /><span>選んだ明細（{sel.size}件）{sel.size ? null : <small>表のチェックで選べます</small>}</span></label>
        <label className="opt"><input type="radio" name="rt" value="grp" checked={target === 'grp'} onChange={() => setTarget('grp')} /><span>工種を選ぶ　<select value={group || groups[0] || ''} onChange={ev => { setGroup(ev.target.value); setTarget('grp'); }} aria-label="工種">{groups.map(g => <option key={g}>{g}</option>)}</select></span></label>
        <label className="opt"><input type="radio" name="rt" value="all" checked={target === 'all'} onChange={() => setTarget('all')} /><span>すべての明細（{v.lines.length}件）</span></label></div></div>
      <div><div className="step">2. どう変えるか</div><div className="stack" style={{ gap: 6 }}>
        <label className="opt"><input type="radio" name="rm" value="set" checked={mode === 'set'} onChange={() => setMode('set')} /><span>掛率を　<input className="n" value={rate} onChange={ev => setRate(ev.target.value)} inputMode="decimal" aria-label="新しい掛率" style={{ width: 72 }} />　にする</span></label>
        <label className="opt"><input type="radio" name="rm" value="reset" checked={mode === 'reset'} onChange={() => setMode('reset')} /><span>明細ごとの上書きを消して、見積の初期値（{custRate.toFixed(2)}）に戻す</span></label>
        {target === 'all' && mode === 'set' ? <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={alsoDefault} onChange={ev => setAlsoDefault(ev.target.checked)} /> この見積の掛率の初期値も {okRate ? r.toFixed(2) : '－'} にする（このあと追加する明細にも効く）</label> : null}</div></div>
      <div className="rate-prev"><div><span className="small muted">対象</span><b className="num">{idx.length}件</b></div>
        <div><span className="small muted">小計（税抜）</span><b className="num">{yen(before.sub)} → {okRate ? yen(after.sub) : '－'}</b></div>
        <div><span className="small muted">粗利率</span><b className="num">{pct(before.gp)} → {okRate ? pct(after.gp) : '－'}</b></div></div>
    </div>
    <div className="foot"><button className="btn btn-secondary" onClick={onClose}>キャンセル</button><button className="btn btn-primary" disabled={!(idx.length && okRate)} onClick={apply}>{idx.length}件に適用</button></div>
  </Modal>;
}
