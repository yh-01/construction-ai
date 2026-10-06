/* 表示用の整形（HTMLモックの関数をそのまま移植） */
export const yen = (n: number) => (n < 0 ? '-' : '') + '¥' + Math.abs(Math.round(n)).toLocaleString('ja-JP');
export const num = (n: number | string) => Math.round(Number(n)).toLocaleString('ja-JP');
export const pct = (n: number, d = 1) => (isFinite(n) ? (n * 100).toFixed(d) : '-') + '%';
export const nk = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fromMin = (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
export const round025 = (x: number) => Math.round(x * 4) / 4;
export const hm = (m: number) => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
export const wd = (d: string) => '日月火水木金土'[new Date(d + 'T00:00:00').getDay()];
export const md = (d: string) => { const [, m, dd] = d.split('-'); return Number(m) + '/' + Number(dd); };
export const mdw = (d: string) => md(d) + '（' + wd(d) + '）';
export const fmtD = (d: string | null | undefined) => d ? d.replace(/-/g, '/') : '－';
export const fmtDate = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return fmtDate(x); };
export const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[\s　\-]/g, '').replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
export const uniq = <T,>(a: T[]) => [...new Set(a)];
export const monthDays = (ym: string) => { const [y, m] = ym.split('-').map(Number); const n = new Date(y, m, 0).getDate(); return Array.from({ length: n }, (_, i) => ym + '-' + String(i + 1).padStart(2, '0')); };
export const toNum = (v: string) => Number(String(v).replace(/[,，]/g, ''));
