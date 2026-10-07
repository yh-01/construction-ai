'use client';
/* S-07 勤怠集計・CSV出力 */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { PageHead, Modal, ModalHead, ModalFoot, downloadCsv } from '@/components/ui';
import { recCalc, isFinal } from '@/lib/calc';
import { TODAY, THIS_MONTH, PREV_MONTH } from '@/lib/data';
import { hm, nk, wd, md } from '@/lib/format';

export default function AttendancePage() {
  const { s, ui, setUi, toast } = useStore();
  const { go } = useNav();
  const [csv, setCsv] = useState(false);
  const month = ui.s07month;
  const C = s.company; const staff = s.workers.filter(w => w.kind === '社員' && w.flags?.att && !w.stopped);
  let alerts = 0, lvNg = 0;
  /* 月×社員の集計（表と CSV で共用） */
  const data = staff.map(w => {
    const recs = s.punches.filter(r => r.worker === w.id && r.date.startsWith(month) && isFinal(r));
    let days = 0, work = 0, over = 0, hol = 0, ninku = 0, internal = 0;
    recs.forEach(r => { const c = recCalc(r); if (c.open) return; days++; work += c.work; over += c.over; internal += c.internal; ninku += c.dayNinku; const d = wd(r.date); if (d === '土' || d === '日') hol += c.work; });
    const oh = over / 60; const ot = !!w.flags?.ot; const lvl = !ot ? null : oh >= C.m45 ? 'ng' : oh >= C.alert2 ? 'warn' : oh >= C.alert1 ? 'info' : null; if (lvl) alerts++;
    const lv = w.lv; const grant = lv?.grant ?? 0, used = lv?.used ?? 0; const need5 = grant >= 10; const lvShort = need5 && used < 5; if (lvShort) lvNg++;
    return { w, days, work, over, hol, ninku, internal, oh, ot, lvl, grant, used, need5, lvShort, cost: !!w.flags?.cost };
  });
  const rows = data.map(({ w, days, work, over, hol, ninku, internal, oh, ot, lvl, grant, used, need5, lvShort, cost }) => {
    const r36 = Math.min(1, oh / C.m45);
    return <tr key={w.id}><td>{w.name}<div className="small muted">{w.emp || ''}・{w.pay || ''}</div></td><td className="r num">{days}</td><td className="r num">{hm(work)}</td><td className="r num">{hm(over)}</td><td className="r num">0:00</td><td className="r num">{hm(hol)}</td><td className="r num">{cost ? hm(internal) : <span className="muted small">原価対象外</span>}</td><td className="r num">{cost ? nk(ninku) : '－'}</td>
      <td>{ot ? <><div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 130 }}><div className="meter" style={{ flex: 1 }}><i className={lvl === 'ng' ? 'over' : lvl === 'warn' ? 'warn' : ''} style={{ width: `${r36 * 100}%` }} /></div><span className="num small">{oh.toFixed(1)}/{C.m45}h</span></div>{lvl ? <span className={`badge ${lvl}`}>{lvl === 'ng' ? '上限' : lvl === 'warn' ? '警告' : '注意'}</span> : null}</> : <span className="small muted">対象外</span>}</td>
      <td className="small nw">{grant ? <>付与 {grant}日・取得 {used}日<br />{need5 ? (lvShort ? <span className="badge warn">年5日まであと{5 - used}日</span> : <span className="badge ok">年5日 達成</span>) : <span className="muted">年5日の義務なし</span>}</> : '－'}</td></tr>;
  });
  /* CSV：表に出している列をそのまま出す */
  const doCsv = () => {
    const head = ['氏名', '雇用形態', '給与形態', '出勤日数', '実労働時間', '残業', '深夜', '休日', 'うち社内作業', '人工', '36協定の残業時間', '有給付与', '取得'];
    const body = data.map(d => [d.w.name, d.w.emp || '', d.w.pay || '', d.days, hm(d.work), hm(d.over), '0:00', hm(d.hol), d.cost ? hm(d.internal) : '', d.cost ? nk(d.ninku) : '', d.ot ? d.oh.toFixed(1) : '', d.grant || '', d.grant ? d.used : '']);
    downloadCsv(`勤怠集計_${month}.csv`, [head, ...body]);
    toast(`${Number(month.slice(5))}月の勤怠集計（${data.length}人）をCSVに出力しました`); setCsv(false);
  };
  const ed = ui.role === '管理者' || ui.role === '経理';
  return <>
    <PageHead id="S-07" title="勤怠集計・CSV出力" sub={<><span className="tag kari">案1（颯を勤怠の正本にする）のときの画面</span> 承認済みの打刻から集計</>} acts={ed ? <button className="btn btn-primary btn-md" onClick={() => setCsv(true)}>CSV出力</button> : null} />
    <div className="kpis"><div className="kpi"><div className="klabel">対象の社員</div><div className="kval">{staff.length}人</div><div className="kfoot">作業員マスタで「勤怠集計の対象」の人</div></div>
      <div className="kpi"><div className="klabel">残業アラート（{Number(month.slice(5))}月）</div><div className="kval">{alerts}人</div><div className="kfoot">注意 {C.alert1}h／警告 {C.alert2}h／上限 {C.m45}h（<button className="lnk" onClick={() => go('S-10', { tab: '会社設定' })}>会社設定</button>）</div></div>
      <div className="kpi"><div className="klabel">有給 年5日の未達</div><div className="kval">{lvNg}人</div><div className="kfoot">年10日以上付与された人が対象</div></div></div>
    <div className="card"><div className="card-head"><h2 className="section-label">月×社員</h2><span className="cs">承認済みの打刻から集計。外部作業員（協力会社・一人親方）は出面なので出しません</span>
      <div className="r"><span className="seg">{[PREV_MONTH, THIS_MONTH].map(m => <button key={m} onClick={() => setUi({ s07month: m })} aria-pressed={month === m}>{Number(m.slice(5))}月</button>)}</span></div></div>
    <div className="tbl"><table><thead><tr><th>氏名</th><th className="r">出勤日数</th><th className="r">実労働時間</th><th className="r">残業</th><th className="r">深夜</th><th className="r">休日</th><th className="r">うち社内作業</th><th className="r">人工</th><th>36協定（月）</th><th>有給休暇</th></tr></thead><tbody>{rows}</tbody></table></div>
    <div className="card-body" style={{ borderTop: '1px solid var(--line-2)' }}><p className="note" style={{ margin: 0 }}>実労働＝出勤〜退勤−休憩。残業は1日8時間を超えた分の単純合計、休日は土日の勤務（法定休日と所定休日の区別・変形労働時間制の扱いはヒアリング：Q14）。給与計算は作りません。{month === THIS_MONTH ? `${Number(month.slice(5))}月は${md(TODAY)}までの承認済み分。` : ''}</p></div></div>
    {csv ? <Modal onClose={() => setCsv(false)}>
      <ModalHead title="CSV出力" cs="E-03" /><div className="card-body stack">
        <label className="fld">対象月<select value={month} onChange={e => setUi({ s07month: e.target.value })}>{[PREV_MONTH, THIS_MONTH].map(m => <option key={m} value={m}>{Number(m.slice(5))}月（{m.replace('-', '/')}）</option>)}</select></label>
        <label className="fld">出力形式<select><option>給与ソフト向け（ソフト名はヒアリングで確認）</option><option>社労士に渡している形式（ヒアリングで確認）</option><option>汎用CSV（全項目）</option></select></label>
        <p className="note" style={{ margin: 0 }}>【仮：Q15】給与ソフトの名前、または社労士に渡している形式をヒアリングで確認してから決めます。モックではどの形式を選んでも表と同じ項目を UTF-8（BOM付き）の CSV で出します。</p></div>
      <ModalFoot><button className="btn btn-secondary" onClick={() => setCsv(false)}>キャンセル</button><button className="btn btn-primary" onClick={doCsv}>出力する</button></ModalFoot>
    </Modal> : null}
  </>;
}
