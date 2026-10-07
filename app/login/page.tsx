'use client';
/* ログイン（モック：ユーザーを選ぶ。パスワードは検証しない） */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { homeOf } from '@/components/shell';
import { worker, partner } from '@/lib/calc';

export default function LoginPage() {
  const { s, login, toast } = useStore();
  const router = useRouter();
  const [uid, setUid] = useState('');
  const [pw, setPw] = useState('');
  const [q, setQ] = useState('');
  const users = s.users.filter(u => !u.stopped).filter(u => !q || (u.name + u.loginId + u.role).includes(q));
  const orgOf = (wid: string | null) => { if (!wid) return '事務所'; const w = worker(s, wid); if (!w) return '－'; return w.kind === '社員' ? '建設事業部' : partner(s, w.org)?.name || ''; };
  const doLogin = () => {
    if (!uid) { toast('ユーザーを選んでください'); return; }
    const u = login(uid); if (!u) { toast('ログインできませんでした'); return; }
    router.replace(homeOf(u.role));
  };
  return <div className="login-wrap"><div className="card login-card"><div className="card-body stack" style={{ gap: 14 }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <div style={{ textAlign: 'center' }}><img src="/logo.png" alt="h-ent" style={{ height: 48 }} /><div style={{ fontWeight: 800, marginTop: 8, fontSize: 16 }}>颯エンタープライズ 工事管理</div><div className="small muted">建設事業部</div></div>
    <label className="ph-field">ユーザー<input value={q} onChange={e => setQ(e.target.value)} placeholder="名前・ログインIDで探す" /></label>
    <div className="user-list" role="listbox" aria-label="ユーザー">{users.map(u => <button key={u.id} role="option" aria-selected={uid === u.id} aria-pressed={uid === u.id} onClick={() => setUid(u.id)}><span><b>{u.name}</b><span className="small muted">　{u.loginId}</span></span><span className="small muted">{u.role}・{orgOf(u.workerId)}</span></button>)}{!users.length ? <span className="small muted" style={{ padding: 8 }}>該当するユーザーがいません</span> : null}</div>
    <label className="ph-field">パスワード<input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doLogin(); }} placeholder="（モックのため何でも通ります）" /></label>
    <button className="ph-send" onClick={doLogin} disabled={!uid}>ログイン</button>
    <p className="note" style={{ textAlign: 'center', margin: 0 }}>サンプルデータ（すべて架空）。入力した内容はこのブラウザに保存されます。</p>
  </div></div></div>;
}
