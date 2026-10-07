'use client';
/* S-11 ユーザー・権限：ログインするユーザーの一覧・追加・編集・停止・削除（管理者のみ操作できる） */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { PageHead, Modal, ModalHead, ModalFoot, ConfirmModal, MoreMenu, type ConfirmSpec } from '@/components/ui';
import { ROLE_NAMES, worker, partner } from '@/lib/calc';
import { saveUser, toggleUserStop, deleteUser, type UserForm } from '@/lib/store';
import type { AppState, User, Worker } from '@/lib/types';

const M = [['与件・見積・案件（S-01〜05・12・13）', '◎', '閲覧', '◎（担当案件）', '－', '－'], ['原価・単価・粗利の表示', '◎', '閲覧', '【仮】', '－', '－'], ['S-06 日次チェック', '◎', '閲覧', '◎（担当現場）', '－', '－'],
  ['S-07 勤怠集計', '◎', '◎', '－', '－', '－'], ['S-08 外注支払', '◎', '◎', '－', '－', '－'], ['S-10 マスタ', '◎', '一部', '－', '－', '－'], ['M-02〜04 打刻・工程表', '－', '－', '◎', '◎', '◎（自分・自社のみ）'], ['M-05 代理入力', '－', '－', '◎', '－', '－']];

/** 作業員の所属（社員は部署名、外部は協力会社名） */
const orgOf = (s: AppState, w: Worker) => w.kind === '社員' ? w.org : (partner(s, w.org)?.name || w.org);
const emptyForm = (): UserForm => ({ name: '', loginId: '', role: '社員職人', workerId: '' });

