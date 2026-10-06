'use client';
/* S-05 工程表タブ：画像・PDFの添付（閲覧のみ） */
import React from 'react';
import { useStore } from '@/lib/store-context';
import { SchedSVG } from '@/components/svgs';
import { ROLES } from '@/lib/calc';
import { addSchedule } from '@/lib/store';
import type { Project } from '@/lib/types';
import { TODAY } from '@/lib/data';
import { md } from '@/lib/format';

export function Sched({ p }: { p: Project }) {
  const { s, ui, act, toast } = useStore();
  const vs = s.schedules[p.no!] || []; const ed = ROLES[ui.role].edit;
  const latest = vs[vs.length - 1];
  const add = () => { const n = act(st => addSchedule(st, p.no!, md(TODAY))); toast('第' + n + '版として添付しました（サンプル画像）。打刻画面にも最新版が出ます'); };
  return <div className="grid2" style={{ gridTemplateColumns: 'minmax(0,1.8fr) minmax(0,1fr)' }}>
    <div className="card"><div className="card-head"><h2 className="section-label">工程表（最新版）</h2><span className="cs">F-01　画像・PDFを添付。最新版が打刻画面に出ます</span></div><div className="card-body">
      {latest ? <div className="att"><div className="att-cap">{latest.name}　第{latest.ver}版　{md(latest.date)} 添付</div><SchedSVG p={p} ver={latest.ver} /></div> : <div className="placeholder">工程表はまだ添付されていません</div>}</div></div>
    <div className="card"><div className="card-head"><h2 className="section-label">履歴</h2></div><div className="card-body">
      {ed ? <button className="btn btn-soft btn-md" onClick={add} style={{ marginBottom: 10 }}>＋ 画像・PDFをアップロード</button> : null}
      <table><thead><tr><th>版</th><th>ファイル</th><th>添付日</th></tr></thead><tbody>{vs.length ? vs.slice().reverse().map((v, i) => <tr key={v.ver}><td>第{v.ver}版{i === 0 ? <> <span className="badge info">最新</span></> : null}</td><td className="small">{v.name}</td><td className="nw">{md(v.date)}</td></tr>) : <tr><td colSpan={3} className="muted">なし</td></tr>}</tbody></table>
      <p className="note">工程表の作成機能は作りません（Phase1は閲覧のみ）。</p></div></div></div>;
}
