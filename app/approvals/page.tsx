'use client';
/* S-06 日次チェック・承認 */
import React, { useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { PageHead, StatusBadge } from '@/components/ui';
import { mySites, worker, partner, isExt, recCalc, recWarnings, isFinal, projByNo, siteName, siteShort, ninkuDisp } from '@/lib/calc';
import { approve, reject, approveAll } from '@/lib/store';
import { TODAY, SITE_INTERNAL } from '@/lib/data';
import { fromMin, hm, nk, md, mdw, fmtDate } from '@/lib/format';
import type { Punch } from '@/lib/types';

/** 現場の区間チップ（モックの segChips） */
function SegChips({ r }: { r: Punch }) {
  const { s } = useStore();
  return <>{r.segs.map((sg, i) => {
    const p = projByNo(s, sg.site); const bad = sg.site !== SITE_INTERNAL && p && !p.members.includes(r.worker);
    return <span key={i} className={`seg-chip ${sg.site === SITE_INTERNAL ? 'int' : ''} ${bad || !sg.end ? 'bad' : ''}`} title={siteName(s, sg.site)}>{siteShort(sg.site)}　{sg.start}–{sg.end || '？'}</span>;
  })}</>;
}

export default function ApprovalsPage() {
  const { s, ui, setUi, act, toast } = useStore();
  const { goMobile } = useNav();
  const sites = mySites(s, ui.role, ui.me); const siteNos = sites.map(p => p.no as string);
  // 選んでいる現場が自分の現場に無ければ「すべて」に戻す（モックの UI.s06site='all'）
  const site = ui.s06site !== 'all' && !siteNos.includes(ui.s06site) ? 'all' : ui.s06site;
  useEffect(() => { if (site !== ui.s06site) setUi({ s06site: site }); }, [site, ui.s06site, setUi]);
  const date = ui.s06date;
  const filt = (r: typeof s.punches[number]) => r.date === date && r.segs.some(sg => site === 'all' ? (ui.role !== '職長' || siteNos.includes(sg.site)) : sg.site === site);
  const recs = s.punches.filter(filt).sort((a, b) => ((isExt(s, a.worker) ? 1 : 0) - (isExt(s, b.worker) ? 1 : 0)) || a.worker.localeCompare(b.worker));
  const ed = ui.role === '管理者' || ui.role === '職長';
  const pend = recs.filter(r => r.status === '入力済');
  const okable = pend.filter(r => !recCalc(r).open);
  const prev = new Date(date + 'T00:00:00'); prev.setDate(prev.getDate() - 1); const next = new Date(date + 'T00:00:00'); next.setDate(next.getDate() + 1);

  const doApprove = (id: string) => {
    const r = act(st => approve(st, id));
    const n = Object.keys(recCalc(r).bySite).map(k => k + ' ' + nk(ninkuDisp(s, r, k)) + '人工').join('、');
    toast(worker(s, r.worker).name + 'さんの' + md(r.date) + 'を' + (isExt(s, r.worker) ? '確認' : '承認') + 'しました（' + n + '）。ロックし、労務費に反映');
  };
  const doReject = (id: string) => { const r = act(st => reject(st, id)); toast(worker(s, r.worker).name + 'さんの記録を差戻しました。本人のスマホに通知されます（想定）'); };
  const doApproveAll = () => { const k = act(st => approveAll(st, date, site, ui.role, ui.me)); toast(k + '件を承認・確認しました。労務費・外注支払・集計に反映されます'); };
  const toProxy = () => goMobile('M-05');

  return <>
    <PageHead id="S-06" title="日次チェック・承認" sub={ui.role === '職長' ? '自分が職長の現場' : ''} acts={ed ? <>{ui.role === '職長' ? <button className="btn btn-secondary btn-md" onClick={toProxy}>代理入力（M-05）</button> : null}<button className="btn btn-primary btn-md" onClick={doApproveAll} disabled={!okable.length}>表示中をまとめて承認・確認（{okable.length}件）</button></> : null} />
    <div className="card" style={{ marginBottom: 14 }}><div className="card-body"><div className="row">
      <button className="btn btn-secondary btn-sm" onClick={() => setUi({ s06date: fmtDate(prev) })}>← 前日</button>
      <input type="date" value={date} onChange={e => { if (e.target.value) setUi({ s06date: e.target.value > TODAY ? TODAY : e.target.value }); }} aria-label="日付" />
      <button className="btn btn-secondary btn-sm" onClick={() => setUi({ s06date: fmtDate(next) })} disabled={date >= TODAY}>翌日 →</button>
      <span className="muted small" style={{ marginLeft: 6 }}>{mdw(date)}{date === TODAY ? '（今日）' : ''}</span>
      <label className="small muted" style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600, marginLeft: 'auto' }}>現場<select value={site} onChange={e => setUi({ s06site: e.target.value })}><option value="all">{ui.role === '職長' ? '自分の現場すべて' : 'すべての現場'}</option>{sites.map(p => <option key={p.no as string} value={p.no as string}>{p.no} {p.title}</option>)}</select></label>
    </div></div></div>
    <div className="card"><div className="tbl"><table><thead><tr><th>作業員</th><th>出勤</th><th>退勤</th><th>現場の区間</th><th>休憩</th><th>実働</th><th className="r">人工{site === 'all' ? '（1日）' : '（この現場）'}</th><th>状態</th><th>警告</th><th>操作</th></tr></thead>
      <tbody>{recs.length ? recs.map(r => {
        const w = worker(s, r.worker), c = recCalc(r), warns = recWarnings(s, r), ext = isExt(s, r.worker);
        const locked = isFinal(r);
        const n = ninkuDisp(s, r, site);   // 社員は実働÷所定時間を0.25に丸めて表示
        let ops: React.ReactNode = null;
        if (ed && !locked) {
          ops = <>
            {c.open ? <><span className="small muted">退勤なし：差戻しか代理入力で直す</span><br /></> : <><button className="btn btn-secondary btn-sm" onClick={() => doApprove(r.id)}>{ext ? '確認' : '承認'}</button> </>}
            {r.status === '差戻し' ? null : <button className="btn btn-danger btn-sm" onClick={() => doReject(r.id)}>差戻し</button>}
          </>;
        } else if (locked) ops = <span className="tag lock">ロック</span>;
        return <tr key={r.id} className={ext ? 'ext' : ''}><td className="nw"><b style={{ color: 'var(--ink)' }}>{w.name}</b> <span className={`tag ${ext ? 'ext' : 'staff'}`}>{ext ? w.kind : '社員'}</span>{ext ? <div className="small muted">{partner(s, w.org).name}</div> : null}{r.proxy ? <div className="small muted">代理入力：{worker(s, r.proxy.by).name}（{r.proxy.reason}）</div> : null}{r.src ? <div className="small muted">共用端末で打刻</div> : null}</td>
          <td className="num">{c.start !== null ? fromMin(c.start) : '－'}</td><td className="num">{c.end !== null ? fromMin(c.end) : <span style={{ color: 'var(--ng-tx)' }}>－</span>}</td>
          <td><SegChips r={r} /></td><td className="num">{c.breakMin ? c.breakMin + '分' : '－'}</td><td className="num">{c.open ? '－' : hm(c.work)}</td><td className="r num"><b>{c.open ? '－' : nk(n)}</b></td>
          <td><StatusBadge s={r.status} /></td><td>{warns.map((x, i) => <span key={i} className="warnline">⚠ {x}</span>)}{r.fix ? <span className="warnline" title={`${md(r.fix.at)} に本人から`}>⚠ 修正依頼：{r.fix.reason}</span> : null}</td><td className="nw">{ops}</td></tr>;
      }) : <tr><td colSpan={10} className="muted" style={{ textAlign: 'center', padding: 24 }}>この日の打刻はありません</td></tr>}</tbody></table></div>
    <div className="card-body" style={{ borderTop: '1px solid var(--line-2)' }}><p className="note" style={{ margin: 0 }}>社員は「承認」、協力会社・一人親方は「確認（検収）」。外部の時刻は職長が書き換えず、差戻して本人（協力会社）に直してもらいます。承認・確認するとその日の記録はロックされ、労務費・集計に反映されます。<br />人工【仮：Q6】：1日8時間＝1.0人工、複数現場は時間按分、0.25人工単位で丸め。社内作業は人工に含めない。</p></div></div>
  </>;
}
