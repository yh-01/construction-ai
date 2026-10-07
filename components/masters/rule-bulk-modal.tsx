'use client';
/* S-10 就業ルールの付け替え（社員を選んで一括／ルール側から「別のルールへ移す」）。モックの MODALS.ruleBulk をそのまま
   中身（時間など）を変えるのは就業ルールの「編集」で版を足す。ここは人の付け替え用 */
import React, { useState } from 'react';
import { Modal } from '@/components/ui';
import { useStore } from '@/lib/store-context';
import { setRules, nextMonthFirst } from '@/lib/store';
import { worker, ruleName, ruleOfW } from '@/lib/calc';
import { TODAY } from '@/lib/data';
import { fmtD } from '@/lib/format';

export function RuleBulkModal({ ids, rule: initRule, onClose, onDone }: { ids: string[]; rule: string; onClose: () => void; onDone?: () => void }) {
  const { s, act, toast } = useStore();
  const [rule, setRule] = useState(initRule);
  const [from, setFrom] = useState(nextMonthFirst());   // 既定は翌月1日
  const r = s.workRules.find(x => x.id === rule);
  const ok = () => {
    act(st => setRules(st, ids, rule, from || TODAY));
    onClose(); onDone?.();
    toast(ids.length + '人の就業ルールを ' + fmtD(from) + ' から変更しました');
  };
  return <Modal onClose={onClose}>
    <div className="card-head"><h2 className="section-label">就業ルールを変更</h2><span className="cs">{ids.length}人</span></div>
    <div className="card-body">
      <div className="form form2"><label>新しい就業ルール<select value={rule} onChange={e => setRule(e.target.value)}>{s.workRules.filter(x => !x.stopped).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>適用開始日<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label></div>
      <div className="tbl" style={{ marginTop: 12, border: '1px solid var(--line)', borderRadius: 8 }}><table><thead><tr><th>氏名</th><th>今のルール</th><th></th><th>{fmtD(from)}から</th></tr></thead><tbody>
        {ids.map(id => { const w = worker(s, id); return <tr key={id}><td>{w.name}</td><td className="small">{ruleName(s, ruleOfW(w, from < TODAY ? from : TODAY))}</td><td>→</td><td className="small"><b>{r ? r.name : ''}</b></td></tr>; })}</tbody></table></div>
      <p className="note">ルールの中身（時間など）を変えたいときは、ここではなく就業ルールの「編集」で版を足します。ここは人の付け替え用です（雇用区分が変わった、事務から現場へ移った など）。適用開始日より前の月は、今のルールのまま計算します。</p></div>
    <div className="foot"><button className="btn btn-secondary" onClick={onClose}>キャンセル</button><button className="btn btn-primary" onClick={ok}>{ids.length}人を変更</button></div>
  </Modal>;
}
