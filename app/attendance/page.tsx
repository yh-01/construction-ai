'use client';
/* S-07 勤怠集計・CSV出力（v1.1：時間外・深夜・法定休日、賃金相当額、月次の差異） */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { PageHead, Modal, ModalHead, ModalFoot, downloadCsv } from '@/components/ui';
import { recCalc, isFinal, wageAll } from '@/lib/calc';
import { setPayroll } from '@/lib/store';
import { TODAY, THIS_MONTH, PREV_MONTH, SITE_INTERNAL } from '@/lib/data';
import { hm, nk, md, num, yen, round025 } from '@/lib/format';

export default function AttendancePage() {
  const { s, ui, setUi, act, toast } = useStore();
  const { go } = useNav();
  const [csv, setCsv] = useState(false);
  const month = ui.s07month;
  const C = s.company; const staff = s.workers.filter(w => w.kind === '社員' && w.flags?.att && !w.stopped); const W = wageAll(s);
  const wv = ['管理者', '経理'].includes(ui.role);   // 賃金は管理者・経理だけ
  let alerts = 0, lvNg = 0, totWage = 0, totCost = 0;
  /* 月×社員の集計（表と CSV で共用） */
  const data = staff.map(w => {
    const recs = s.punches.filter(r => r.worker === w.id && r.date.startsWith(month) && isFinal(r));
    let days = 0, work = 0, ot = 0, night = 0, hol = 0, ninku = 0, internal = 0, wage = 0, cost = 0;
    recs.forEach(r => { const c = recCalc(r); if (c.open) return; const x = W.get(r); if (!x) return; days++; work += x.work; ot += x.otMin; night += x.night; hol += x.holMin; internal += c.internal;
      ninku += Object.entries(x.site).filter(([k]) => k !== SITE_INTERNAL).reduce((t, [, v]) => t + v.ninku, 0); wage += x.wageAmt; cost += x.costB; });
    const costOn = !!w.flags?.cost;
    totWage += wage; totCost += costOn ? cost : 0;
    const oh = ot / 60; const otf = !!w.flags?.ot; const lvl = !otf ? null : oh >= C.m45 ? 'ng' : oh >= C.alert2 ? 'warn' : oh >= C.alert1 ? 'info' : null; if (lvl) alerts++;
    const lv = w.lv; const grant = lv?.grant ?? 0, used = lv?.used ?? 0; const need5 = grant >= 10; const lvShort = need5 && used < 5; if (lvShort) lvNg++;
    return { w, days, work, ot, night, hol, ninku, internal, wage, cost, oh, otf, lvl, grant, used, need5, lvShort, costOn };
  });
  const rows = data.map(({ w, days, work, ot, night, hol, ninku, internal, wage, oh, otf, lvl, grant, used, need5, lvShort, costOn }) => {
    const r36 = Math.min(1, oh / C.m45);
    return <tr key={w.id}><td>{w.name}<div className="small muted">{w.emp || ''}・{w.pay || ''}</div></td><td className="r num">{days}</td><td className="r num">{hm(work)}</td><td className="r num">{hm(ot)}</td><td className="r num">{hm(night)}</td><td className="r num">{hm(hol)}</td><td className="r num">{costOn ? hm(internal) : <span className="muted small">原価対象外</span>}</td><td className="r num">{costOn ? nk(round025(ninku)) : '－'}</td>
      {wv ? <td className="r num">{num(wage)}</td> : null}
      <td>{otf ? <><div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 130 }}><div className="meter" style={{ flex: 1 }}><i className={lvl === 'ng' ? 'over' : lvl === 'warn' ? 'warn' : ''} style={{ width: `${r36 * 100}%` }} /></div><span className="num small">{oh.toFixed(1)}/{C.m45}h</span></div>{lvl ? <span className={`badge ${lvl}`}>{lvl === 'ng' ? '上限' : lvl === 'warn' ? '警告' : '注意'}</span> : null}</> : <span className="small muted">対象外</span>}</td>
      <td className="small nw">{grant ? <>付与 {grant}日・取得 {used}日<br />{need5 ? (lvShort ? <span className="badge warn">年5日まであと{5 - used}日</span> : <span className="badge ok">年5日 達成</span>) : <span className="muted">年5日の義務なし</span>}</> : '－'}</td></tr>;
  });
  /* CSV：表に出している列をそのまま出す（賃金相当額は管理者・経理のときだけ） */
  const doCsv = () => {
    const head = ['氏名', '雇用形態', '給与形態', '出勤日数', '実労働時間', '時間外', '深夜', '法定休日', 'うち社内作業', '人工', ...(wv ? ['賃金相当額'] : []), '36協定の残業時間', '有給付与', '取得'];
    const body = data.map(d => [d.w.name, d.w.emp || '', d.w.pay || '', d.days, hm(d.work), hm(d.ot), hm(d.night), hm(d.hol), d.costOn ? hm(d.internal) : '', d.costOn ? nk(round025(d.ninku)) : '', ...(wv ? [d.wage] : []), d.otf ? d.oh.toFixed(1) : '', d.grant || '', d.grant ? d.used : '']);
    downloadCsv(`勤怠集計_${month}.csv`, [head, ...body]);
    toast(`${Number(month.slice(5))}月の勤怠集計（${data.length}人）をCSVに出力しました`); setCsv(false);
  };
  const ed = ui.role === '管理者' || ui.role === '経理';
  /* 月次の差異（経理向け）：給与ソフトの実額は手入力（store の payroll） */
  const pr = s.payroll[month] || { gross: '', burden: '' };
  const prTot = (Number(pr.gross) || 0) + (Number(pr.burden) || 0); const diff = prTot ? prTot - totCost : null;
  const prIn = (k: 'gross' | 'burden', v: string) => act(st => setPayroll(st, month, k, v));
  const variance = wv ? <div className="card" style={{ marginTop: 14 }}><div className="card-head"><h2 className="section-label">月次の差異（経理向け）</h2><span className="tag kari">△ 表示だけ。調整はしない</span><span className="cs">給与ソフトの実額と、颯がB方式で計上した額（工事＋社内作業）の差</span></div>
    <div className="card-body"><div className="form" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
      <label>給与ソフトの総支給（原価対象の社員）<input value={pr.gross} onChange={e => prIn('gross', e.target.value)} inputMode="numeric" placeholder="手入力" /></label>
      <label>会社負担（社会保険など）<input value={pr.burden} onChange={e => prIn('burden', e.target.value)} inputMode="numeric" placeholder="手入力" /></label>
      <label>颯で計上した額（B・会社負担込み）<input value={num(totCost)} disabled /></label>
      <label>差異（実額 − 計上額）<input value={diff === null ? '実額を入れると表示' : (diff >= 0 ? '＋' : '−') + num(Math.abs(diff))} disabled /></label></div>
      <p className="note">差異の主な内訳の候補：有給休暇（打刻がないので計上されない）、休業手当、賞与（引当率0%のとき）、Bに入れていない手当（通勤・家族など）、会社負担率の概算との差。差を工事に配り直すか（C方式）は税理士に確認してから決めます（Phase2候補）。原価対象外の社員（事務など）は、総支給から除いて入力してください。</p></div></div> : null;
  return <>
    <PageHead id="S-07" title="勤怠集計・CSV出力" sub={<><span className="tag kari">案1（颯を勤怠の正本にする）のときの画面</span> 承認済みの打刻から集計</>} acts={ed ? <button className="btn btn-primary btn-md" onClick={() => setCsv(true)}>CSV出力</button> : null} />
    <div className="kpis"><div className="kpi"><div className="klabel">対象の社員</div><div className="kval">{staff.length}人</div><div className="kfoot">作業員マスタで「勤怠集計の対象」の人</div></div>
      <div className="kpi"><div className="klabel">残業アラート（{Number(month.slice(5))}月）</div><div className="kval">{alerts}人</div><div className="kfoot">注意 {C.alert1}h／警告 {C.alert2}h／上限 {C.m45}h（<button className="lnk" onClick={() => go('S-10', { tab: '会社設定' })}>会社設定</button>）</div></div>
      <div className="kpi"><div className="klabel">有給 年5日の未達</div><div className="kval">{lvNg}人</div><div className="kfoot">年10日以上付与された人が対象</div></div>
      {wv ? <div className="kpi"><div className="klabel">賃金相当額（{Number(month.slice(5))}月）</div><div className="kval">{yen(totWage)}</div><div className="kfoot">原価計算用。給与明細ではない</div></div> : null}</div>
    <div className="card"><div className="card-head"><h2 className="section-label">月×社員</h2><span className="cs">承認済みの打刻から集計。外部作業員（協力会社・一人親方）は出面なので出しません</span>
      <div className="r"><span className="seg">{[PREV_MONTH, THIS_MONTH].map(m => <button key={m} onClick={() => setUi({ s07month: m })} aria-pressed={month === m}>{Number(m.slice(5))}月</button>)}</span></div></div>
    <div className="tbl"><table><thead><tr><th>氏名</th><th className="r">出勤日数</th><th className="r">実労働時間</th><th className="r">時間外</th><th className="r">深夜</th><th className="r">法定休日</th><th className="r">うち社内作業</th><th className="r">人工</th>{wv ? <th className="r">賃金相当額<br /><span style={{ fontWeight: 400 }}>原価計算用・給与明細ではない</span></th> : null}<th>36協定（月）</th><th>有給休暇</th></tr></thead><tbody>{rows}</tbody></table></div>
    <div className="card-body" style={{ borderTop: '1px solid var(--line-2)' }}><p className="note" style={{ margin: 0 }}>実労働＝出勤〜退勤−休憩。時間外＝1日8時間超＋週40時間超（週は日曜はじまり）。法定休日＝休日カレンダーの法定休日（毎週日曜）の勤務。深夜＝22時〜5時。賃金相当額は労務費（B方式）の計算に使う額で、給与計算はしません（変形労働時間制・各種手当の扱いはヒアリング：Q14）。{month === THIS_MONTH ? `${Number(month.slice(5))}月は${md(TODAY)}までの承認済み分。` : ''}</p></div></div>
    {variance}
    {csv ? <Modal onClose={() => setCsv(false)}>
      <ModalHead title="CSV出力" cs="E-03" /><div className="card-body stack">
        <label className="fld">対象月<select value={month} onChange={e => setUi({ s07month: e.target.value })}>{[PREV_MONTH, THIS_MONTH].map(m => <option key={m} value={m}>{Number(m.slice(5))}月（{m.replace('-', '/')}）</option>)}</select></label>
        <label className="fld">出力形式<select><option>給与ソフト向け（ソフト名はヒアリングで確認）</option><option>社労士に渡している形式（ヒアリングで確認）</option><option>汎用CSV（全項目）</option></select></label>
        <p className="note" style={{ margin: 0 }}>【仮：Q15】給与ソフトの名前、または社労士に渡している形式をヒアリングで確認してから決めます。モックではどの形式を選んでも表と同じ項目を UTF-8（BOM付き）の CSV で出します。</p></div>
      <ModalFoot><button className="btn btn-secondary" onClick={() => setCsv(false)}>キャンセル</button><button className="btn btn-primary" onClick={doCsv}>出力する</button></ModalFoot>
    </Modal> : null}
  </>;
}
