'use client';
/* S-02 与件詳細 */
import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { PageHead, StatusBadge, VerBadge, Modal, ConfirmModal, MoreMenu, useNa, useFlash, type ConfirmSpec, type MenuItem } from '@/components/ui';
import { MemoSVG, BigMemoSVG } from '@/components/svgs';
import { OrderModal } from '@/components/order-modal';
import { ROLES, projById, custOf, contactOf, cust, estTotals } from '@/lib/calc';
import { leadInfoInit, saveLeadInfo, saveSummary, lose, unlose, deleteLead, photoOnly, photoApply, createEst, type LeadInfoForm } from '@/lib/store';
import { PRE, STAFFS, TODAY } from '@/lib/data';
import { md, yen, fmtD } from '@/lib/format';
import type { Project, Summary } from '@/lib/types';

type SumKey = Exclude<keyof Summary, 'ocr'>;
const SUM_FIELDS: [SumKey, string][] = [['equip', '対象設備'], ['work', '工事内容'], ['period', '希望工期'], ['cond', '現地条件'], ['due', '見積期限（メモ上）'], ['note', 'その他']];

/* 文字認識の結果（イメージ）：[項目キー, 項目名, 認識した内容, 確度] */
const OCR_RESULT: [SumKey, string, string, number][] = [
  ['equip', '対象設備', '第2工場 ボイラー給水配管', 0.96],
  ['work', '工事内容', '既設 SGP 40A → SUS 40A Sch10S に更新 約60m、仕切弁 40A 6台 交換', 0.72],
  ['period', '希望工期', '11/21（土）〜11/23（月・祝）の停止期間内', 0.91],
  ['cond', '現地条件', '高さ3.5m、ローリング足場で可。火気使用届 要', 0.74],
  ['due', '見積期限', '10/16（金）', 0.97],
  ['note', 'その他', '既設配管図は先方から後日送付', 0.58],
];