export default function UsersPage() {
  const { s, ui, act, toast, user: me } = useStore();
  const ed = ui.role === '管理者';
  const [edit, setEdit] = useState<{ id: string | null; f: UserForm } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const openNew = () => setEdit({ id: null, f: emptyForm() });
  const openEdit = (u: User) => setEdit({ id: u.id, f: { name: u.name, loginId: u.loginId, role: u.role, workerId: u.workerId || '' } });
  const save = () => {
    if (!edit) return;
    const err = act(st => saveUser(st, edit.id, edit.f));
    if (err) { toast(err); return; }
    toast(edit.id ? 'ユーザーを更新しました' : 'ユーザーを追加しました'); setEdit(null);
  };
  const stop = (u: User) => { act(st => toggleUserStop(st, u.id)); toast(u.name + ' を' + (u.stopped ? '再開' : '停止') + 'しました'); };
  const del = (u: User) => setConfirm({ title: 'ユーザーを削除しますか', body: <p style={{ margin: 0 }}>「{u.name}」（{u.loginId}）を削除します。ログインできなくなります。元に戻せません。</p>, okLabel: '削除する', danger: true, onOk: () => { act(st => deleteUser(st, u.id)); toast('削除しました'); } });
  /* 作業員の選択で氏名が空なら氏名も入れる */
  const pickWorker = (wid: string) => { if (!edit) return; const w = wid ? worker(s, wid) : null; setEdit({ ...edit, f: { ...edit.f, workerId: wid, name: edit.f.name || (w ? w.name : '') } }); };

  const rows = s.users.map(u => {
    const w = u.workerId ? worker(s, u.workerId) : null; const self = me?.id === u.id;
    return <tr key={u.id} className={u.stopped ? 'stopped' : ''}><td><b style={{ color: 'var(--ink)' }}>{u.name}</b>{self ? <> <span className="tag staff">自分</span></> : null}</td><td className="num small">{u.loginId}</td><td>{u.role}</td>
      <td className="small">{w ? <>{w.name}<span className="muted">（{orgOf(s, w)}）</span></> : <span className="muted">事務所</span>}</td>
      <td>{u.stopped ? <span className="badge gray">停止中</span> : <span className="badge ok">利用中</span>}</td>
      {ed ? <td className="nw"><button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>編集</button> <MoreMenu small open={menu === u.id} onToggle={() => setMenu(menu === u.id ? null : u.id)} items={[
        { label: u.stopped ? '利用を再開する' : '停止する', onClick: () => stop(u), disabled: self, note: self ? 'ログイン中の自分は停止できない' : u.stopped ? '' : 'ログインできなくなる（データは残る）' },
        { label: '削除', onClick: () => del(u), danger: true, disabled: self, note: self ? 'ログイン中の自分は削除できない' : '間違って登録したとき' }]} /></td> : null}</tr>;
  });
  return <>
    <PageHead id="S-11" title="ユーザー・権限" sub="ログインする人と役割" acts={ed ? <button className="btn btn-secondary btn-md" onClick={openNew}>＋ ユーザーを追加</button> : null} />
    <div className="grid2"><div className="card"><div className="card-head"><h2 className="section-label">ユーザー</h2><span className="cs">{s.users.length}人</span></div><div className="tbl"><table><thead><tr><th>氏名</th><th>ログインID</th><th>役割</th><th>紐づく作業員</th><th>状態</th>{ed ? <th></th> : null}</tr></thead><tbody>{rows}</tbody></table></div>
    <div className="card-body"><p className="note" style={{ margin: 0 }}>職長・社員職人・協力会社は作業員マスタの人と紐づけます（打刻・工程表は紐づいた作業員として動く）。モックではパスワードを検証しません（ログイン画面でユーザーを選ぶだけ）。</p></div></div>
    <div className="card"><div className="card-head"><h2 className="section-label">画面×役割</h2><span className="cs">画面設計§6</span></div><div className="tbl"><table><thead><tr><th>画面</th><th>管理者</th><th>経理</th><th>職長</th><th>社員職人</th><th>協力会社</th></tr></thead><tbody>{M.map(r => <tr key={r[0]}>{r.map((x, i) => <td key={i} className={`${i ? 'c' : ''} small`}>{x}</td>)}</tr>)}</tbody></table></div>
    <div className="card-body"><p className="note" style={{ margin: 0 }}>◎＝操作可。職長に原価・粗利を見せるかはヒアリングで決めます（モックでは【仮】の注記つきで表示）。</p></div></div></div>
    {edit ? <Modal onClose={() => setEdit(null)}>
      <ModalHead title={edit.id ? 'ユーザーを編集' : 'ユーザーを追加'} cs={edit.id || ''} />
      <div className="card-body"><div className="form form2">
        <label>氏名<input value={edit.f.name} onChange={e => setEdit({ ...edit, f: { ...edit.f, name: e.target.value } })} /></label>
        <label>ログインID<input value={edit.f.loginId} onChange={e => setEdit({ ...edit, f: { ...edit.f, loginId: e.target.value } })} placeholder="半角英数" /></label>
        <label>役割<select value={edit.f.role} onChange={e => setEdit({ ...edit, f: { ...edit.f, role: e.target.value as UserForm['role'] } })}>{ROLE_NAMES.map(r => <option key={r}>{r}</option>)}</select></label>
        <label>作業員<select value={edit.f.workerId} onChange={e => pickWorker(e.target.value)}><option value="">なし（事務所）</option>{s.workers.map(w => <option key={w.id} value={w.id}>{w.name}（{orgOf(s, w)}）{w.stopped ? '・停止中' : ''}</option>)}</select></label></div>
        <p className="note">職長・社員職人・協力会社は作業員を選びます。管理者・経理は「なし（事務所）」でよい。パスワードはモックでは持ちません。</p></div>
      <ModalFoot><button className="btn btn-secondary" onClick={() => setEdit(null)}>キャンセル</button><button className="btn btn-primary" onClick={save}>{edit.id ? '保存する' : '追加する'}</button></ModalFoot>
    </Modal> : null}
    {confirm ? <ConfirmModal spec={confirm} onClose={() => setConfirm(null)} /> : null}
  </>;
}
