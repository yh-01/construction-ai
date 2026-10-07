'use client';
/* S-05 原価の明細タブ：入れる・探す（検索は上、一覧は下） */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { TableCount, EmptyRow, ConfirmModal, useNa, type ConfirmSpec } from '@/components/ui';
import { FilterBar, useFilter, useSort } from '@/components/filter';
import { CostModal, COST_CATS } from './cost-modal';
import { ROLES, costVendorName } from '@/lib/calc';
import { deleteCost } from '@/lib/store';
import type { Project, Cost, Div } from '@/lib/types';
import { NOGRP } from '@/lib/data';
import { md, yen, num, uniq } from '@/lib/format';

export function CostList({ p, setTab }: { p: Project; setTab: (t: string) => void }) {
  const { s, ui, act, toast } = useStore();
  const na = useNa();
  const K = 'cost-' + p.no; const F = useFilter(K); const { sortBy, Th } = useSort(K);
  const all: Cost[] = s.costs[p.no!] || []; const ed = ROLES[ui.role].edit;
  const [modal, setModal] = useState<number | null>(null); // -1=登録、0以上=編集中の明細の番号
  /* 「＋ 実績を登録」：フィルター中の区分・工種を初期値にする */
  const fc = F.fv('cat') as Div, fg = F.fv('grp');
  const init = { cat: COST_CATS.includes(fc) ? fc : '材料費' as Div, group: fg && fg !== NOGRP ? fg : '' };
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const list = all.filter(c => F.fText('kw', costVendorName(s, c), c.memo, c.group) && F.fSel('cat', c.cat) && F.fSel('grp', c.group || NOGRP) && F.fSel('ven', costVendorName(s, c)) && (!F.fv('mon') || c.date.slice(0, 7) === F.fv('mon')) && F.fSel('doc', c.doc ? 'あり' : 'なし'));
  const rows = sortBy(list, { date: c => c.date, cat: c => c.cat, grp: c => c.group || '', vendor: c => costVendorName(s, c), amt: c => c.amount }, { k: 'date', dir: -1 });
  const sum = list.reduce((t, c) => t + c.amount, 0);
  const costDel = (i: number) => {
    const c = all[i]; setModal(null);
    setConfirm({ title: '実績を削除しますか', body: <p style={{ margin: 0 }}>{md(c.date)} {costVendorName(s, c)}「{c.memo}」{num(c.amount)}円 を削除します。</p>, okLabel: '削除する', danger: true,
      onOk: () => { act(st => deleteCost(st, p.no!, i)); toast('実績を削除しました'); } });
  };
  return <>
    {ui.costFrom ? <div className="hint" style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>予実対比の「{ui.costFrom}」の明細です。<button className="lnk" onClick={() => setTab('予実対比')}>← 予実対比に戻る</button></div> : null}
    <div className="card"><FilterBar keyName={K} cfg={{ kw: '取引先・内容・工種で検索', quick: [{ k: 'cat', label: '区分', type: 'select', opts: COST_CATS }, { k: 'grp', label: '工種', type: 'select', opts: uniq([...all.map(c => c.group || NOGRP)]) }, { k: 'ven', label: '取引先', type: 'select', opts: uniq(all.map(c => costVendorName(s, c))) }, { k: 'mon', label: '計上月', type: 'month' }, { k: 'doc', label: '証憑', type: 'select', opts: [['あり', '添付あり'], ['なし', '添付なし']] }] }} />
      <div className="card-head"><TableCount n={list.length} total={all.length} unit="件" /><span className="cs">材料費・外注費・経費（手入力）。労務費は打刻から自動（人工タブ）　合計 <b className="num" style={{ color: 'var(--ink)' }}>{yen(sum)}</b></span>{ed ? <div className="r"><button className="btn btn-primary btn-sm" onClick={() => setModal(-1)}>＋ 実績を登録</button></div> : null}</div>
      <div className="tbl"><table><thead><tr><Th k="date" label="計上日" /><Th k="cat" label="区分" /><Th k="grp" label="工種" /><Th k="vendor" label="取引先" /><th>内容</th><Th k="amt" label="金額（税抜）" cls="r" /><th>証憑</th>{ed ? <th></th> : null}</tr></thead><tbody>
        {rows.length ? rows.map(c => { const i = all.indexOf(c); return <tr key={i}><td className="nw num">{md(c.date)}</td><td><span className={`tag ${c.cat === '材料費' ? 'staff' : c.cat === '外注費' || c.cat === '労務費' ? 'ext' : 'int'}`}>{c.cat}</span></td><td className="nw small">{c.group ? c.group : <span className="muted">工種なし</span>}</td>
          <td className="nw small">{costVendorName(s, c)}{c.vid ? <> <span className="tag ext" title="協力会社マスタ。外注支払に集計されます">協力会社</span></> : null}</td><td>{c.memo}</td><td className="r num">{num(c.amount)}</td>
          <td className="small">{c.doc ? <button className="lnk" onClick={na} title={c.doc}>📎 {c.doc.length > 14 ? c.doc.slice(0, 13) + '…' : c.doc}</button> : <span className="muted">－</span>}</td>
          {ed ? <td className="nw"><button className="btn btn-secondary btn-sm" onClick={() => setModal(i)}>編集</button></td> : null}</tr>; }) : <EmptyRow cols={ed ? 8 : 7} onClear={F.clear} />}</tbody>
        {list.length ? <tfoot><tr><td colSpan={5}>合計（{list.length}件）</td><td className="r num">{num(sum)}</td><td colSpan={ed ? 2 : 1}></td></tr></tfoot> : null}</table></div>
      <p className="note" style={{ padding: '0 16px 12px' }}>取引先は必須（外注支払の集計、請求書との突合、インボイスの判定に使う）。工種は任意（1枚の請求書に複数の工種が混ざるとき、無理に分けなくてよい）。外注費は協力会社マスタから選び、外注支払の請負金額に自動で集計されます。</p></div>
    {modal !== null ? <CostModal p={p} idx={modal} init={modal < 0 ? init : undefined} onClose={() => setModal(null)} onDelete={modal >= 0 ? () => costDel(modal) : undefined} /> : null}
    {confirm ? <ConfirmModal spec={confirm} onClose={() => setConfirm(null)} /> : null}
  </>;
}
