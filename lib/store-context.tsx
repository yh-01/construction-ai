'use client';
/* =========================================================
   ブラウザ内の状態（React Context）。リロードで初期状態に戻る
   - state：業務データ（lib/store.ts の関数で書き換える）
   - ui：画面をまたいで持つ表示状態（役割・デモ時刻・フィルター など）
   - toast：操作結果のメッセージ
   ========================================================= */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AppState, Role } from './types';
import { createInitialState } from './store';
import { TODAY } from './data';

export type KioskUI = { site: string; sel: Record<string, boolean>; clock: string; brk: string; mode: 'move' | 'out' | null; mins?: number };
export type ProxyUI = { worker: string; site: string; start: string; end: string; brk: number; reason: string };
export type UIState = {
  role: Role;
  lastPc: string;                       // PC表示に戻るときのパス
  lastMobile: string;                   // スマホ表示に戻るときの画面ID
  clock: Record<string, string>;        // デモ用の打刻時刻 {作業員: 時刻}
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
  role: '管理者', lastPc: '/leads/', lastMobile: 'M-02', clock: {}, planSite: {},
  kiosk: { site: '2026-0112', sel: {}, clock: '08:00', brk: 'std', mode: null },
  m05: { worker: '', site: '', start: '08:00', end: '17:00', brk: 60, reason: 'スマホがない' },
  m04site: null, s05tab: '概要', s06date: TODAY, s06site: 'all', s07month: '2026-10', s08month: '2026-10',
  s03mode: '社内', estClosed: {}, masterOpen: true, f: { s12: { st: 'active' }, s01: { st: 'active' } }, sort: {}, costFrom: null,
});

type Ctx = {
  s: AppState;
  version: number;
  /** 状態を書き換える。fn の中で lib/store.ts の関数を呼ぶ */
  act: <T,>(fn: (s: AppState) => T) => T;
  reset: () => void;
  ui: UIState;
  setUi: (patch: Partial<UIState> | ((u: UIState) => Partial<UIState>)) => void;
  setF: (key: string, k: string, v: string) => void;
  clearF: (key: string) => void;
  toast: (msg: string) => void;
};
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<AppState | null>(null);
  if (!ref.current) ref.current = createInitialState();
  const [version, setVersion] = useState(0);
  const [ui, setUiState] = useState<UIState>(initialUI);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const act = useCallback(<T,>(fn: (s: AppState) => T): T => { const r = fn(ref.current!); setVersion(v => v + 1); return r; }, []);
  const reset = useCallback(() => { ref.current = createInitialState(); setUiState(initialUI()); setVersion(v => v + 1); }, []);
  const setUi = useCallback((patch: Partial<UIState> | ((u: UIState) => Partial<UIState>)) => { setUiState(u => ({ ...u, ...(typeof patch === 'function' ? patch(u) : patch) })); }, []);
  const setF = useCallback((key: string, k: string, v: string) => { setUiState(u => ({ ...u, f: { ...u.f, [key]: { ...(u.f[key] || {}), [k]: v } } })); }, []);
  const clearF = useCallback((key: string) => { setUiState(u => ({ ...u, f: { ...u.f, [key]: {} } })); }, []);
  const toast = useCallback((m: string) => { setMsg(m); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(null), 3200); }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo<Ctx>(() => ({ s: ref.current!, version, act, reset, ui, setUi, setF, clearF, toast }), [version, act, reset, ui, setUi, setF, clearF, toast]);
  return <StoreCtx.Provider value={value}>{children}{msg && <div id="toast" className="toast" role="status">{msg}</div>}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('StoreProvider がありません');
  return c;
}
