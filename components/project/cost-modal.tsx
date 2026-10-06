'use client';
/* S-05 原価の明細：実績の登録・編集モーダル（MODALS.cost）。予実対比タブと原価の明細タブの両方から使う */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { Modal } from '@/components/ui';
import { saveCost, type CostForm } from '@/lib/store';
import type { Project, Div, Cost } from '@/lib/types';
import { TODAY } from '@/lib/data';
import { uniq } from '@/lib/format';

export function costFormOf(costs: Cost[], idx: number): CostForm {
  if (idx < 0) return { date: TODAY, cat: '材料費', group: '', ven: '', memo: '', amount: '', doc: '' };
  const c = costs[idx];
  return { date: c.date, cat: c.cat, group: c.group || '', ven: c.vid ? 'P:' + c.vid : c.sid ? 'V:' + c.sid : '', memo: c.memo, amount: String(c.amount), doc: c.doc || '' };
}

export function CostModal({ p, idx, onClose, onDelete }: { p: Project; idx: number; onClose: () => void; onDelete?: () => void }) {
  const { s, act, toast } = useStore();
  const { go } = useNav();
  const costs = s.costs[p.no!] || [];
  const [d, setD] = useState<CostForm>(() => costFormOf(costs, idx));
  const cat = d.cat;
  const budget = p.budget || [];
  const groups = uniq([...budget.filter(b => b.div === cat).map(b => b.group), ...s.koshu.filter(k => !k.stopped).map(k => k.name)]);
  const venOpts: [string, string][] = cat === '外注費'
    ? s.partners.filter(x => !x.stopped || ('P:' + x.id) === d.ven).map(x => [`P:${x.id}`, x.name + '（協力会社）'])
    : s.vendors.filter(x => !x.stopped || ('V:' + x.id) === d.ven).map(x => [`V:${x.id}`, x.name + '（' + x.cat + '）']);
  const up = (k: keyof CostForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value;
    if (k === 'cat') setD({ ...d, cat: v as Div, ven: '' }); else setD({ ...d, [k]: v });
  };
  const goMaster = (tab: string) => { onClose(); go('S-10', { tab }); toast('マスタに登録してから、案件の原価の明細に戻って登録してください'); };
  const save = () => {
    const a = Number(String(d.amount).replace(/[,，]/g, ''));
    if (!d.ven) { toast('取引先を選んでください（必須）'); return; }
    if (!a) { toast('金額を入れてください'); return; }
    const e = act(st => saveCost(st, p.no!, d, idx));
    onClose(); toast((idx >= 0 ? '実績を更新しました' : '実績を登録しました') + '（' + e.cat + '／' + (e.group || '工種なし') + '）');
  };
  return <Modal size="mid" onClose={onClose}>
    <div className="card-head"><h2 className="section-label">{idx >= 0 ? '実績を編集' : '実績を登録'}</h2><span className="cs">{p.no} {p.title}</span></div>
    <div className="card-body"><div className="form form2">
      <label>計上日<input type="date" value={d.date} onChange={up('date')} /></label>
      <label>区分<select value={cat} onChange={up('cat')}>{['材料費', '外注費', '経費'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label><span>取引先<span className="req">必須</span></span><select value={d.ven} onChange={up('ven')} aria-required="true"><option value="">選んでください</option>{venOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <span className="small" style={{ fontWeight: 400 }}>{cat === '外注費' ? '協力会社マスタから' : '取引先マスタから'}。ない場合は <button className="lnk small" onClick={() => goMaster(cat === '外注費' ? '協力会社' : '取引先')}>マスタに追加</button></span></label>
      <label><span>工種<span className="small" style={{ fontWeight: 400 }}>　任意（どの予算に付けるか）</span></span><select value={d.group} onChange={up('group')}><option value="">工種なし（区分の合計にだけ入る）</option>{groups.map(g => <option key={g} value={g}>{g}{budget.some(b => b.div === cat && b.group === g) ? '' : '（予算外）'}</option>)}</select></label>
      <label style={{ gridColumn: '1/-1' }}>内容<input value={d.memo} onChange={up('memo')} placeholder={cat === '外注費' ? '例：保温 請負（10月出来高）' : '例：SUS配管 継手 追加購入'} /></label>
      <label>金額（税抜）<input value={d.amount} onChange={up('amount')} inputMode="numeric" placeholder="例：48000" /></label>
      <div className="docbox"><span className="small" style={{ fontWeight: 600 }}>証憑（請求書・納品書の写真やPDF）</span>{d.doc ? <div className="row" style={{ gap: 8 }}><span>📎 {d.doc}</span><button className="lnk small" onClick={() => setD({ ...d, doc: '' })}>外す</button></div> : <button className="btn btn-secondary btn-sm" onClick={() => setD({ ...d, doc: '請求書_' + (d.date || TODAY).replace(/-/g, '') + '.pdf' })}>ファイルを選ぶ／写真を撮る</button>}</div>
    </div>
    <p className="note">計上日は、請求書や納品書の日付など「原価として計上する日」。{cat === '外注費' ? '外注費はここで登録した金額が「外注支払」の請負金額に自動で集計されます（二重入力しない）。' : ''}</p></div>
    <div className="foot">{idx >= 0 && onDelete ? <button className="btn btn-danger" onClick={onDelete} style={{ marginRight: 'auto' }}>削除</button> : null}<button className="btn btn-secondary" onClick={onClose}>キャンセル</button><button className="btn btn-primary" onClick={save}>{idx >= 0 ? '保存' : '登録する'}</button></div>
  </Modal>;
}
