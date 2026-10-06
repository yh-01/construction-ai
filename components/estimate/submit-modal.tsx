'use client';
/* S-03 見積を提出（メール送付 or 手動）モーダル。モックの ACT.submitOpen / mailBody / MODALS.submit / subOk をそのまま */
import React, { useState } from 'react';
import { Modal } from '@/components/ui';
import { useStore } from '@/lib/store-context';
import { custOf, estTotals } from '@/lib/calc';
import { submitEst } from '@/lib/store';
import { TODAY } from '@/lib/data';
import { yen, fmtD, fmtDate } from '@/lib/format';
import type { Project, Estimate, EstVersion } from '@/lib/types';

type Opt = { id: string; name: string; dept: string; email: string; src: string };

export function SubmitModal({ p, e, v, onClose }: { p: Project; e: Estimate; v: EstVersion; onClose: () => void }) {
  const { s, act, toast } = useStore();
  const c = custOf(s, p);
  const opts: Opt[] = [];
  (c.contacts || []).forEach(k => opts.push({ id: k.id || '', name: k.name, dept: k.dept, email: k.email, src: '得意先マスタ' }));
  if (p.contact && p.contact.email && !opts.some(o => o.email === p.contact!.email)) opts.push({ id: 'lead', name: p.contact.name, dept: '', email: p.contact.email, src: '与件の担当者' });
  const def = opts.find(o => o.id === p.contactId) || opts[0];
  const ex = new Date(TODAY + 'T00:00:00'); ex.setDate(ex.getDate() + 30);
  const [to, setTo] = useState<string>(def ? def.id : 'manual');
  const [exp, setExp] = useState(fmtDate(ex));
  const [mail, setMail] = useState<{ to?: string; subj?: string; body?: string }>({}); // 自動作成した文面への手直し（送り方・期限を変えると作り直す）
  const o = opts.find(x => x.id === to);
  const mailBody = (o: Opt) => { const t = estTotals(s, v.lines, e.rate);
    return `${c.unreg ? (p.custName || '') : c.name}\n${o && o.dept ? o.dept + '\n' : ''}${o ? o.name.replace(/ 様$/, '') + ' 様' : ''}\n\nいつもお世話になっております。颯エンタープライズ 建設事業部の${p.staff.replace(/（.*）/, '')}です。\n\n「${p.title}」の御見積書（${e.no} 第${v.v}版）をお送りします。\n御見積金額：${yen(t.total)}（税込）\n有効期限：${fmtD(exp)}\n\nご確認のほど、よろしくお願いいたします。`; };
  const ok = () => {
    act(st => submitEst(st, p.id, v, o ? { name: o.name } : null, exp)); onClose();
    toast(o ? `${o.name} 宛に見積を送信しました（モック）。提出済みにしました` : '提出済みにしました');
  };
  return <Modal onClose={onClose}>
    <div className="card-head"><h2 className="section-label">見積を提出</h2><span className="cs">{e.no} 第{v.v}版　{p.title}</span></div>
    <div className="card-body stack">
      <div><div className="step">1. 送り方</div><div className="stack" style={{ gap: 6 }}>
        {opts.map(x => <label key={x.id} className="opt"><input type="radio" name="sto" value={x.id} checked={to === x.id} onChange={() => { setTo(x.id); setMail({}); }} /><span><b>{x.name}</b> {x.dept ? <span className="small muted">{x.dept}</span> : null}<small>{x.email}　（{x.src}）</small></span></label>)}
        <label className="opt"><input type="radio" name="sto" value="manual" checked={to === 'manual'} onChange={() => { setTo('manual'); setMail({}); }} /><span>メールで送らずに提出した<small>手渡し・郵送・FAX・自分のメールで送った など。提出日だけ記録します</small></span></label>
        {!opts.length ? <p className="note" style={{ margin: 0 }}>先方担当者のメールアドレスがありません。与件詳細か得意先マスタで入れると、ここから送れます。</p> : null}</div></div>
      {o ? <div><div className="step">2. メール（自動で作成。直せます）</div><div className="form" style={{ gridTemplateColumns: '1fr' }}>
        <label>宛先<input value={mail.to ?? o.email} onChange={ev => setMail({ ...mail, to: ev.target.value })} /></label>
        <label>件名<input value={mail.subj ?? `【御見積書】${p.title}（${e.no} 第${v.v}版）`} onChange={ev => setMail({ ...mail, subj: ev.target.value })} /></label>
        <label>本文<textarea rows={9} value={mail.body ?? mailBody(o)} onChange={ev => setMail({ ...mail, body: ev.target.value })} /></label>
        <div className="small">添付：<span className="tag int">PDF</span> 御見積書_{e.no}_第{v.v}版.pdf</div></div></div> : null}
      <div><div className="step">{o ? '3' : '2'}. 見積の有効期限</div><input type="date" value={exp} onChange={ev => { setExp(ev.target.value); setMail({ ...mail, body: undefined }); }} /></div>
    </div>
    <div className="foot"><button className="btn btn-secondary" onClick={onClose}>キャンセル</button><button className="btn btn-primary" onClick={ok}>{o ? '送信して提出済みにする' : '提出済みにする'}</button></div>
  </Modal>;
}
