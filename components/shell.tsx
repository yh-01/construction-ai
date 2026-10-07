'use client';
/* 共通レイアウト：上部バー（ログイン中のユーザー）、左メニュー。スマホ画面（/mobile/）は専用の画面構成 */
import React, { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { ROLES, SCREENS, SCREEN_PATH, PATH_SCREEN, MASTERS, projByNo } from '@/lib/calc';
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
  if (path.startsWith('/mobile/')) return { view: 'mobile' as const, screen: sp.get('s') || 'M-02', path };
  if (path === '/login/' || path === '/estimates/print/') return { view: 'bare' as const, screen: '', path };
  return { view: 'pc' as const, screen: PATH_SCREEN[path] || 'S-12', path };
}

/** 役割ごとの最初の画面 */
export const homeOf = (role: keyof typeof ROLES) => ROLES[role].pc.length ? SCREEN_PATH[ROLES[role].pc[0]] : '/mobile/?s=M-02';

export function Shell({ children }: { children: React.ReactNode }) {
  const { hydrated, user, ui } = useStore();
  const { view, screen, path } = useScreen();
  const router = useRouter();
  const sp = useSearchParams();
  const r = user ? ROLES[user.role] : null;

  /* ログインしていなければログイン画面へ。役割に許されていない画面なら、その役割の最初の画面へ */
  useEffect(() => {
    if (!hydrated) return;
    if (!user) { if (path !== '/login/') router.replace('/login/'); return; }
    const rr = ROLES[user.role];
    if (path === '/login/') { router.replace(homeOf(user.role)); return; }
    if (view === 'pc') { if (!rr.pc.length) router.replace('/mobile/?s=M-02'); else if (!rr.pc.includes(screen)) router.replace(SCREEN_PATH[rr.pc[0]]); }
    if (view === 'mobile') { if (!rr.mobile.length) router.replace(SCREEN_PATH[rr.pc[0]]); else if (!rr.mobile.includes(screen)) router.replace('/mobile/?s=M-02'); }
  }, [hydrated, user, view, screen, path, router]);

  if (!hydrated) return null;                       // 保存データの復元中
  if (!user || !r) return path === '/login/' ? <>{children}</> : null;
  if (view === 'bare') return <>{children}</>;
  if (view === 'mobile') return <>{children}</>;    // スマホ画面は app/mobile が全画面を描く
  if (!r.pc.includes(screen)) return null;          // リダイレクト中
  return <PcShell screen={screen} from={sp.get('from') || 'S-12'} tab={sp.get('tab') || ''}>{children}</PcShell>;
}

export function TopBar() {
  const { user, logout } = useStore();
  const router = useRouter();
  const doLogout = () => { logout(); router.push('/login/'); };
  return <header className="topbar">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <div className="brand"><img className="brand-logo" src="/logo.png" alt="h-ent" /><span>颯エンタープライズ</span><small>建設事業部 工事管理</small><span className="sample">サンプルデータ（すべて架空）</span></div>
    <div className="tools">
      {user ? <label>ログイン中<span className="who-chip"><b>{user.name}</b><span className="small muted">{user.role}</span></span></label> : null}
      {user ? <button className="btn btn-secondary btn-sm" onClick={doLogout}>ログアウト</button> : null}
    </div>
  </header>;
}

function PcShell({ screen, from, tab, children }: { screen: string; from: string; tab: string; children: React.ReactNode }) {
  const { s, ui, setUi, user } = useStore();
  const { go, goMobile } = useNav();
  const r = ROLES[ui.role];
  const pending = s.punches.filter(p => p.status === '入力済' && (ui.role !== '職長' || p.segs.some(sg => { const pj = projByNo(s, sg.site); return pj && pj.foreman === ui.me; }))).length;
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
    const cnt = id === 'S-06' && pending ? <span className="count">{pending}</span> : null;
    items.push(<button key={id} className={`nav-item ${parent === id ? 'active' : ''}`} onClick={() => go(id)}><span>{sc.name}</span>{cnt}</button>);
  });
  if (r.mobile.length) {
    items.push(<div key="gm" className="side-section">スマホ</div>);
    items.push(<button key="m02" className="nav-item" onClick={() => goMobile('M-02')}><span>打刻（自分のスマホ）</span></button>);
  }
  return <><TopBar /><div className="shell"><nav className="side" aria-label="メニュー">{items}
    <div className="side-foot">{user?.name}（{ui.role}）<br />今日：{md(TODAY)}（{wd(TODAY)}）</div></nav>
    <main>{children}</main></div></>;
}
