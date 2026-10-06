'use client';
/* 共通レイアウト：上部バー（表示・役割）、デモの流れ、左メニュー、スマホ画面への切替 */
import React, { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import type { Role } from '@/lib/types';
import { ROLES, ROLE_NAMES, SCREENS, SCREEN_PATH, PATH_SCREEN, MASTERS, projByNo } from '@/lib/calc';
import { TODAY } from '@/lib/data';
import { md, wd } from '@/lib/format';

export function useNav() {
  const router = useRouter();
  const { setUi } = useStore();
  const go = (screen: string, q?: Record<string, string | number | undefined>) => {
    const path = SCREEN_PATH[screen]; const qs = q ? Object.entries(q).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : '';
    const url = path + (qs ? '?' + qs : '');
    setUi({ lastPc: url }); router.push(url); if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };
  const goMobile = (ms: string) => { setUi({ lastMobile: ms }); router.push('/mobile/?s=' + ms); };
  const openProj = (p: { id: string; no: string | null }) => { if (p.no) go('S-05', { id: p.id }); else go('S-02', { id: p.id }); };
  return { go, goMobile, openProj, router };
}

/** いまの画面ID（パスから） */
export function useScreen() {
  const pathname = usePathname() || '/'; const sp = useSearchParams();
  const path = pathname.endsWith('/') ? pathname : pathname + '/';
  if (path.startsWith('/mobile/')) return { view: 'mobile' as const, screen: sp.get('s') || 'M-02' };
  return { view: 'pc' as const, screen: PATH_SCREEN[path] || 'S-12' };
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { s, ui, setUi, reset, toast } = useStore();
  const { go, goMobile, router } = useNav();
  const { view, screen } = useScreen();
  const sp = useSearchParams();
  const r = ROLES[ui.role];

  /* 役割に許されていない画面なら、その役割の最初の画面へ（モックの render() と同じ） */
  useEffect(() => {
    if (view === 'pc') { if (!r.pc.length) { router.replace('/mobile/?s=M-02'); return; } if (!r.pc.includes(screen)) router.replace(SCREEN_PATH[r.pc[0]]); }
    else { if (!r.mobile.length) { router.replace(ui.lastPc && PATH_SCREEN[ui.lastPc.split('?')[0]] && r.pc.includes(PATH_SCREEN[ui.lastPc.split('?')[0]]) ? ui.lastPc : SCREEN_PATH[r.pc[0]]); return; } if (!r.mobile.includes(screen)) router.replace('/mobile/?s=M-02'); }
  }, [view, screen, r, router, ui.lastPc]);

  const setRole = (role: Role) => {
    const nr = ROLES[role]; setUi({ role });
    if (!nr.pc.length) { goMobile(ui.lastMobile || 'M-02'); }
    else if (!nr.mobile.length && view === 'mobile') { const last = PATH_SCREEN[(ui.lastPc || '').split('?')[0]]; if (last && nr.pc.includes(last)) router.push(ui.lastPc); else router.push(SCREEN_PATH[nr.pc[0]]); }
    else if (view === 'pc' && !nr.pc.includes(screen)) router.push(SCREEN_PATH[nr.pc[0]]);
    toast('表示中の役割：' + role + '（権限は画面設計§6に従って表示）');
  };
  const setView = (v: 'pc' | 'mobile') => {
    if (v === view) return;
    if (v === 'mobile') goMobile(ui.lastMobile || 'M-02');
    else { const last = PATH_SCREEN[(ui.lastPc || '').split('?')[0]]; router.push(last && r.pc.includes(last) ? ui.lastPc : SCREEN_PATH[r.pc[0]]); }
  };
  const demo = (v: string) => {
    const set = (role: Role) => setUi({ role });
    if (v === '0') { set('管理者'); go('S-02', { id: 'Y-2026-031', photo: 1 }); }
    if (v === '1') { set('管理者'); go('S-03', { pid: 'Y-2026-029', ei: 0, v: 2, from: 'S-12' }); }
    if (v === '2') { set('管理者'); go('S-02', { id: 'Y-2026-029', order: 1 }); }
    if (v === '3a') { set('社員職人'); goMobile('M-02'); }
    if (v === '3b') { set('協力会社'); goMobile('M-02'); }
    if (v === '3c') { set('職長'); go('T-01'); }
    if (v === '4') { set('職長'); setUi({ s06date: TODAY }); go('S-06'); }
    if (v === '5') { set('管理者'); setUi({ s05tab: '概要' }); go('S-05', { id: 'Y-2026-015' }); }
    if (v === '6') { set('管理者'); setUi({ s08month: '2026-10' }); go('S-08'); }
    if (v === '6b') { set('管理者'); setUi({ s07month: '2026-10' }); go('S-07'); }
  };
  const doReset = () => { reset(); router.push('/leads/'); toast('初期状態に戻しました'); };

  return <>
    <header className="topbar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="brand"><img className="brand-logo" src="/logo.png" alt="h-ent" /><span>颯エンタープライズ</span><small>建設事業部 工事管理（モック v0.1）</small><span className="sample">サンプルデータ（すべて架空）</span></div>
      <div className="tools">
        <label>表示<span className="seg">
          <button onClick={() => setView('pc')} aria-pressed={view === 'pc'} disabled={!r.pc.length} title={r.pc.length ? undefined : 'この役割は事務所PCを使いません'}>PC</button>
          <button onClick={() => setView('mobile')} aria-pressed={view === 'mobile'} disabled={!r.mobile.length} title={r.mobile.length ? undefined : 'この役割はスマホ画面を使いません'}>スマホ</button></span></label>
        <label>表示中の役割<span className="seg">{ROLE_NAMES.map(k => <button key={k} onClick={() => setRole(k)} aria-pressed={ui.role === k}>{k}</button>)}</span></label>
      </div>
    </header>
    <div className="demobar"><span>デモの流れ</span>
      <button onClick={() => demo('0')}>⓪ メモ写真の取り込み</button>
      <button onClick={() => demo('1')}>① 見積を作る</button>
      <button onClick={() => demo('2')}>② 受注確定</button>
      <button onClick={() => demo('3a')}>③ 打刻（社員）</button>
      <button onClick={() => demo('3b')}>③ 打刻（協力会社）</button>
      <button onClick={() => demo('3c')}>③ 共用端末でまとめて</button>
      <button onClick={() => demo('4')}>④ 日次チェック</button>
      <button onClick={() => demo('5')}>⑤ 工事台帳</button>
      <button onClick={() => demo('6')}>⑥ 外注支払</button>
      <button onClick={() => demo('6b')}>⑥ 勤怠集計</button>
      <button onClick={doReset} style={{ marginLeft: 'auto' }}>初期状態に戻す</button>
    </div>
    {view === 'pc' ? <PcShell screen={screen} from={sp.get('from') || 'S-12'} tab={sp.get('tab') || ''}>{children}</PcShell> : children}
  </>;
}

function PcShell({ screen, from, tab, children }: { screen: string; from: string; tab: string; children: React.ReactNode }) {
  const { s, ui, setUi } = useStore();
  const { go } = useNav();
  const r = ROLES[ui.role];
  const pending = s.punches.filter(p => p.status === '入力済' && (ui.role !== '職長' || p.segs.some(sg => { const pj = projByNo(s, sg.site); return pj && pj.foreman === 'E1'; }))).length;
  const parent = ({ 'S-02': 'S-12', 'S-03': from, 'S-05': 'S-01' } as Record<string, string>)[screen] || screen;
  const items: React.ReactNode[] = []; let grp = '';
  r.pc.forEach(id => {
    const sc = SCREENS[id]; if (sc.hidden) return;
    if (sc.grp !== grp) { grp = sc.grp || ''; if (id !== 'S-10') items.push(<div key={'g' + id} className="side-section">{grp}</div>); }
    if (id === 'S-10') {
      items.push(<button key="mt" className="side-section side-toggle" onClick={() => setUi({ masterOpen: !ui.masterOpen })} aria-expanded={ui.masterOpen}>マスタ<span>{ui.masterOpen ? '▾' : '▸'}</span></button>);
      if (ui.masterOpen) MASTERS.forEach(m => items.push(<button key={m} className={`nav-item sub ${screen === 'S-10' && (tab || '品目') === m ? 'active' : ''}`} onClick={() => go('S-10', { tab: m })}><span>{m}</span></button>));
      return;
    }
    const cnt = id === 'S-06' && pending ? <span className="count">{pending}</span> : (sc.mock === '△' ? <span className="mk" title="見た目だけ">△</span> : null);
    items.push(<button key={id} className={`nav-item ${parent === id ? 'active' : ''}`} onClick={() => go(id)}><span>{sc.name}</span>{cnt}</button>);
  });
  return <div className="shell"><nav className="side" aria-label="メニュー">{items}
    <div className="side-foot">表示中：{ui.role}<br />デモの「今日」：{md(TODAY)}（{wd(TODAY)}）<br />△＝見た目だけ</div></nav>
    <main>{children}</main></div>;
}