export default function LeadDetailPage() {
  const { s, ui, act, setUi, toast } = useStore();
  const { go } = useNav();
  const sp = useSearchParams();
  const na = useNa();
  const canEdit = ROLES[ui.role].edit;
  const p = projById(s, sp.get('id')) || s.projects[0];
  const [edit, setEdit] = useState<'info' | 'sum' | null>(null);
  const [ld, setLd] = useState<LeadInfoForm | null>(null);
  const [sumF, setSumF] = useState<Summary>({});
  const [photo, setPhoto] = useState<{ step: 1 | 2; src: string } | null>(sp.get('photo') === '1' ? { step: 1, src: '' } : null);
  const [order, setOrder] = useState(sp.get('order') === '1');
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const clearFlash = useCallback(() => setFlash(null), []);
  useFlash(flash, clearFlash);
  const toggleMenu = useCallback(() => setMenu(m => !m), []);
  if (!p) return null;

  const c = custOf(s, p);
  const ests: { e: Project['estimates'][number]; ei: number; v: Project['estimates'][number]['versions'][number] }[] = [];
  p.estimates.forEach((e, ei) => e.versions.forEach(v => ests.push({ e, ei, v })));
  const ed = canEdit && PRE.includes(p.status);
  const hasEst = p.estimates.some(e => e.versions.some(v => v.lines.length));
  const sm = p.summary;
  const editInfo = edit === 'info', editSum = edit === 'sum';
  const ct = contactOf(s, p);

  const editOn = (k: 'info' | 'sum') => { if (k === 'info') setLd(leadInfoInit(p)); else { const o: Summary = {}; SUM_FIELDS.forEach(([key]) => o[key] = (sm || {})[key] || ''); setSumF(o); } setEdit(k); };
  const saveInfo = () => { if (!ld) return; act(st => saveLeadInfo(st, p.id, ld)); setEdit(null); setLd(null); toast('与件情報を保存しました'); };
  const saveSum = () => { act(st => saveSummary(st, p.id, sumF)); setEdit(null); toast('与件の概要を保存しました'); };
  const doLose = () => { act(st => lose(st, p.id)); toast('失注にしました。与件一覧の「失注」で見られます'); };
  const doUnlose = () => { act(st => unlose(st, p.id)); toast('与件に戻しました'); };
  const delLead = () => setConfirm({ title: '与件を削除しますか', danger: true, okLabel: '削除する',
    body: <><p style={{ margin: 0 }}>「{p.title}」（{p.id}）と、ひもづく見積 {p.estimates.length}件・メモ写真 {p.memos}枚を削除します。元に戻せません。</p><p className="note">間違って登録したときだけ使います。お客様に断られた場合は「失注にする」を使ってください（履歴が残ります）。</p></>,
    onOk: () => { const id = p.id; act(st => deleteLead(st, id)); go('S-12'); toast('与件 ' + id + ' を削除しました'); } });
  const newEst = () => { const ref = act(st => createEst(st, p.id)); go('S-03', { ...ref, from: 'S-12' }); toast('見積を作成しました。工種を追加して明細を入れてください'); };
  const openProj = () => { setUi({ s05tab: '概要' }); go('S-05', { id: p.id }); };

  const menuItems: MenuItem[] = ed
    ? [{ label: '失注にする', onClick: doLose }, { label: '与件を削除', onClick: delLead, danger: true, note: '間違って登録したとき' }]
    : [{ label: '与件を削除', onClick: delLead, danger: true, note: '間違って登録したとき' }];

  const custView = c.unreg
    ? <>{p.custName || '（未入力）'} <span className="tag kari">マスタ未登録</span><div className="small muted">受注するときに得意先マスタから選びます（今選んでもよい）</div></>
    : <>{c.name} <span className="tag staff">マスタ</span>{p.custName && p.custName !== c.name ? <div className="small muted">与件時点の名称：{p.custName}</div> : null}</>;
  const ctView = ct
    ? <>{ct.name}{ct.dept ? <> <span className="small muted">{ct.dept}</span></> : null}<div className="small">{ct.email ? <span className="num">{ct.email}</span> : <span className="muted">メールなし</span>}　{ct.tel ? <span className="num">{ct.tel}</span> : null}</div></>
    : <span className="muted">未入力（入れると見積をメールで送れます）</span>;

  const info = editInfo && ld
    ? <><LeadForm d={ld} setD={setLd} /><div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}><button className="btn btn-secondary btn-md" onClick={() => setEdit(null)}>キャンセル</button><button className="btn btn-primary btn-md" onClick={saveInfo}>保存</button></div></>
    : <dl className="kv"><dt>得意先</dt><dd>{custView}</dd><dt>先方担当者</dt><dd>{ctView}</dd><dt>件名</dt><dd>{p.title}</dd><dt>依頼日</dt><dd>{fmtD(p.reqDate)}</dd><dt>当社担当</dt><dd>{p.staff}</dd><dt>現場</dt><dd>{p.site}</dd>
      <dt>見積作成期限</dt><dd>{fmtD(p.estDue)}</dd><dt>有効期限</dt><dd>{fmtD(p.expire)}{p.expire && p.expire < TODAY && PRE.includes(p.status) ? <> <span className="warnline" style={{ display: 'inline' }}>期限切れ</span></> : null}</dd></dl>;

  const summary = editSum
    ? <><div className="stack" style={{ gap: 8 }}>{SUM_FIELDS.map(([k, l]) => <label key={k} className="fld">{l}<textarea id={`es-${k}`} rows={2} value={sumF[k] || ''} onChange={e => setSumF({ ...sumF, [k]: e.target.value })} /></label>)}</div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}><button className="btn btn-secondary btn-md" onClick={() => setEdit(null)}>キャンセル</button><button className="btn btn-primary btn-md" onClick={saveSum}>保存</button></div></>
    : (sm ? <dl className="kv">{SUM_FIELDS.map(([k, l]) => <React.Fragment key={k}><dt>{l}</dt><dd>{sm[k] || '－'}</dd></React.Fragment>)}</dl>
      : <div className="placeholder">まだ整理されていません。{ed ? '「編集」で入力するか、打ち合わせメモの写真を取り込むと文字認識で下書きを作れます（イメージ）。' : ''}</div>);

  return <>
    <div className="crumb"><button className="lnk" onClick={() => go('S-12')}>与件一覧</button> ／ 与件詳細</div>
    <PageHead id="S-02" title={p.title} sub={<><StatusBadge s={p.status} /> <span className="num">{p.id}</span>{p.no ? <> → 工事番号 <button className="lnk num" onClick={openProj}>{p.no}</button></> : null}</>}
      acts={ed ? <><MoreMenu items={menuItems} open={menu} onToggle={toggleMenu} /><button className="btn btn-secondary btn-md" onClick={newEst}>見積を作成</button><button className="btn btn-primary btn-md" onClick={() => setOrder(true)} disabled={!hasEst} title={hasEst ? undefined : '見積がまだありません'}>受注する</button></>
        : (canEdit && p.status === '失注' ? <><MoreMenu items={menuItems} open={menu} onToggle={toggleMenu} /><button className="btn btn-secondary btn-md" onClick={doUnlose}>与件に戻す</button></> : null)} />
    {p.no ? <div className="hint" style={{ marginBottom: 14 }}>この与件は案件（工事番号 <b className="num">{p.no}</b>）になりました。内容の編集は案件詳細で行います。<button className="lnk" onClick={openProj}>案件詳細を開く</button></div> : null}
    {p.status === '失注' && p.lostReason ? <div className="hint" style={{ marginBottom: 14 }}>失注理由：{p.lostReason}</div> : null}
    <div className="grid2"><div className="stack">
      <div className="card"><div className="card-head"><h2 className="section-label">与件情報</h2><span className="cs">A-01</span>{ed && !editInfo ? <div className="r"><button className="btn btn-secondary btn-sm" onClick={() => editOn('info')}>編集</button></div> : null}</div><div className="card-body">{info}</div></div>
      <div className="card" id="sumCard"><div className="card-head"><h2 className="section-label">与件の概要</h2><span className="cs">打ち合わせの内容を整理</span>{sm && sm.ocr ? <span className="tag kari">文字認識から反映</span> : null}{ed && !editSum ? <div className="r"><button className="btn btn-secondary btn-sm" onClick={() => editOn('sum')}>編集</button></div> : null}</div><div className="card-body">{summary}</div></div>
      <div className="card"><div className="card-head"><h2 className="section-label">見積</h2><span className="cs">A-05・A-06　1つの与件に複数の見積・版</span></div>
        <div className="tbl"><table><thead><tr><th>見積番号</th><th>版</th><th>日付</th><th className="r">金額（税抜）</th><th>状態</th><th></th></tr></thead><tbody>
          {ests.length ? ests.map(x => <tr key={x.e.no + '-' + x.v.v}><td className="num">{x.e.no}{x.e.branchNo ? <><br /><span className="small muted">追加 {x.e.branchNo}</span></> : null}</td><td>第{x.v.v}版</td><td className="nw">{md(x.v.date)}</td><td className="r num">{x.v.lines.length ? yen(estTotals(s, x.v.lines, x.e.rate).sub) : '－'}</td><td><VerBadge s={x.v.state} /></td>
            <td>{x.v.lines.length ? <button className="btn btn-soft btn-sm" onClick={() => go('S-03', { pid: p.id, ei: x.ei, v: x.v.v, from: 'S-12' })}>開く</button> : <span className="small muted">明細なし（サンプル）</span>}</td></tr>)
            : <tr><td colSpan={6} className="muted">まだ見積がありません</td></tr>}
        </tbody></table></div></div>
    </div><div className="stack">
      <div className="card"><div className="card-head"><h2 className="section-label">打ち合わせメモ</h2><span className="cs">A-02　写真を添付</span>{ed ? <div className="r"><button className="btn btn-soft btn-sm" onClick={() => setPhoto({ step: 1, src: '' })}>＋ 写真を取り込む</button></div> : null}</div><div className="card-body">
        <div className="photos">{p.memos ? Array.from({ length: p.memos }).map((_, i) => <div key={i} className="photo">{p.ocrDone && i === p.memos - 1 ? <BigMemoSVG /> : <MemoSVG i={i} />}<div>メモ {i + 1}{p.ocrDone && i === p.memos - 1 ? <>　<span className="tag kari">認識済</span></> : null}</div></div>) : <span className="muted small">写真はまだありません</span>}</div></div></div>
      <div className="card"><div className="card-head"><h2 className="section-label">関連ファイル</h2><span className="cs">図面・現地写真など。受注後は工事台帳に引き継ぐ</span></div><div className="card-body">
        {p.files.length ? p.files.map(f => <div key={f}><button className="lnk" onClick={na}>{f}</button></div>) : <span className="muted small">ファイルはありません</span>}</div></div>
    </div></div>
    {photo ? <PhotoModal p={p} m={photo} setM={setPhoto} onClose={() => setPhoto(null)}
      onOnly={() => { act(st => photoOnly(st, p.id)); setPhoto(null); toast('写真を打ち合わせメモに添付しました'); }}
      onApply={(fields, due) => { act(st => photoApply(st, p.id, fields, due)); setPhoto(null); setFlash('sumCard'); toast('写真を添付し、認識した内容を「与件の概要」に反映しました'); }} /> : null}
    {order ? <OrderModal pid={p.id} onClose={() => setOrder(false)} /> : null}
    {confirm ? <ConfirmModal spec={confirm} onClose={() => setConfirm(null)} /> : null}
  </>;
}

