'use client';
/* =========================================================
   S-03 見積作成・編集 v0.1.4
   - 工種ごとのセクション（開閉できる）。各セクションの「＋ 明細を追加」から区分・品目を選ぶ
   - 版の切替・PDF・新しい版・提出は見出しの右に小さく
   - 受注はここではしない（与件詳細から）
   ========================================================= */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { VerBadge, ConfirmModal, useNa, useFlash, type ConfirmSpec } from '@/components/ui';
import { CustLabel } from '@/components/lead-modal';
import { ItemPickModal } from '@/components/estimate/item-pick-modal';
import { SubmitModal } from '@/components/estimate/submit-modal';
import { RateModal } from '@/components/estimate/rate-modal';
import { ROLES, contactOf, estTotals, lineCalc, groupsOf, prod, type EstTotals } from '@/lib/calc';
import { resolveEst, setLine, deleteLine, addGroup, addItems, newVersion, bulkDelete, moveLine, moveSection } from '@/lib/store';
import { num, yen, pct, fmtD, fmtDate, md } from '@/lib/format';
import type { EstLine, Product } from '@/lib/types';

type Drag = { kind: 'sec' | 'line'; v: string } | null;
type Drop = { kind: 'sec' | 'line'; key: string; after: boolean } | null;

/* 数量・原価・掛率の入力。モックの INPUT.ln と同じく、数値として読めるときだけ反映する（表示は入力中の文字をそのまま） */
function NumInput({ value, onCommit, ...rest }: { value: string; onCommit: (n: number) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [txt, setTxt] = useState(value);
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setTxt(value); }, [value]);
  return <input {...rest} value={txt} onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; setTxt(value); }}
    onChange={e => { setTxt(e.target.value); const val = e.target.value.replace(/[,，]/g, ''); const n = Number(val); if (isNaN(n) || val === '') return; onCommit(n); }} />;
}

function Totals({ t, cv }: { t: EstTotals; cv: boolean }) {
  const { ui } = useStore();
  return <dl className="totals"><dt>小計（税抜）</dt><dd className="num">{yen(t.sub)}</dd><dt>消費税（10%・合計に対して計算）</dt><dd className="num">{yen(t.tax)}</dd><dt><b style={{ color: 'var(--ink)' }}>合計（税込）</b></dt><dd className="big num">{yen(t.total)}</dd>
    {cv ? <><hr /><dt>原価合計{ROLES[ui.role].cost === 'kari' ? <> <span className="tag kari">仮</span></> : null}</dt><dd className="num">{yen(t.cost)}</dd><dt>粗利額</dt><dd className="num" style={{ color: 'var(--brand-800)', fontWeight: 700 }}>{yen(t.gross)}</dd><dt>粗利率</dt><dd className="big num" style={{ color: 'var(--brand-800)' }}>{pct(t.gp)}</dd></> : null}</dl>;
}

