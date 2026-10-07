/* サンプル画像（打ち合わせメモの写真・工程表）。HTMLモックのSVGをそのまま */
import React from 'react';
import type { Project } from '@/lib/types';
import { TODAY } from '@/lib/data';

export function MemoSVG({ i }: { i: number }) {
  const lines = [['冷却水 往き/還り 50A', '既設から分岐 ×2', '（成形機 #4〜#6）'], ['ルート：天井 梁下', '高さ 4.2m 足場要', '停止は日曜のみ'], ['架台 10か所', 'フランジ接続', '保温なし'], ['搬入口 W3.0m', 'フォーク使用可', '']][i % 4];
  return <svg viewBox="0 0 150 110" role="img" aria-label="打ち合わせメモの写真（サンプル）"><rect width="150" height="110" fill="#E9E4D6" /><rect x="10" y="6" width="130" height="98" fill="#FBF8EF" transform="rotate(-2 75 55)" />
    {[0, 1, 2, 3, 4, 5, 6].map(k => <line key={k} x1="16" x2="136" y1={22 + k * 12} y2={20 + k * 12} stroke="#C9D7E6" strokeWidth=".6" />)}
    {lines.map((t, k) => <text key={k} x="20" y={30 + k * 16} fontSize="9" fill="#2B3A55" fontFamily="cursive" transform="rotate(-2 75 55)">{t}</text>)}</svg>;
}
export function BigMemoSVG() {
  const lines = ['9/28 清見製紙 2工場 保全 望月様', 'ボイラー給水 配管 更新', 'SGP40A → SUS40A 10S  約60m?', '仕切弁 40A × 6 交換', '停止 11/21〜11/23 のみ', 'H3.5m ローリングOK / 火気届', '見積 10/16 まで', '既設図 → 後日'];
  return <svg viewBox="0 0 300 230" role="img" aria-label="打ち合わせメモの写真（サンプル）"><rect width="300" height="230" fill="#E4DED0" /><rect x="18" y="10" width="264" height="210" fill="#FBF8EF" transform="rotate(-1.5 150 115)" />
    {lines.map((_, k) => <line key={k} x1="28" x2="272" y1={40 + k * 22} y2={38 + k * 22} stroke="#C9D7E6" strokeWidth=".7" />)}
    {lines.map((t, k) => <text key={k} x="32" y={35 + k * 22} fontSize="13" fill="#24324D" fontFamily="cursive" transform="rotate(-1.5 150 115)">{t}</text>)}</svg>;
}
/* 先方がLINEで共有しているExcelのスクリーンショットに見立てた画像（サンプル） */
export function SchedSVG({ p, ver }: { p: Project; ver: number }) {
  type T = [string, number, number, number?];
  const tasks: T[] = p.no === '2026-0115'
    ? [['養生・足場', 0, 2], ['既設配管 撤去', 1, 3], ['支持金物 取付', 2, 4], ['蒸気配管 敷設', 3, 7], ['溶接・非破壊検査', 5, 8], ['保温', 7, 9], ['耐圧試験', 8.5, 9.2, 1], ['試運転', 9.3, 10, 1]]
    : p.no === '2026-0112'
    ? [['旧プレス機 解体', 0, 2], ['搬出（ラフター）', 1.5, 2.5, 1], ['基礎はつり・補修', 2.5, 4], ['新プレス機 搬入', 4, 4.6, 1], ['据付・芯出し', 4.6, 6.5], ['油圧・冷却配管', 5.5, 8], ['追加：油圧配管延長', 7, 8.5], ['試運転・立会', 8.6, 9.4, 1]]
    : [['準備・搬入計画', 0, 2], ['搬入', 2, 3, 1], ['据付', 3, 6], ['配管接続', 5, 8], ['試運転', 8.5, 9.5, 1]];
  const W = 640, rowH = 22, top = 44, left = 150, cols = 10, cw = (W - left - 10) / cols;
  const start = p.period ? new Date(p.period[0] + 'T00:00:00') : new Date(TODAY + 'T00:00:00');
  const H = top + tasks.length * rowH + 30;
  return <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="工程表の画像（サンプル）" fontFamily="Meiryo, 'Yu Gothic', sans-serif">
    <rect width={W} height={H} fill="#fff" />
    <text x="10" y="16" fontSize="12" fontWeight="700" fill="#000">{p.title}　工程表（第{ver}版）</text>
    <rect x="0" y="24" width={W} height="20" fill="#E7E6E6" /><text x="10" y="38" fontSize="10.5" fill="#000">作業項目</text>
    {Array.from({ length: cols }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i * 7); return <g key={i}><text x={left + i * cw + 4} y="38" fontSize="10" fill="#000">{d.getMonth() + 1}/{d.getDate()}</text><line x1={left + i * cw} x2={left + i * cw} y1="24" y2={top + tasks.length * rowH} stroke="#D4D4D4" /></g>; })}
    {tasks.map((t, i) => { const y = top + i * rowH; return <g key={i}><line x1="0" x2={W} y1={y + rowH} y2={y + rowH} stroke="#D4D4D4" /><text x="10" y={y + 15} fontSize="10.5" fill="#000">{t[0]}</text>
      <rect x={left + t[1] * cw} y={y + 5} width={(t[2] - t[1]) * cw} height={rowH - 10} fill={t[3] ? '#F4B183' : '#9BC2E6'} stroke={t[3] ? '#C55A11' : '#2F75B5'} strokeWidth=".6" /></g>; })}
    <text x="10" y={top + tasks.length * rowH + 20} fontSize="9.5" fill="#595959">※ Excelで作成した工程表のスクリーンショット（サンプル）</text></svg>;
}