/* 与件の編集フォーム：得意先はマスタから選んでも、未登録のまま名称だけでもよい。マスタを選ぶと登録済みの担当者から選べる */
function LeadForm({ d, setD }: { d: LeadInfoForm; setD: (d: LeadInfoForm) => void }) {
  const { s } = useStore();
  const mc = d.cust ? cust(s, d.cust) : null;
  const manual = !mc || d.contactId === 'other';
  const up = (k: keyof LeadInfoForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  return <div className="form">
    <label>得意先（マスタ）<select value={d.cust} onChange={e => setD({ ...d, cust: e.target.value, contactId: '' })}><option value="">マスタ未登録（名称だけで管理）</option>{s.customers.filter(c => !c.stopped || c.id === d.cust).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label>得意先名（与件時点）<input value={d.cn} onChange={up('cn')} /></label>
    {mc ? <label>先方担当者<select value={d.contactId} onChange={up('contactId')}><option value="">選んでください</option>{(mc.contacts || []).map(k => <option key={k.id} value={k.id}>{k.name}（{k.dept}）</option>)}<option value="other">その他（手入力）</option></select></label> : null}
    {manual ? <><label>先方担当者名<input value={d.ctn} onChange={up('ctn')} /></label><label>メールアドレス<input type="email" value={d.cte} onChange={up('cte')} /></label><label>電話番号<input type="tel" value={d.ctt} onChange={up('ctt')} /></label></> : null}
    <label>件名<input value={d.t} onChange={up('t')} /></label>
    <label>依頼日<input type="date" value={d.d} onChange={up('d')} /></label>
    <label>当社担当<select value={d.s} onChange={up('s')}>{STAFFS.map(x => <option key={x}>{x}</option>)}</select></label>
    <label>現場<input value={d.site} onChange={up('site')} /></label>
    <label>見積作成期限<input type="date" value={d.due} onChange={up('due')} /></label>
    <label>有効期限<input type="date" value={d.exp} onChange={up('exp')} /></label></div>;
}

/* 写真の取り込み → 文字認識 → 概要に反映（イメージ） */
function PhotoModal({ p, m, setM, onClose, onOnly, onApply }: { p: Project; m: { step: 1 | 2; src: string }; setM: (m: { step: 1 | 2; src: string }) => void; onClose: () => void; onOnly: () => void; onApply: (fields: Record<string, string>, due: boolean) => void }) {
  const [chk, setChk] = useState<Record<string, boolean>>(() => { const o: Record<string, boolean> = {}; OCR_RESULT.forEach(([k, , , cf]) => o[k] = cf >= 0.6); return o; });
  const [vals, setVals] = useState<Record<string, string>>(() => { const o: Record<string, string> = {}; OCR_RESULT.forEach(([k, , v]) => o[k] = v); return o; });
  const banner = <div className="hint" style={{ marginBottom: 12 }}>写真の文字をAIで読み取り、与件の概要の項目に分けて下書きします。<b>読み取った内容は人が確認してから反映</b>します（自動では反映しません）。</div>;
  const apply = () => { const fields: Record<string, string> = {}; OCR_RESULT.forEach(([k]) => { if (chk[k]) fields[k] = vals[k]; }); onApply(fields, !!chk['due']); };
  return <Modal size="wide" onClose={onClose}>
    {m.step === 1 ? <>
      <div className="card-head"><h2 className="section-label">打ち合わせメモの写真を取り込む</h2><span className="cs">{p.title}</span></div><div className="card-body">{banner}
        <div className="grid2">
          <div className="card"><div className="card-head"><h2 className="section-label">PCから</h2></div><div className="card-body stack" style={{ gap: 10 }}>
            <div className="dropzone">ここに写真・PDFをドラッグ＆ドロップ<br /><span className="small muted">スキャナで取り込んだメモ、メールで届いた写真など</span></div>
            <button className="btn btn-secondary" onClick={() => setM({ step: 2, src: 'PC' })}>ファイルを選ぶ（サンプル画像）</button></div></div>
          <div className="card"><div className="card-head"><h2 className="section-label">スマホから</h2></div><div className="card-body stack" style={{ gap: 10 }}>
            <div className="mini-phone"><div className="mp-top">与件 {p.id}　メモを撮影</div><div className="mp-view"><BigMemoSVG /><div className="mp-frame"></div></div><div className="mp-shutter"><span></span></div></div>
            <button className="btn btn-secondary" onClick={() => setM({ step: 2, src: 'スマホ' })}>撮影して送る（サンプル画像）</button>
            <p className="note" style={{ margin: 0 }}>打ち合わせの場で、営業・施工管理がスマホで撮ってそのまま与件に添付する想定</p></div></div>
        </div></div>
      <div className="foot"><button className="btn btn-secondary" onClick={onClose}>閉じる</button></div>
    </> : <>
      <div className="card-head"><h2 className="section-label">文字認識の結果を確認して概要に反映</h2><span className="cs">{m.src}から取り込み</span></div><div className="card-body">{banner}
        <div className="ocr-wrap"><div><div className="att"><BigMemoSVG /></div><div className="small muted" style={{ marginTop: 4 }}>取り込んだ写真（原本は打ち合わせメモに保存）</div></div>
          <div><table className="ocr"><thead><tr><th></th><th>項目</th><th>認識した内容（直せる）</th></tr></thead><tbody>
            {OCR_RESULT.map(([k, l, , cf]) => <tr key={k} className={cf < 0.8 ? 'low' : ''}><td><input type="checkbox" checked={!!chk[k]} onChange={e => setChk({ ...chk, [k]: e.target.checked })} aria-label={`${l}を反映`} /></td><td className="nw">{l}{cf < 0.8 ? <span className="warnline">要確認（確度 {Math.round(cf * 100)}%）</span> : null}</td><td><textarea rows={2} value={vals[k]} onChange={e => setVals({ ...vals, [k]: e.target.value })} /></td></tr>)}
          </tbody></table><p className="note">確度が低い行は色を付けて、人が確認してから反映します。得意先・件名は与件情報と照合し、一致したので取り込み対象外。</p></div></div></div>
      <div className="foot"><button className="btn btn-secondary" onClick={() => setM({ step: 1, src: m.src })}>戻る</button><button className="btn btn-secondary" onClick={onOnly}>写真だけ添付する</button><button className="btn btn-primary" onClick={apply}>概要に反映する</button></div>
    </>}
  </Modal>;
}
