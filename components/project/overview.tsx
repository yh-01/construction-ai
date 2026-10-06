'use client';
/* S-05 概要タブ：案件になったらここで編集する（与件詳細では編集しない） */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { MemoSVG } from '@/components/svgs';
import { useNa } from '@/components/ui';
import { ROLES, cust, worker, partner, contactOf, estTotals, type CustView, type ProjFin, type LatestVer } from '@/lib/calc';
import { saveCase, saveCaseSummary, addMember, removeMember, type CaseForm } from '@/lib/store';
import type { Project, Summary } from '@/lib/types';
import { STAFFS } from '@/lib/data';
import { fmtD, yen } from '@/lib/format';

export const SUM_FIELDS: [keyof Summary, string][] = [['equip', '対象設備'], ['work', '工事内容'], ['period', '希望工期'], ['cond', '現地条件'], ['due', '見積期限（メモ上）'], ['note', 'その他']];

export function Overview({ p, c }: { p: Project; c: CustView; f: ProjFin }) {
  const { s, ui, act, toast } = useStore();
  const { go } = useNav();
  const na = useNa();
  const ed = ROLES[ui.role].edit; const costVis = ROLES[ui.role].cost !== 'hide';
  const [edit, setEdit] = useState<'case' | 'csum' | null>(null);
  const [form, setForm] = useState<CaseForm | null>(null);
  const [sumForm, setSumForm] = useState<Record<string, string>>({});
  const [addMem, setAddMem] = useState('');
  const eInfo = edit === 'case' && !!form, eSum = edit === 'csum';
  const cand = s.workers.filter(w => !w.stopped && w.flags?.cost !== false && !p.members.includes(w.id));
  const foremen = s.workers.filter(w => w.kind === '社員' && !w.stopped && w.flags?.cost !== false);
  const accepted: LatestVer[] = []; p.estimates.forEach((e, ei) => e.versions.forEach(v => { if (v.state === '受注') accepted.push({ e, ei, v }); }));
  const sm = (p.summary || {}) as Record<string, string | boolean | undefined>; const ct = contactOf(s, p);
  const contract = p.contract || [];

  /* 編集を始める：select は候補に無ければ先頭が選ばれる（モックのブラウザ挙動と同じ） */
  const firstContact = (cid: string, keep?: string | null) => { const ks = cust(s, cid)?.contacts || []; return keep && ks.some(k => k.id === keep) ? keep : (ks[0]?.id || ''); };
  const editOn = () => {
    const custs = s.customers.filter(x => !x.stopped || x.id === p.cust); const cid = custs.some(x => x.id === p.cust) ? (p.cust || '') : (custs[0]?.id || '');
    setForm({ title: p.title, cust: cid, contactId: firstContact(cid, p.contactId), start: p.period ? p.period[0] : '', end: p.period ? p.period[1] : '', site: p.site,
      foreman: foremen.some(w => w.id === p.foreman) ? (p.foreman || '') : (foremen[0]?.id || ''), staff: STAFFS.includes(p.staff) ? p.staff : STAFFS[0], status: ['受注', '施工中', '完了'].includes(p.status) ? p.status : '受注' });
    setEdit('case');
  };
  const sumOn = () => { const o: Record<string, string> = {}; SUM_FIELDS.forEach(([k]) => o[k] = String(sm[k] || '')); setSumForm(o); setEdit('csum'); };
  const up = (k: keyof CaseForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!form) return; const v = e.target.value;
    if (k === 'cust') setForm({ ...form, cust: v, contactId: firstContact(v, p.contactId) }); else setForm({ ...form, [k]: v });
  };
  const save = () => { if (!form) return; act(st => saveCase(st, p.id, form)); setEdit(null); setForm(null); toast('基本情報を保存しました'); };
  const saveSum = () => { const o: Summary = {}; SUM_FIELDS.forEach(([k]) => { (o as Record<string, string | boolean | undefined>)[k] = sumForm[k] ?? ''; }); act(st => saveCaseSummary(st, p.id, o)); setEdit(null); toast('工事の概要を保存しました'); };
  const memSel = cand.some(w => w.id === addMem) ? addMem : (cand[0]?.id || '');
  const doAdd = () => { const id = memSel; if (id) { act(st => addMember(st, p.id, id)); toast(worker(s, id).name + 'さんを配置しました。打刻画面の現場候補に出ます'); } };

  const contacts = form ? (cust(s, form.cust)?.contacts || []) : [];
  const info = eInfo && form ? <>
    <div className="form">
      <label>件名<input value={form.title} onChange={up('title')} /></label>
      <label>得意先（マスタ）<select value={form.cust} onChange={up('cust')}>{s.customers.filter(x => !x.stopped || x.id === p.cust).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>先方担当者<select value={form.contactId} onChange={up('contactId')}>{contacts.length ? contacts.map(k => <option key={k.id} value={k.id}>{k.name}（{k.dept}）</option>) : <option value="">得意先マスタに担当者がいません</option>}</select></label>
      <label>工期（開始）<input type="date" value={form.start} onChange={up('start')} /></label>
      <label>工期（終了）<input type="date" value={form.end} onChange={up('end')} /></label>
      <label>現場<input value={form.site} onChange={up('site')} /></label>
      <label>職長<select value={form.foreman} onChange={up('foreman')}>{foremen.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
      <label>営業担当<select value={form.staff} onChange={up('staff')}>{STAFFS.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>状態<select value={form.status} onChange={up('status')}>{['受注', '施工中', '完了'].map(x => <option key={x}>{x}</option>)}</select></label></div>
    <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}><button className="btn btn-secondary btn-md" onClick={() => { setEdit(null); setForm(null); }}>キャンセル</button><button className="btn btn-primary btn-md" onClick={save}>保存</button></div>
  </> : <dl className="kv"><dt>工事番号</dt><dd>{contract.map((x, i) => <div key={i}><span className="num">{x.no}</span>　<span className="small muted">{x.label}</span>{costVis ? <>　<span className="num small">{yen(x.amount)}</span></> : null}</div>)}</dd>
    <dt>件名</dt><dd>{p.title}</dd><dt>得意先</dt><dd>{c.name}</dd><dt>先方担当者</dt><dd>{ct ? <>{ct.name}{ct.dept ? <> <span className="small muted">{ct.dept}</span></> : null}<div className="small num">{ct.email || ''}　{ct.tel || ''}</div></> : '－'}</dd>
    <dt>工期</dt><dd>{p.period ? fmtD(p.period[0]) + ' 〜 ' + fmtD(p.period[1]) : '－'}</dd><dt>現場</dt><dd>{p.site}</dd>
    <dt>職長</dt><dd>{p.foreman ? worker(s, p.foreman).name : '－'}</dd><dt>営業担当</dt><dd>{p.staff}</dd>
    <dt>元の与件</dt><dd><span className="num">{p.id}</span>　<span className="small muted">依頼日 {fmtD(p.reqDate)}{p.custName ? '　与件時点の得意先名：' + p.custName : ''}</span></dd></dl>;

  const summary = eSum ? <>
    <div className="stack" style={{ gap: 8 }}>{SUM_FIELDS.map(([k, l]) => <label key={k} className="fld">{l}<textarea rows={2} value={sumForm[k] ?? ''} onChange={e => setSumForm({ ...sumForm, [k]: e.target.value })} /></label>)}</div>
    <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}><button className="btn btn-secondary btn-md" onClick={() => setEdit(null)}>キャンセル</button><button className="btn btn-primary btn-md" onClick={saveSum}>保存</button></div>
  </> : (Object.keys(sm).length ? <dl className="kv">{SUM_FIELDS.map(([k, l]) => <React.Fragment key={k}><dt>{l}</dt><dd>{String(sm[k] || '－')}</dd></React.Fragment>)}</dl> : <div className="placeholder">まだ整理されていません{ed ? '。「編集」から入力できます' : ''}</div>);

  return <div className="grid2"><div className="stack">
    <div className="card"><div className="card-head"><h2 className="section-label">基本情報</h2>{ed && !eInfo ? <div className="r"><button className="btn btn-secondary btn-sm" onClick={editOn}>編集</button></div> : null}</div><div className="card-body">{info}</div></div>
    <div className="card"><div className="card-head"><h2 className="section-label">工事の概要</h2><span className="cs">与件のときの内容を引き継ぎ、ここで更新</span>{ed && !eSum ? <div className="r"><button className="btn btn-secondary btn-sm" onClick={sumOn}>編集</button></div> : null}</div><div className="card-body">{summary}</div></div>
    <div className="card"><div className="card-head"><h2 className="section-label">受注した見積</h2></div><div className="card-body">
      {accepted.length ? accepted.map((x, i) => <div key={i} className="row" style={{ gap: 8 }}><button className="lnk num" onClick={() => go('S-03', { pid: p.id, ei: x.ei, v: x.v.v, from: 'S-12' })}>{x.e.no} 第{x.v.v}版</button><span className="num small">{yen(estTotals(s, x.v.lines, x.e.rate).sub)}</span>{x.e.branchNo ? <span className="small muted">追加 {x.e.branchNo}</span> : <span className="small muted">当初</span>}</div>) : <span className="muted small">－</span>}</div></div>
  </div><div className="stack">
    <div className="card"><div className="card-head"><h2 className="section-label">配置する作業員</h2><span className="cs">打刻画面で、この現場が上に出ます</span></div><div className="card-body">
      <div className="tbl"><table><thead><tr><th>氏名</th><th>区分</th><th>所属・職種</th><th></th></tr></thead><tbody>
        {p.members.length ? p.members.map(id => { const w = worker(s, id); return <tr key={id}><td>{w.name}{id === p.foreman ? <> <span className="tag staff">職長</span></> : null}</td><td>{w.kind === '社員' ? <span className="tag staff">社員</span> : <span className="tag ext">{w.kind}</span>}</td><td className="small">{w.kind === '社員' ? w.org : partner(s, w.org).name}・{w.job}</td><td>{ed && id !== p.foreman ? <button className="btn btn-danger btn-sm" onClick={() => act(st => removeMember(st, p.id, id))}>外す</button> : null}</td></tr>; }) : <tr><td colSpan={4} className="muted">まだ配置していません</td></tr>}
      </tbody></table></div>
      {ed ? <div className="row" style={{ marginTop: 10 }}><select value={memSel} onChange={e => setAddMem(e.target.value)}>{cand.map(w => <option key={w.id} value={w.id}>{w.name}（{w.kind}）</option>)}</select><button className="btn btn-soft btn-md" onClick={doAdd}>＋ 配置する</button></div> : null}
    </div></div>
    <div className="card"><div className="card-head"><h2 className="section-label">打ち合わせメモ・ファイル</h2>{ed ? <div className="r"><button className="btn btn-soft btn-sm" onClick={na}>＋ 追加</button></div> : null}</div><div className="card-body">
      <div className="photos" style={{ marginBottom: 10 }}>{p.memos ? Array.from({ length: p.memos }).map((_, i) => <div key={i} className="photo"><MemoSVG i={i} /><div>メモ {i + 1}</div></div>) : <span className="muted small">写真はありません</span>}</div>
      {p.files.map((x, i) => <div key={i}><button className="lnk" onClick={na}>{x}</button></div>)}</div></div>
  </div></div>;
}
