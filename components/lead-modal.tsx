'use client';
/* 与件を登録（A-01）モーダル。S-12 から使う */
import React, { useState } from 'react';
import { Modal, ModalHead, ModalFoot } from './ui';
import { useStore } from '@/lib/store-context';
import { saveLead, type LeadForm } from '@/lib/store';
import { TODAY, STAFFS } from '@/lib/data';
import { addDays } from '@/lib/format';

export function LeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const { s, act, toast } = useStore();
  const [f, setF] = useState<LeadForm>({ custName: '', title: '', reqDate: TODAY, staff: STAFFS[0], site: '', contactName: '', email: '', tel: '', estDue: addDays(TODAY, 14) });
  const up = (k: keyof LeadForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const save = () => { if (!f.title.trim()) { toast('件名を入れてください'); return; } const p = act(st => saveLead(st, f)); toast('与件を登録しました'); onSaved(p.id); };
  return <Modal onClose={onClose}>
    <ModalHead title="与件を登録" cs="A-01" />
    <div className="card-body"><div className="form">
      <label>得意先（与件時点の名称）<input list="custList" value={f.custName} onChange={up('custName')} placeholder="正式名でなくてよい" /><datalist id="custList">{s.customers.map(c => <option key={c.id} value={c.name} />)}</datalist></label>
      <label>件名<input value={f.title} onChange={up('title')} /></label>
      <label>依頼日<input type="date" value={f.reqDate} onChange={up('reqDate')} /></label>
      <label>担当<select value={f.staff} onChange={up('staff')}>{STAFFS.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>現場<input value={f.site} onChange={up('site')} /></label>
      <label>先方担当者名<input value={f.contactName} onChange={up('contactName')} /></label>
      <label>メールアドレス<input type="email" value={f.email} onChange={up('email')} /></label>
      <label>電話番号<input type="tel" value={f.tel} onChange={up('tel')} /></label>
      <label>見積作成期限<input type="date" value={f.estDue} onChange={up('estDue')} /></label></div>
      <p className="note">得意先はマスタに無くても登録できます。受注するときに得意先マスタから選ぶ（無ければその場で追加する）流れです。</p></div>
    <ModalFoot><button className="btn btn-secondary" onClick={onClose}>キャンセル</button><button className="btn btn-primary" onClick={save}>登録する</button></ModalFoot>
  </Modal>;
}

/** 得意先の表示（マスタ未登録なら注記つき） */
export function CustLabel({ unreg, name, short }: { unreg: boolean; name: string; short: string }) {
  return unreg ? <>{name} <span className="tag kari" title="受注するときに得意先マスタから選びます">マスタ未登録</span></> : <>{short}</>;
}
