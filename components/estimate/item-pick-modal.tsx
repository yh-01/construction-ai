'use client';
/* S-03 明細の追加（区分→品目を選ぶ）モーダル。モックの MODALS.itemPick をそのまま */
import React, { useState } from 'react';
import { Modal, IconSearch } from '@/components/ui';
import { useStore } from '@/lib/store-context';
import { searchProducts } from '@/lib/calc';
import { num } from '@/lib/format';
import type { ProductCat } from '@/lib/types';

const CATS: ProductCat[] = ['材料', '労務', '法定福利費', '経費'];

export function ItemPickModal({ group, onClose, onAdd }: { group: string; onClose: () => void; onAdd: (picks: Record<string, number>) => void }) {
  const { s } = useStore();
  const [cat, setCat] = useState<string>('');
  const [q, setQ] = useState('');
  const [pick, setPick] = useState<Record<string, number>>({});
  const list = searchProducts(s, q).filter(p => !cat || p.cat === cat);
  const n = Object.keys(pick).length;
  const toggle = (code: string) => setPick(pk => { const x = { ...pk }; if (x[code] !== undefined) delete x[code]; else x[code] = 1; return x; });
  return <Modal size="wide" onClose={onClose}>
    <div className="card-head"><h2 className="section-label">「{group}」に明細を追加</h2><span className="cs">区分で絞って、品目を選ぶ（複数可）</span></div>
    <div className="card-body stack" style={{ gap: 10 }}>
      <div className="seg" role="group" aria-label="区分">{['', ...CATS].map(x => <button key={x} onClick={() => setCat(x)} aria-pressed={cat === x}>{x || 'すべて'}</button>)}</div>
      <label className="kw"><IconSearch /><input id="pick-q" value={q} onChange={e => setQ(e.target.value)} placeholder="品名・先方での呼び名・品番で検索（例：ステン管50、L50）" aria-label="品目を検索" /></label>
      <div className="tbl pick-list"><table><thead><tr><th></th><th>区分</th><th>品番</th><th>品名／規格</th><th>先方での呼び名</th><th className="r">原価</th><th>単位</th><th className="r">数量</th></tr></thead><tbody>
        {list.length ? list.map(p => { const on = pick[p.code] !== undefined;
          return <tr key={p.code} className={`click ${on ? 'sel' : ''}`} onClick={e => { if ((e.target as HTMLElement).matches('input.n')) return; toggle(p.code); }}>
            <td><input type="checkbox" checked={on} readOnly tabIndex={-1} aria-label={`${p.name}を選ぶ`} /></td><td>{p.cat}</td><td className="num small">{p.code}</td>
            <td><b style={{ color: 'var(--ink)', fontWeight: 600 }}>{p.name}</b> <span className="small muted">{p.spec}</span></td><td className="small">{p.alias}</td>
            <td className="r num">{p.cat === '法定福利費' ? '－' : num(p.cost)}</td><td>{p.unit}</td>
            <td className="r">{on ? <input className="n" defaultValue={pick[p.code]} inputMode="decimal" aria-label="数量" onChange={e => { const v = Number(e.target.value); if (v > 0) setPick(pk => ({ ...pk, [p.code]: v })); }} /> : null}</td></tr>; })
          : <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 18 }}>該当する品目がありません</td></tr>}
      </tbody></table></div></div>
    <div className="foot"><span className="small muted" style={{ marginRight: 'auto', alignSelf: 'center' }}>{n}件を選択中</span><button className="btn btn-secondary" onClick={onClose}>キャンセル</button><button className="btn btn-primary" disabled={!n} onClick={() => onAdd(pick)}>{n}件を追加</button></div>
  </Modal>;
}
