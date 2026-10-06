'use client';
/* S-04 受注モーダル（与件詳細・見積作成から開く）。得意先マスタの「選ぶ」「追加」のサブ画面を含む */
import React, { useState } from 'react';
import { Modal, VerBadge } from './ui';
import { useStore } from '@/lib/store-context';
import { useNav } from './shell';
import { projById, projByNo, cust, orderables, latestVer, custSuggest, persons, estTotals, budgetRows } from '@/lib/calc';
import { confirmOrder, addCustomerQuick, nextNo } from '@/lib/store';
import { DIVS, DEFAULT_RATE } from '@/lib/data';
import { md, yen, pct, norm } from '@/lib/format';
import type { Project, Div } from '@/lib/types';

type Sub = null | 'pick' | 'add';

export function OrderModal({ pid, ei, v, onClose }: { pid: string; ei?: number; v?: number; onClose: () => void }) {
  const { s, act, setUi, toast } = useStore();
  const { go } = useNav();
  const p = projById(s, pid)!;
  const list = orderables(p);
  const [checked, setChecked] = useState<Record<number, number>>(() => {
    const c: Record<number, number> = {};
    if (ei !== undefined && v !== undefined) c[ei] = v;
    else { const lv = latestVer(p); if (lv && lv.v.lines.length) c[lv.ei] = lv.v.v; else if (list.length) { const x = list[list.length - 1]; c[x.ei] = x.v.v; } }
    return c;
  });
  const [custId, setCustId] = useState<string | null>(p.cust || null);
  const [modeSt, setMode] = useState<'new' | 'branch'>('new');
  const [targetSt, setTarget] = useState<string | null>(null);
  const [sub, setSub] = useState<Sub>(null);
  const [cq, setCq] = useState('');

  if (sub === 'pick') return <Modal onClose={onClose}><CustPick p={p} q={cq} setQ={setCq} onBack={() => setSub(null)} onPick={id => { setCustId(id); setSub(null); }} onAdd={() => { setSub('add'); setCq(''); }} /></Modal>;
  if (sub === 'add') return <Modal onClose={onClose}><CustAdd p={p} onBack={() => setSub(null)} onSaved={id => { setCustId(id); setSub(null); }} /></Modal>;

  const sel = list.filter(x => checked[x.ei] === x.v.v);
  const c = custId ? cust(s, custId) || null : null;
  const sug = !c ? custSuggest(s, p.custName) : null;
  const targets = c ? s.projects.filter(x => x.no && x.cust === c.id && (x.status === '受注' || x.status === '施工中')) : [];
  const mode: 'new' | 'branch' = modeSt === 'branch' && !targets.length ? 'new' : modeSt;
  const target = mode === 'branch' && !targets.some(t => t.no === targetSt) ? targets[0].no : targetSt;
  const tp = projByNo(s, target);
  const brNo = tp ? tp.no + '-' + String((tp.branches || []).length + 1).padStart(2, '0') : '';
  let subTotal = 0, cost = 0; const by = {} as Record<Div, number>; DIVS.forEach(d => by[d] = 0);
  sel.forEach(x => { const t = estTotals(s, x.v.lines, x.e.rate); subTotal += t.sub; cost += t.cost; budgetRows(s, x.v.lines, x.e.rate).forEach(r => by[r.div] += r.init); });
  const rateDiff = c && sel.some(x => Math.abs(x.e.rate - c.rate) > 0.001);
  const ready = sel.length && c;
  const why = !sel.length ? '受注する見積を選んでください' : !c ? '得意先をマスタから選んでください（必須）' : '';

  const confirm = () => {
    if (!ready || !c) return;
    const r = act(st => confirmOrder(st, pid, checked, c.id, mode, target));
    if (!r) return;
    onClose();
    setUi({ s05tab: '予実対比' });
    go('S-05', { id: r.projectId });
    if (!r.branch) toast('工事番号 ' + r.no + ' を採番しました。実行予算は見積の原価から作った「下書き」です。見直して確定してください');
    else toast(r.no + ' として追加し、' + (r.draft ? '下書きの予算に加算しました' : '変更予算に加算しました（履歴に残ります）'));
  };

  return <Modal onClose={onClose}>
    <div className="card-head"><h2 className="section-label">受注</h2><span className="cs">S-04　{p.id}　{p.title}</span></div>
    <div className="card-body stack">
      <div><div className="step">1. 受注する見積<span className="small muted">（同じ見積番号の中では1つの版だけ。最新の版が選ばれた状態で開きます）</span></div><div className="stack" style={{ gap: 6 }}>
        {list.map(x => { const t = estTotals(s, x.v.lines, x.e.rate); const on = checked[x.ei] === x.v.v;
          return <label key={x.ei + '-' + x.v.v} className="opt"><input type="checkbox" checked={on} onChange={e => setChecked(prev => { const n = { ...prev }; if (e.target.checked) n[x.ei] = x.v.v; else delete n[x.ei]; return n; })} /><span><b className="num">{x.e.no}</b> 第{x.v.v}版 <VerBadge s={x.v.state} /><small>{md(x.v.date)}　税抜 {yen(t.sub)}　粗利率 {pct(t.gp)}</small></span></label>; })}</div></div>
      <div><div className="step">2. 得意先（マスタから選ぶ・必須）</div>
        <div className="small muted" style={{ marginBottom: 6 }}>与件時点の名称：<b style={{ color: 'var(--ink)' }}>{p.custName || '（未入力）'}</b></div>
        {c ? <>
          <div className="opt" style={{ cursor: 'default', borderColor: 'var(--brand-600)', background: 'var(--brand-50)' }}><span style={{ flex: 1 }}><b>{c.name}</b> <span className="tag staff">マスタ</span><small>{persons(c)}　{c.tel}　掛率 {c.rate.toFixed(2)}</small></span><button className="btn btn-secondary btn-sm" onClick={() => { setSub('pick'); setCq(''); }}>変更</button></div>
          {rateDiff ? <p className="note" style={{ margin: '6px 0 0' }}>見積は作成時の掛率（{sel.map(x => x.e.rate.toFixed(2)).join('・')}）のまま受注します。得意先マスタの掛率（{c.rate.toFixed(2)}）は次に作る見積から使われます。</p> : null}
        </> : <>
          <div className="hint" style={{ borderColor: '#F1C4BE', background: 'var(--ng-bg)', color: 'var(--ng-tx)' }}>得意先がまだマスタにひもづいていません。受注には得意先マスタの選択が必要です。</div>
          <div className="row" style={{ marginTop: 8 }}>{sug ? <><span className="small">候補：<b>{sug.name}</b></span><button className="btn btn-soft btn-sm" onClick={() => { setCustId(sug.id); toast('得意先を「' + sug.name + '」にしました'); }}>これにする</button></> : null}<button className="btn btn-secondary btn-sm" onClick={() => { setSub('pick'); setCq(''); }}>マスタから選ぶ</button><button className="btn btn-secondary btn-sm" onClick={() => { setSub('add'); setCq(''); }}>＋ マスタに追加</button></div>
        </>}
      </div>
      <div><div className="step">3. 工事の種類</div><div className="stack" style={{ gap: 6 }}>
        <label className="opt"><input type="radio" name="ordm" value="new" checked={mode === 'new'} onChange={() => setMode('new')} /><span>新規工事<small>新しい工事番号を採番する</small></span></label>
        <label className="opt"><input type="radio" name="ordm" value="branch" checked={mode === 'branch'} onChange={() => setMode('branch')} disabled={!targets.length} /><span>既存工事への追加（枝番）<small>{targets.length ? '同じ得意先の工事に枝番で追加し、変更予算に加算する' : c ? 'この得意先の受注・施工中の工事がありません' : '得意先を選ぶと選べます'}</small>
          {mode === 'branch' ? <select value={target || ''} onChange={e => setTarget(e.target.value)} style={{ marginTop: 6 }}>{targets.map(x => <option key={x.no!} value={x.no!}>{x.no} {x.title}</option>)}</select> : null}</span></label></div></div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', background: 'var(--brand-50)', border: '1px solid var(--brand-200)', borderRadius: 8, padding: '10px 14px' }}>
        <div><div className="small muted" style={{ fontWeight: 600 }}>4. 採番される工事番号</div><div className="bignum">{mode === 'new' ? nextNo(s) : brNo}</div></div>
        <div className="small muted" style={{ flex: 1, minWidth: 180 }}>【仮】採番ルールはヒアリングで決めます（例：2026-0123、追加なら 2026-0123-01）</div></div>
      <div><div className="step">5. 確定すると作られるもの</div>
        <table><thead><tr><th>{mode === 'new' ? '実行予算（当初予算の下書き）' : '変更予算に加算'}</th><th className="r">金額</th></tr></thead><tbody>
          {DIVS.map(d => <tr key={d}><td>{d}{d === '外注費' ? <> <span className="small muted">（見積からは入らない。台帳で手入力）</span></> : null}{d === '経費' ? <> <span className="small muted">（法定福利費を含む）</span></> : null}</td><td className="r num">{yen(by[d])}</td></tr>)}
        </tbody><tfoot><tr><td>計（見積の原価合計）</td><td className="r num">{yen(cost)}</td></tr><tr><td>受注額（税抜）</td><td className="r num">{yen(subTotal)}</td></tr></tfoot></table></div>
    </div>
    <div className="foot">{why ? <span className="small" style={{ color: 'var(--ng-tx)', marginRight: 'auto', alignSelf: 'center' }}>{why}</span> : null}<button className="btn btn-secondary" onClick={onClose}>キャンセル</button><button className="btn btn-primary" onClick={confirm} disabled={!ready}>受注を確定する</button></div>
  </Modal>;
}

