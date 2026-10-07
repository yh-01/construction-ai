'use client';
/* 共通の小さな部品（HTMLモックの部品をそのままJSX化） */
import React, { useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { ROLES } from '@/lib/calc';

export function PageHead({ id, title, sub, acts }: { id: string; title: React.ReactNode; sub?: React.ReactNode; acts?: React.ReactNode }) {
  return <div className="page-head"><h1>{title}</h1><span className="sid">{id}</span>{sub ? <span className="sub">{sub}</span> : null}{acts ? <div className="acts">{acts}</div> : null}</div>;
}

const BADGE_CLS: Record<string, string> = { '与件': 'gray', '見積中': 'warn', '受注': 'info', '施工中': 'info', '完了': 'ok',
  '作成中': 'gray', '提出済': 'warn', '失注': 'gray', '入力済': 'warn', '中止': 'gray', '承認': 'ok', '確認': 'ok', '差戻し': 'ng' };
export function StatusBadge({ s }: { s: string }) {
  const label = ({ '承認': '承認済', '確認': '確認済' } as Record<string, string>)[s] || s;
  return <span className={`badge ${BADGE_CLS[s] || 'gray'}`}>{label}</span>;
}
export function VerBadge({ s }: { s: string }) { return s === '受注' ? <span className="badge ok">受注</span> : <StatusBadge s={s} />; }

/** 職長に原価を見せる注記【仮】 */
export function Kari() {
  const { ui } = useStore();
  if (ROLES[ui.role].cost !== 'kari') return null;
  return <> <span className="tag kari" title="職長に原価を見せるかはヒアリングで決めます">【仮】職長にも表示</span></>;
}

export function Meter({ r, cls }: { r: number; cls?: string }) {
  return <div className="meter"><i className={cls ?? (r > 1 ? 'over' : r > 0.85 ? 'warn' : '')} style={{ width: `${Math.min(100, r * 100)}%` }} /></div>;
}

export const IconSearch = () => <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;

export function TableCount({ n, total, unit }: { n: number; total: number; unit: string }) {
  return <span className="cs"><b className="num" style={{ color: 'var(--ink)' }}>{n}</b> {unit}{n !== total ? <span className="muted">（全{total}{unit}）</span> : null}</span>;
}
export function EmptyRow({ cols, onClear }: { cols: number; onClear: () => void }) {
  return <tr><td colSpan={cols}><div className="empty">条件に合うものがありません。<button className="lnk" onClick={onClear}>条件をクリア</button></div></td></tr>;
}

/* ---- モーダル ---- */
export function Modal({ children, size, onClose }: { children: React.ReactNode; size?: 'wide' | 'mid'; onClose: () => void }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, [onClose]);
  return <div className="modal" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className={`card ${size || ''}`} role="dialog" aria-modal="true">{children}</div></div>;
}
export function ModalHead({ title, cs, children }: { title: React.ReactNode; cs?: React.ReactNode; children?: React.ReactNode }) {
  return <div className="card-head"><h2 className="section-label">{title}</h2>{cs ? <span className="cs">{cs}</span> : null}{children}</div>;
}
export function ModalFoot({ children }: { children: React.ReactNode }) { return <div className="foot">{children}</div>; }

export type ConfirmSpec = { title: string; body: React.ReactNode; okLabel: string; onOk: () => void; danger?: boolean };
export function ConfirmModal({ spec, onClose }: { spec: ConfirmSpec; onClose: () => void }) {
  return <Modal onClose={onClose}>
    <div className="card-head"><h2 className="section-label">{spec.title}</h2></div><div className="card-body">{spec.body}</div>
    <div className="foot"><button className="btn btn-secondary" onClick={onClose}>キャンセル</button><button className={`btn ${spec.danger ? 'btn-danger solid' : 'btn-primary'}`} onClick={() => { onClose(); spec.onOk(); }}>{spec.okLabel}</button></div>
  </Modal>;
}

/* ---- その他メニュー ---- */
export type MenuItem = { label: string; onClick: () => void; danger?: boolean; disabled?: boolean; note?: string };
export function MoreMenu({ items, small, open, onToggle }: { items: MenuItem[]; small?: boolean; open: boolean; onToggle: () => void }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!(e.target as Element).closest('.menu-wrap')) onToggle(); };
    document.addEventListener('click', h, true); return () => document.removeEventListener('click', h, true);
  }, [open, onToggle]);
  return <div className="menu-wrap">
    <button className={`btn btn-secondary ${small ? 'btn-sm' : 'btn-md'}`} onClick={onToggle} aria-expanded={open} aria-haspopup="menu" aria-label={small ? 'その他の操作' : undefined}>{small ? '…' : 'その他 ▾'}</button>
    {open ? <div className="menu" role="menu">{items.map((i, k) => <button key={k} role="menuitem" className={i.danger ? 'danger' : ''} disabled={i.disabled} onClick={() => { onToggle(); i.onClick(); }}>{i.label}{i.note ? <small>{i.note}</small> : null}</button>)}</div> : null}
  </div>;
}

/** 「モックでは対象外」のトースト（見た目だけのボタン用） */
export function useNa() { const { toast } = useStore(); return () => toast('この操作はモックでは未対応です'); }

/** 行の点滅（追加した明細などに注目させる） */
export function useFlash(id: string | null, clear: () => void) {
  useEffect(() => { if (!id) return; const el = document.getElementById(id); if (el) { el.classList.add('flash'); el.scrollIntoView({ block: 'nearest' }); } clear(); }, [id, clear]);
}

/** 表の内容を UTF-8（BOM付き）の CSV にしてダウンロードする */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => { const t = String(v ?? ''); return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const body = rows.map(r => r.map(esc).join(',')).join('\r\n') + '\r\n';
  const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