export default function EstimateEditPage() {
  const { s, ui, setUi, act, toast } = useStore();
  const { go, openProj } = useNav();
  const na = useNa();
  const sp = useSearchParams();
  const from = sp.get('from') || undefined;
  const r = resolveEst(s, { pid: sp.get('pid') || undefined, ei: Number(sp.get('ei')), v: Number(sp.get('v')) });

  /* 選択（版や見積が変わったら解除） */
  const estKey = r ? r.p.id + '|' + r.ei + '|' + r.v.v : '';
  const [selState, setSelState] = useState<{ k: string; set: Set<number> }>({ k: estKey, set: new Set() });
  const sel = selState.k === estKey ? selState.set : new Set<number>();
  const setSel = (f: (x: Set<number>) => void) => { const x = new Set(sel); f(x); setSelState({ k: estKey, set: x }); };
  const clearSel = () => setSelState({ k: estKey, set: new Set() });

  const [pick, setPick] = useState<string | null>(null);           // 明細追加モーダル（工種名）
  const [submit, setSubmit] = useState(false);
  const [rateT, setRateT] = useState<'sel' | 'all' | null>(null); // 掛率モーダル（最初の対象）
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [newSec, setNewSec] = useState('');
  const [flashId, setFlashId] = useState<string | null>(null);
  const clearFlash = useCallback(() => setFlashId(null), []);
  useFlash(flashId, clearFlash);

  /* 合計カードの点滅（明細を変えたとき） */
  const totalsRef = useRef<HTMLDivElement>(null); const prevKey = useRef<string | null>(null);
  const t = r ? estTotals(s, r.v.lines, r.c.rate) : null;
  useEffect(() => { const first = prevKey.current !== estKey; prevKey.current = estKey; if (first) return; const el = totalsRef.current; if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }, [t?.sub, t?.cost, estKey]);

  /* ドラッグ＆ドロップ */
  const dragRef = useRef<Drag>(null);
  const [dragging, setDragging] = useState<Drag>(null);
  const [drop, setDrop] = useState<Drop>(null);
  const focusAfter = useRef<string | null>(null);
  useEffect(() => { if (focusAfter.current) { const n = document.querySelector<HTMLElement>(focusAfter.current); focusAfter.current = null; if (n) n.focus(); } });

  if (!r || !t) return <div className="card"><div className="card-body muted">見積がありません</div></div>;
  const { p, e, ei, v, c } = r;
  const canEdit = ROLES[ui.role].edit, cv = ROLES[ui.role].cost !== 'hide';
  const ed = canEdit && v.state === '作成中'; // estEditable
  const groups = groupsOf(v);
  const exp = new Date(v.date + 'T00:00:00'); exp.setDate(exp.getDate() + 30);
  const internal = ui.s03mode !== '社外' && cv;
  const ct = contactOf(s, p);
  const unused = s.koshu.filter(k => !k.stopped && !groups.includes(k.name));
  const newSecVal = unused.some(k => k.name === newSec) ? newSec : (unused[0]?.name || '');
  const goVer = (nv: number) => go('S-03', { pid: p.id, ei, v: nv, from });

  /* ---- 操作 ---- */
  const secToggle = (g: string) => setUi({ estClosed: { ...ui.estClosed, [g]: !ui.estClosed[g] } });
  const secAll = (close: boolean) => { const o = { ...ui.estClosed }; groups.forEach(g => o[g] = close); setUi({ estClosed: o }); };
  const secAdd = () => { const g = newSecVal; if (!g) return; act(st => addGroup(st, v, g)); setPick(g); };
  const delLine = (i: number) => { const l = act(st => deleteLine(st, v, i)); clearSel(); toast((prod(s, l?.code)?.name || '') + ' の行を削除しました'); };
  const newVer = () => { const nv = act(st => newVersion(st, p.id, ei, v.v)); goVer(nv); toast('第' + v.v + '版をもとに第' + nv + '版を作りました'); };
  const pickAdd = (picks: Record<string, number>) => { const g = pick!; const idx = act(st => addItems(st, v, g, picks)); setUi({ estClosed: { ...ui.estClosed, [g]: false } }); setPick(null); setFlashId('ln-' + idx); toast(Object.keys(picks).length + '件を「' + g + '」に追加しました'); };
  const bulkDel = () => { const n = sel.size; const idx = new Set(sel);
    setConfirm({ title: n + '件の明細を削除しますか', body: <p style={{ margin: 0 }}>選んだ明細 {n}件を、この版から削除します。</p>, okLabel: '削除する', danger: true,
      onOk: () => { act(st => bulkDelete(st, v, idx)); clearSel(); toast(n + '件の明細を削除しました'); } }); };
  const doMoveLine = (fromI: number, to: number, g: string, after: boolean) => { const ni = act(st => moveLine(st, v, fromI, to, g, after)); clearSel(); return ni; };
  const doMoveSec = (g: string, target: string, after: boolean) => { act(st => moveSection(st, v, g, target, after)); clearSel(); };

  /* ドラッグ */
  const clearDrag = () => { dragRef.current = null; setDragging(null); setDrop(null); };
  const dragStart = (kind: 'sec' | 'line', val: string) => (ev: React.DragEvent<HTMLElement>) => {
    dragRef.current = { kind, v: val }; setDragging({ kind, v: val }); ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', val);
    const row = kind === 'sec' ? ev.currentTarget.closest('tbody') : ev.currentTarget.closest('tr'); if (row) { try { ev.dataTransfer.setDragImage(row, 20, 16); } catch { /* 対応していないブラウザ */ } }
  };
  const dragOver = (kind: 'sec' | 'line', key: string) => (ev: React.DragEvent<HTMLElement>) => {
    const d = dragRef.current; if (!d || d.kind !== kind) return; ev.preventDefault();
    const rc = ev.currentTarget.getBoundingClientRect(); const after = kind === 'sec' ? (ev.clientY > rc.top + Math.min(rc.height / 2, 40)) : (ev.clientY > rc.top + rc.height / 2);
    if (!drop || drop.kind !== kind || drop.key !== key || drop.after !== after) setDrop({ kind, key, after });
  };
  const onDrop = (kind: 'sec' | 'line', key: string, g?: string) => (ev: React.DragEvent<HTMLElement>) => {
    const d = dragRef.current; if (!d || d.kind !== kind) return; ev.preventDefault(); const after = !!(drop && drop.kind === kind && drop.key === key && drop.after);
    if (kind === 'sec') { if (key !== d.v) { doMoveSec(d.v, key, after); toast('「' + d.v + '」の順番を変えました'); } }
    else { const fromI = Number(d.v), to = Number(key); const g0 = v.lines[fromI]?.group;
      if (to !== fromI) { const ni = doMoveLine(fromI, to, g || '', after); setFlashId('ln-' + ni); if (g !== g0) toast('「' + g + '」へ移しました'); } }
    clearDrag();
  };
  const dropCls = (kind: 'sec' | 'line', key: string) => drop && drop.kind === kind && drop.key === key ? (drop.after ? 'drop-after' : 'drop-before') : '';
  /* キーボード：つまみにフォーカスして Alt+↑↓ */
  const handleKey = (kind: 'sec' | 'line', val: string) => (ev: React.KeyboardEvent<HTMLElement>) => {
    if (!ev.altKey || !['ArrowUp', 'ArrowDown'].includes(ev.key)) return; ev.preventDefault(); const up = ev.key === 'ArrowUp';
    if (kind === 'sec') { const k = groups.indexOf(val); const j = up ? k - 1 : k + 1; if (j < 0 || j >= groups.length) return; doMoveSec(val, groups[j], !up); focusAfter.current = `.drag-h[data-drag="sec"][data-v="${CSS.escape(val)}"]`; }
    else { const i = Number(val); const g = v.lines[i].group; const same = v.lines.map((_, k) => k).filter(k => v.lines[k].group === g); const pi = same.indexOf(i); const j = same[up ? pi - 1 : pi + 1]; if (j === undefined) return;
      const ni = doMoveLine(i, j, g, !up); focusAfter.current = `.drag-h[data-drag="line"][data-v="${ni}"]`; }
  };

  /* ---- 明細行 ---- */
  const lineRow = (l: EstLine, i: number) => {
    const k = lineCalc(s, l, c.rate); const pr: Partial<Product> = prod(s, l.code) || {};
    const over = l.rate !== null && l.rate !== undefined;
    const on = ed && sel.has(i);
    return <tr key={i} id={`ln-${i}`} className={`${on ? 'sel' : ''} ${dragging?.kind === 'line' && Number(dragging.v) === i ? 'dragging' : ''} ${dropCls('line', String(i))}`} onDragOver={dragOver('line', String(i))} onDrop={onDrop('line', String(i), l.group)}>
      <td className="selc nw">{ed ? <><span className="drag-h" draggable data-drag="line" data-v={i} tabIndex={0} role="button" aria-label={`${pr.name}を並べ替え（ドラッグ、またはAlt+↑↓）`} title="ドラッグで順番を変える（別の工種へも移せます）" onDragStart={dragStart('line', String(i))} onDragEnd={clearDrag} onKeyDown={handleKey('line', String(i))}>⋮⋮</span><input type="checkbox" checked={on} onChange={ev => setSel(x => { if (ev.target.checked) x.add(i); else x.delete(i); })} aria-label={`${pr.name}を選ぶ`} /></> : null}</td>
      <td><span className={`tag ${pr.cat === '材料' ? 'staff' : pr.cat === '労務' ? 'ext' : 'int'}`}>{pr.cat}</span></td>
      <td className="num small nw">{pr.code}</td><td className="nw"><b style={{ color: 'var(--ink)', fontWeight: 600 }}>{pr.name}</b>{pr.spec ? <div className="small muted">{pr.spec}</div> : null}</td>
      <td className="r"><NumInput className="n" value={String(l.qty)} onCommit={n => act(st => setLine(st, v, i, 'qty', n))} disabled={!ed} inputMode="decimal" aria-label="数量" /></td><td>{pr.unit}</td>
      <td className="r"><NumInput className="w" value={String(k.cost)} onCommit={n => act(st => setLine(st, v, i, 'cost', n))} disabled={!ed} inputMode="numeric" aria-label="原価単価" /></td>
      <td className="r"><NumInput className="n" value={(k.rate ?? c.rate).toFixed(2)} onCommit={n => act(st => setLine(st, v, i, 'rate', n))} disabled={!ed} inputMode="decimal" aria-label="掛率" style={over ? { color: 'var(--brand-700)', fontWeight: 700, borderColor: 'var(--brand-200)' } : undefined} /></td>
      <td className="r num" id={`ls-${i}`}>{num(k.sale)}</td><td className="r num" id={`la-${i}`}>{num(k.amount)}</td><td className="r num" id={`lg-${i}`}>{num(k.gross)}</td>
      <td>{ed ? <button className="icon-btn" onClick={() => delLine(i)} aria-label={`${pr.name}の行を削除`}>×</button> : null}</td></tr>;
  };

  /* ---- 工種セクション ---- */
  const sections = groups.map(g => {
    const gl = v.lines.map((l, i) => ({ l, i })).filter(x => x.l.group === g);
    const gt = estTotals(s, gl.map(x => x.l), c.rate); const closed = !!ui.estClosed[g];
    if (!internal) return <tr key={g}><td><b>{g}</b></td><td className="r">1</td><td>式</td><td className="r num">{num(gt.sub)}</td></tr>;
    const allOn = ed && gl.length > 0 && gl.every(x => sel.has(x.i));
    return <tbody key={g} className={`esec ${dragging?.kind === 'sec' && dragging.v === g ? 'dragging' : ''} ${dropCls('sec', g)}`} onDragOver={dragOver('sec', g)} onDrop={onDrop('sec', g)}>
      <tr className="sec-head"><td colSpan={12}><div className="sec-row">
        {ed ? <><span className="drag-h" draggable data-drag="sec" data-v={g} tabIndex={0} role="button" aria-label={`${g}を並べ替え（ドラッグ、またはAlt+↑↓）`} title="ドラッグで工種の順番を変える" onDragStart={dragStart('sec', g)} onDragEnd={clearDrag} onKeyDown={handleKey('sec', g)}>⋮⋮</span><input type="checkbox" checked={allOn} disabled={!gl.length} onChange={ev => setSel(x => { v.lines.forEach((l, i) => { if (l.group === g) { if (ev.target.checked) x.add(i); else x.delete(i); } }); })} aria-label={`${g}の明細をすべて選ぶ`} /></> : null}
        <button className="sec-toggle" onClick={() => secToggle(g)} aria-expanded={!closed}><span>{closed ? '▸' : '▾'}</span><b>{g}</b><span className="small muted">{gl.length}件</span></button>
        <span className="sec-sum">小計 <b className="num" id={`g-${g}`}>{num(gt.sub)}</b>　粗利 <span className="num" id={`gg-${g}`}>{num(gt.gross)}</span></span>
        {ed ? <button className="btn btn-soft btn-sm" onClick={() => setPick(g)}>＋ 明細を追加</button> : null}
      </div></td></tr>
      {closed ? null : (gl.length ? gl.map(({ l, i }) => lineRow(l, i))
        : <tr className={dropCls('line', '-1')} onDragOver={dragOver('line', '-1')} onDrop={onDrop('line', '-1', g)}><td colSpan={12} className="muted small" style={{ padding: '12px 20px' }}>明細がありません。「＋ 明細を追加」から品目を選んでください</td></tr>)}
    </tbody>;
  });

  return <>
    <div className="crumb">{from === 'S-13' ? <button className="lnk" onClick={() => go('S-13')}>見積一覧</button> : <><button className="lnk" onClick={() => go('S-12')}>与件一覧</button> ／ <button className="lnk" onClick={() => openProj(p)}>与件詳細</button></>} ／ 見積</div>
    <div className="page-head"><h1>見積 <span className="num">{e.no}</span></h1><span className="sid">S-03</span>
      <label className="fsel"><span className="fsel-l">版</span><select value={v.v} onChange={ev => goVer(Number(ev.target.value))} aria-label="版を切り替え">{e.versions.map(x => <option key={x.v} value={x.v}>第{x.v}版（{x.state}{x.sent ? '・' + md(x.sent.at) : ''}）</option>)}</select></label><VerBadge s={v.state} />
      <div className="acts">
        <button className="btn btn-secondary btn-sm" onClick={na}>PDF</button>
        {canEdit ? <><button className="btn btn-secondary btn-sm" onClick={newVer} disabled={!v.lines.length}>新しい版を作る</button>
          <button className="btn btn-primary btn-sm" onClick={() => setSubmit(true)} disabled={!(v.state === '作成中' && v.lines.length)}>提出する</button></> : null}
      </div></div>
    {v.sent ? <div className="hint" style={{ marginBottom: 12 }}>この版は {fmtD(v.sent.at)} に{v.sent.method === 'mail' ? <>メールで {v.sent.to} 宛に送付</> : '提出（メール以外）'}しました。直すときは「新しい版を作る」で次の版を作ります。</div>
      : (!ed && canEdit && v.state !== '作成中' ? <div className="hint" style={{ marginBottom: 12 }}>この版は「{v.state}」のため編集できません。直すときは「新しい版を作る」で次の版を作ります。</div> : null)}
    <div className="card est-info"><div className="card-body"><dl className="kv kv4">
      <dt>得意先</dt><dd><CustLabel unreg={c.unreg} name={p.custName || '（未入力）'} short={c.short} /></dd><dt>先方担当</dt><dd>{ct ? <>{ct.name}{ct.email ? <>　<span className="small muted">{ct.email}</span></> : null}</> : <span className="muted">未設定（与件詳細で入力）</span>}</dd>
      <dt>件名</dt><dd>{p.title}</dd><dt>当社担当</dt><dd>{p.staff}</dd>
      <dt>見積日</dt><dd>{fmtD(v.date)}</dd><dt>有効期限</dt><dd>{fmtD(fmtDate(exp))}</dd>
      {cv ? <><dt>掛率の初期値</dt><dd>{c.rate.toFixed(2)} <span className="small muted">（{c.unreg ? '得意先がマスタ未登録のため標準' : '得意先マスタ'}・見積作成時に固定）</span></dd></> : null}
    </dl></div></div>
    <div className="with-pane"><div className="card">
      <div className="card-head"><h2 className="section-label">明細</h2><span className="cs">工種ごとにまとめる。工種を押すと開閉</span>
        <div className="r">{ed && internal && v.lines.length ? <button className="btn btn-secondary btn-sm" onClick={() => setRateT(sel.size ? 'sel' : 'all')}>掛率を一括変更</button> : null}<button className="lnk small" onClick={() => secAll(false)}>すべて開く</button><button className="lnk small" onClick={() => secAll(true)}>すべて閉じる</button>
          <span className="seg">{cv ? <button onClick={() => setUi({ s03mode: '社内' })} aria-pressed={internal}>社内向け</button> : null}<button onClick={() => setUi({ s03mode: '社外' })} aria-pressed={!internal}>社外向け（一式）</button></span></div></div>
      {ed && internal && sel.size ? <div className="bulk" role="region" aria-label="選んだ明細の操作"><b>{sel.size}件を選択中</b>
        <button className="btn btn-secondary btn-sm" onClick={() => setRateT('sel')}>選んだ明細の掛率を変更</button>
        <button className="btn btn-danger btn-sm" onClick={bulkDel}>選んだ明細を削除</button>
        <button className="lnk small" onClick={clearSel}>選択を解除</button></div> : null}
      <div className="tbl"><table id="estTable" className="est">
        {internal ? <><thead><tr><th className="selc">{ed && v.lines.length ? <input type="checkbox" checked={sel.size === v.lines.length} onChange={ev => setSel(x => { x.clear(); if (ev.target.checked) v.lines.forEach((_, i) => x.add(i)); })} aria-label="すべての明細を選ぶ" /> : null}</th><th>区分</th><th>品番</th><th>品名／規格</th><th className="r">数量</th><th>単位</th><th className="r">原価単価</th><th className="r">掛率</th><th className="r">販売単価</th><th className="r">金額</th><th className="r">粗利</th><th></th></tr></thead>
          {sections.length ? sections : <tbody><tr><td colSpan={12} className="muted" style={{ padding: 24, textAlign: 'center' }}>工種を追加して、明細を入れてください</td></tr></tbody>}</>
          : <><thead><tr><th>工種</th><th className="r">数量</th><th>単位</th><th className="r">金額</th></tr></thead><tbody>{sections}</tbody></>}
      </table></div>
      {internal && ed ? <div className="card-body add-sec">{unused.length ? <><label className="fsel"><span className="fsel-l">工種</span><select id="newSec" value={newSecVal} onChange={ev => setNewSec(ev.target.value)}>{unused.map(k => <option key={k.code}>{k.name}</option>)}</select></label><button className="btn btn-secondary btn-sm" onClick={secAdd}>＋ 工種を追加</button></> : <span className="small muted">工種マスタの工種はすべて使っています</span>}<span className="small muted">工種は<button className="lnk" onClick={() => go('S-10', { tab: '工種' })}>工種マスタ</button>で増やせます</span></div> : null}
      {internal ? <p className="note" style={{ padding: '0 16px 12px' }}>販売単価＝原価単価×掛率（円未満四捨五入）。掛率は明細ごとに上書きできます【仮：Q2】。区分は 材料／労務／法定福利費／経費。受注時に 法定福利費は「経費」として実行予算に入ります。</p> : null}
    </div>
    <div className="pane-sticky">
      <div className="card"><div className="card-head"><h2 className="section-label">合計</h2><span className="cs">第{v.v}版</span></div><div className="card-body" id="estTotals" ref={totalsRef}><Totals t={t} cv={cv} /></div></div>
      <div className="card"><div className="card-head"><h2 className="section-label">類似見積（検討中）</h2><span className="cs">A-08</span></div><div className="card-body"><div className="placeholder">過去の類似見積の候補をここに出す案。<br />モックに入れるかは検討中です。</div></div></div>
    </div></div>
    {pick !== null ? <ItemPickModal group={pick} onClose={() => setPick(null)} onAdd={pickAdd} /> : null}
    {submit ? <SubmitModal p={p} e={e} v={v} onClose={() => setSubmit(false)} /> : null}
    {rateT ? <RateModal pid={p.id} e={e} ei={ei} v={v} custRate={c.rate} sel={sel} initialTarget={rateT} onClose={() => setRateT(null)} /> : null}
    {confirm ? <ConfirmModal spec={confirm} onClose={() => setConfirm(null)} /> : null}
  </>;
}