/* 得意先マスタから選ぶ */
function CustPick({ p, q, setQ, onBack, onPick, onAdd }: { p: Project; q: string; setQ: (v: string) => void; onBack: () => void; onPick: (id: string) => void; onAdd: () => void }) {
  const { s } = useStore();
  const list = s.customers.filter(c => !c.stopped).filter(c => !q || norm(c.name + c.short + persons(c) + c.tel).includes(norm(q)));
  return <>
    <div className="card-head"><button className="lnk" onClick={onBack}>← 受注に戻る</button><h2 className="section-label">得意先マスタから選ぶ</h2></div>
    <div className="card-body stack" style={{ gap: 10 }}>
      <div className="small muted">与件時点の名称：<b style={{ color: 'var(--ink)' }}>{p.custName || ''}</b></div>
      <input id="ord-cq" value={q} onChange={e => setQ(e.target.value)} placeholder="名称・担当・連絡先で検索" aria-label="得意先を検索" />
      <div className="tbl" style={{ border: '1px solid var(--line)', borderRadius: 8 }}><table><thead><tr><th>名称</th><th>担当</th><th>連絡先</th><th className="r">掛率</th><th></th></tr></thead><tbody>
        {list.length ? list.map(c => <tr key={c.id}><td><b style={{ color: 'var(--ink)' }}>{c.name}</b></td><td className="small">{persons(c)}</td><td className="num small">{c.tel}</td><td className="r num">{c.rate.toFixed(2)}</td><td><button className="btn btn-soft btn-sm" onClick={() => onPick(c.id)}>選ぶ</button></td></tr>)
          : <tr><td colSpan={5} className="muted">該当なし。下の「マスタに追加」から登録してください</td></tr>}
      </tbody></table></div>
      <div><button className="btn btn-secondary btn-md" onClick={onAdd}>＋ 見つからないのでマスタに追加</button></div></div>
  </>;
}

