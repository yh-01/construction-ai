'use client';
/* =========================================================
   ブラウザ内の状態（React Context）
   - state：業務データ（lib/store.ts の関数で書き換え、localStorage に保存する。将来は DB）
   - user：ログインしているユーザー（役割はここから決まる）
   - ui：画面をまたいで持つ表示状態（フィルター・タブ・月 など）
   - toast：操作結果のメッセージ
   ========================================================= */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AppState, Role, User } from './types';
import { createInitialState, serialize, deserialize, STORAGE_KEY } from './store';
import { TODAY, THIS_MONTH } from './data';

const USER_KEY = 'hayate.user.v1';

export type KioskUI = { site: string; sel: Record<string, boolean>; brk: string; mode: 'move' | 'out' | null; mins?: number };
export type ProxyUI = { worker: string; site: string; start: string; end: string; brk: number; reason: string };
export type UIState = {
  role: Role;                           // ログインしたユーザーの役割
  me: string | null;                    // ログインしたユーザーに紐づく作業員ID
  lastPc: string;                       // 事務所の画面に戻るときのパス
  lastMobile: string;                   // スマホ画面に戻るときの画面ID
  planSite: Record<string, string>;     // 「別の現場にする」で選んだ現場
  kiosk: KioskUI;
  m05: ProxyUI;
  m04site: string | null;
  s05tab: string;
  s06date: string; s06site: string;
  s07month: string; s08month: string;
  s03mode: '社内' | '社外';
  estClosed: Record<string, boolean>;
  masterOpen: boolean;
  f: Record<string, Record<string, string>>;           // 一覧のフィルター（画面キーごと）
  sort: Record<string, { k: string; dir: number }>;    // 一覧の並べ替え
  costFrom: string | null;
};
export const initialUI = (): UIState => ({
  role: '管理者', me: null, lastPc: '/leads/', lastMobile: 'M-02', planSite: {},
  kiosk: { site: '', sel: {}, brk: 'std', mode: null },
  m05: { worker: '', site: '', start: '08:00', end: '17:00', brk: 60, reason: 'スマホがない' },
  m04site: null, s05tab: '概要', s06date: TODAY, s06site: 'all', s07month: THIS_MONTH, s08month: THIS_MONTH,
  s03mode: '社内', estClosed: {}, masterOpen: true, f: { s12: { st: 'active' }, s01: { st: 'active' } }, sort: {}, costFrom: null,
});

type Ctx = {
  s: AppState;
  version: number;
  hydrated: boolean;
  user: User | null;
  login: (userId: string) => User | null;
  logout: () => void;
  /** 状態を書き換える。fn の中で lib/store.ts の関数を呼ぶ。書き換えた状態は localStorage に保存される */
  act: <T,>(fn: (s: AppState) => T) => T;
  reset: () => void;
  ui: UIState;
  setUi: (patch: Partial<UIState> | ((u: UIState) => Partial<UIState>)) => void;
  setF: (key: string, k: string, v: string) => void;
  clearF: (key: string) => void;
  toast: (msg: string) => void;
};
const StoreCtx = createContext<Ctx | null>(null);

const ls = { get: (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* 容量超過・プライベートモード */ } }, del: (k: string) => { try { window.localStorage.removeItem(k); } catch { /* noop */ } } };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<AppState | null>(null);
  if (!ref.current) ref.current = createInitialState();
  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null); userRef.current = user;
  const [ui, setUiState] = useState<UIState>(initialUI);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* 起動時：保存してあるデータとログイン状態を復元 */
  useEffect(() => {
    const saved = ls.get(STORAGE_KEY); const st = saved ? deserialize(saved) : null;
    if (st) ref.current = st;
    const uid = ls.get(USER_KEY); const u = uid ? (ref.current!.users.find(x => x.id === uid && !x.stopped) || null) : null;
    if (u) { setUser(u); setUiState(x => ({ ...x, role: u.role, me: u.workerId })); }
    setHydrated(true); setVersion(v => v + 1);
  }, []);

  const persist = useCallback(() => { if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => { if (ref.current) ls.set(STORAGE_KEY, serialize(ref.current)); }, 250); }, []);
  const act = useCallback(<T,>(fn: (s: AppState) => T): T => {
    const r = fn(ref.current!); setVersion(v => v + 1); persist();
    // ログイン中のユーザー自身が編集されたら（役割・紐づく作業員）、表示にも反映する
    const u = userRef.current; if (u) { const nu = ref.current!.users.find(x => x.id === u.id); if (nu && (nu.role !== u.role || nu.workerId !== u.workerId || nu.name !== u.name)) { setUser(nu); setUiState(x => ({ ...x, role: nu.role, me: nu.workerId })); } }
    return r;
  }, [persist]);
  const reset = useCallback(() => { ref.current = createInitialState(); ls.del(STORAGE_KEY); setUiState(u => ({ ...initialUI(), role: u.role, me: u.me })); setVersion(v => v + 1); }, []);
  const login = useCallback((userId: string) => { const u = ref.current!.users.find(x => x.id === userId && !x.stopped) || null; if (u) { setUser(u); ls.set(USER_KEY, u.id); setUiState(x => ({ ...initialUI(), role: u.role, me: u.workerId })); } return u; }, []);
  const logout = useCallback(() => { setUser(null); ls.del(USER_KEY); setUiState(initialUI()); }, []);
  const setUi = useCallback((patch: Partial<UIState> | ((u: UIState) => Partial<UIState>)) => { setUiState(u => ({ ...u, ...(typeof patch === 'function' ? patch(u) : patch) })); }, []);
  const setF = useCallback((key: string, k: string, v: string) => { setUiState(u => ({ ...u, f: { ...u.f, [key]: { ...(u.f[key] || {}), [k]: v } } })); }, []);
  const clearF = useCallback((key: string) => { setUiState(u => ({ ...u, f: { ...u.f, [key]: {} } })); }, []);
  const toast = useCallback((m: string) => { setMsg(m); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(null), 3200); }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const value = useMemo<Ctx>(() => ({ s: ref.current!, version, hydrated, user, login, logout, act, reset, ui, setUi, setF, clearF, toast }), [version, hydrated, user, login, logout, act, reset, ui, setUi, setF, clearF, toast]);
  return <StoreCtx.Provider value={value}>{children}{msg && <div id="toast" className="toast" role="status">{msg}</div>}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('StoreProvider がありません');
  return c;
}
