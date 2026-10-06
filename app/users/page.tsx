'use client';
/* S-11 ユーザー・権限（見た目だけ） */
import React from 'react';
import { PageHead, useNa } from '@/components/ui';

const M = [['与件・見積・案件（S-01〜05・12・13）', '◎', '閲覧', '◎（担当案件）', '－', '－'], ['原価・単価・粗利の表示', '◎', '閲覧', '【仮】', '－', '－'], ['S-06 日次チェック', '◎', '閲覧', '◎（担当現場）', '－', '－'],
  ['S-07 勤怠集計', '◎', '◎', '－', '－', '－'], ['S-08 外注支払', '◎', '◎', '－', '－', '－'], ['S-10 マスタ', '◎', '一部', '－', '－', '－'], ['M-02〜04 打刻・工程表', '－', '－', '◎', '◎', '◎（自分・自社のみ）'], ['M-05 代理入力', '－', '－', '◎', '－', '－']];
const USERS = [['川口（管理者）', '経営者・管理者'], ['経理担当', '経理'], ['佐藤 健一', '施工管理・職長'], ['田中 誠', '施工管理・職長'], ['鈴木 大輔', '社員職人'], ['渡辺 剛（山北設備）', '協力会社・一人親方']];

export default function UsersPage() {
  const na = useNa();
  return <>
    <PageHead id="S-11" title="ユーザー・権限" sub="見た目だけ" acts={<button className="btn btn-secondary btn-md" onClick={na}>＋ ユーザーを追加</button>} />
    <div className="grid2"><div className="card"><div className="card-head"><h2 className="section-label">ユーザー</h2></div><div className="tbl"><table><thead><tr><th>氏名</th><th>役割</th><th></th></tr></thead><tbody>{USERS.map(u => <tr key={u[0]}><td>{u[0]}</td><td>{u[1]}</td><td><button className="btn btn-secondary btn-sm" onClick={na}>編集</button></td></tr>)}</tbody></table></div></div>
    <div className="card"><div className="card-head"><h2 className="section-label">画面×役割</h2><span className="cs">画面設計§6</span></div><div className="tbl"><table><thead><tr><th>画面</th><th>管理者</th><th>経理</th><th>職長</th><th>社員職人</th><th>協力会社</th></tr></thead><tbody>{M.map(r => <tr key={r[0]}>{r.map((x, i) => <td key={i} className={`${i ? 'c' : ''} small`}>{x}</td>)}</tr>)}</tbody></table></div>
    <div className="card-body"><p className="note" style={{ margin: 0 }}>◎＝操作可。職長に原価・粗利を見せるかはヒアリングで決めます（モックでは【仮】の注記つきで表示）。</p></div></div></div>
  </>;
}