/* 得意先マスタに追加 */
function CustAdd({ p, onBack, onSaved }: { p: Project; onBack: () => void; onSaved: (id: string) => void }) {
  const { act, toast } = useStore();
  const base = (p.custName || '').replace(/（仮）/g, '').trim();
  const [f, setF] = useState({ name: base.split(' ')[0] + '株式会社', short: base.split(' ')[0], person: (p.contact || {}).name || '', tel: (p.contact || {}).tel || '', rate: DEFAULT_RATE.toFixed(2) });
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const save = () => {
    const name = f.name.trim(); if (!name) { toast('名称を入れてください'); return; }
    const c = act(st => addCustomerQuick(st, { name, short: f.short.trim(), person: f.person.trim(), tel: f.tel.trim(), rate: f.rate.trim(), email: (p.contact || {}).email || '' }));
    toast('得意先マスタに「' + name + '」を追加しました'); onSaved(c.id);
  };
  return <>
    <div className="card-head"><button className="lnk" onClick={onBack}>← 受注に戻る</button><h2 className="section-label">得意先マスタに追加</h2></div>
    <div className="card-body"><div className="form">
      <label>名称（正式名）<input value={f.name} onChange={up('name')} /></label>
      <label>略称<input value={f.short} onChange={up('short')} /></label>
      <label>担当者名<input value={f.person} onChange={up('person')} /></label>
      <label>電話番号<input value={f.tel} onChange={up('tel')} /></label>
      <label>掛率【仮】<input className="n" style={{ width: '100%' }} value={f.rate} onChange={up('rate')} inputMode="decimal" /></label></div>
      <p className="note">登録するとそのまま受注の画面に戻り、この得意先が選ばれた状態になります。</p></div>
    <div className="foot"><button className="btn btn-secondary" onClick={onBack}>キャンセル</button><button className="btn btn-primary" onClick={save}>登録して選ぶ</button></div>
  </>;
}
