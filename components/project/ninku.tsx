'use client';
/* S-05 人工タブ（v0.1.7）：この現場の打刻を日別×作業員で一覧。社員は打刻から計算した賃金相当額（B）か人工×標準単価（A）、
   外部は人工×常用単価。社員の行を押すと計算の内訳（管理者・経理のみ） */
import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { TableCount } from '@/components/ui';
import { FilterBar, useFilter } from '@/components/filter';
import { ROLES, worker, partner, isExt, isFinal, recCalc, rateOf, wageAll, laborB, isLegalHol, isDayRate } from '@/lib/calc';
import type { Project, Punch } from '@/lib/types';
import { THIS_MONTH, SITE_INTERNAL } from '@/lib/data';
import { hm, mdw, nk, num, yen, round025 } from '@/lib/format';

type Tot = { n: number; c: number; base: number; ot: number; night: number; hol: number; bur: number; min: number };
const tot0 = (): Tot => ({ n: 0, c: 0, base: 0, ot: 0, night: 0, hol: 0, bur: 0, min: 0 });

export function Ninku({ p }: { p: Project }) {
  const { s, ui } = useStore();
  const { go } = useNav();
  const K = 'nk-' + p.no; const F = useFilter(K);
  const mon = F.fv('mon');
  useEffect(() => { if (!mon) F.set('mon', THIS_MONTH); }, [mon]); // eslint-disable-line react-hooks/exhaustive-deps
  const [nkOpen, setNkOpen] = useState<string | null>(null);   // 開いている行（日付＋作業員ID）
  const ym = mon || THIS_MONTH; const no = p.no!;
  const cv = ROLES[ui.role].cost !== 'hide'; const wv = ['管理者', '経理'].includes(ui.role); const W = wageAll(s); const B = laborB(s);
  const recsAll = s.punches.filter(r => r.date.startsWith(ym) && recCalc(r).bySite[no]);
  const recs = recsAll.filter(r => F.fSel('kind', isExt(s, r.worker) ? '外部' : '社員') && F.fText('kw', worker(s, r.worker).name, isExt(s, r.worker) ? partner(s, worker(s, r.worker).org).name : '') && (F.fv('st') !== 'final' || isFinal(r)))
    .sort((a, b) => a.date.localeCompare(b.date) || (Number(isExt(s, a.worker)) - Number(isExt(s, b.worker))) || a.worker.localeCompare(b.worker));
  const T = { s: tot0(), e: tot0() }; let pend = 0;
  const show = (fin: boolean, v: number) => fin ? (v ? num(v) : <span className="muted">0</span>) : <span className="small muted">－</span>;

  const rowsH: React.ReactNode[] = [];
  recs.forEach((r: Punch) => {
    const ext = isExt(s, r.worker), fin = isFinal(r), c = recCalc(r); const key = r.date + r.worker; const open = nkOpen === key; const w = worker(s, r.worker);
    let cells: React.ReactNode; let detail: React.ReactNode = null;
    if (ext) {
      const n = c.bySite[no], min = c.siteMin[no] || 0; const cost = fin ? n * rateOf(s, r.worker, r.date) : 0; if (fin) { T.e.n += n; T.e.c += cost; T.e.min += min; } else pend += n;
      cells = <><td className="r num">{hm(min)}</td><td className="r num">{nk(n)}</td>{cv ? <>{wv ? <td className="r muted small" colSpan={5}>人工×常用単価 {num(rateOf(s, r.worker, r.date))}（割増は区分しない）</td> : null}<td className="r num">{fin ? num(cost) : <span className="small muted">未計上</span>}</td></> : null}</>;
    } else {
      const x = W.get(r); const st = x && x.site[no]; if (!x || !st) return;
      if (fin) { T.s.n += st.ninku; T.s.c += st.cost; T.s.min += st.min; T.s.base += st.base; T.s.ot += st.ot; T.s.night += st.night; T.s.hol += st.hol; T.s.bur += st.burden; } else pend += st.ninku;
      cells = <><td className="r num">{hm(st.min)}</td><td className="r num">{nk(round025(st.ninku))}</td>{cv ? <>{wv ? (B ? <><td className="r num">{show(fin, st.base)}</td><td className="r num">{show(fin, st.ot)}</td><td className="r num">{show(fin, st.night)}</td><td className="r num">{show(fin, st.hol)}</td><td className="r num">{show(fin, st.burden)}</td></> : <td className="r muted small" colSpan={5}>A：人工 {st.ninku.toFixed(3)} × 標準単価 {num(x.std)}（割増なし）</td>) : null}<td className="r num">{fin ? <b>{num(st.cost)}</b> : <span className="small muted">未計上</span>}</td></> : null}</>;
      if (open && wv && cv) {
        const others = Object.entries(x.site).filter(([k]) => k !== no).map(([k, v]) => `${k === SITE_INTERNAL ? '社内作業' : k} ${hm(v.min)}`).join('、');
        detail = <tr key={key + '-det'} className="nkdet"><td colSpan={wv && cv ? 10 : cv ? 5 : 4}><div className="calcbox">
          <div><b>{w.name}</b>　{mdw(r.date)}{isLegalHol(r.date) ? <> <span className="badge warn">法定休日</span></> : null}　{w.pay} {num(x.wage)}円　就業ルール：{x.ruleName}（所定 {x.sh / 60}時間）</div>
          <div className="calcgrid">
            <span>時間単価</span><b className="num">{num(Math.round(x.hr))}円</b><span className="muted small">{isDayRate(w) ? `日給 ${num(x.wage)} ÷ 所定 ${x.sh / 60}時間` : w.pay === '月給' ? `（月給 ${num(x.wage)} − 除外手当 ${num(w.excl || 0)}）÷ 月平均の所定時間` : '時給'}</span>
            <span>1日の実働</span><b className="num">{hm(x.work)}</b><span className="muted small">所定内 {hm(x.inside)}／時間外 {hm(x.otMin)}{x.weekOT ? `（うち週40時間超 ${hm(x.weekOT)}）` : ''}{x.ot60 ? `／月60時間超 ${hm(x.ot60)}` : ''}／深夜 {hm(x.night)}／法定休日 {hm(x.holMin)}</span>
            <span>賃金相当額</span><b className="num">{num(x.wageAmt)}円</b><span className="muted small">基本 {num(x.base)} ＋ 時間外 {num(x.otAmt)} ＋ 深夜 {num(x.nightAmt)} ＋ 法定休日 {num(x.holAmt)}</span>
            <span>原価（1日）</span><b className="num">{num(x.costB)}円</b><span className="muted small">× {x.up.toFixed(2)}（会社負担 {s.company.burden}%・賞与引当 {s.company.bonusRate}%）</span>
            <span>この現場への按分</span><b className="num">{num(st.costB)}円</b><span className="muted small">実働 {hm(st.min)} ÷ {hm(x.work)} ＝ {(st.ratio * 100).toFixed(1)}%{others ? `（ほか：${others}）` : ''}</span>
          </div>{!B ? <div className="small" style={{ marginTop: 6 }}>※ 会社設定がA（標準単価）のため、原価は人工×標準単価で計上しています。上はB方式で計算した場合の参考</div> : null}</div></td></tr>;
      }
    }
    const clickable = !ext && wv && cv;
    rowsH.push(<tr key={key} className={`${fin ? '' : 'pend'} ${clickable ? 'click' : ''} ${open ? 'sel' : ''}`} onClick={clickable ? () => setNkOpen(o => o === key ? null : key) : undefined}><td className="nw num">{clickable ? <span className="caret">{open ? '▾' : '▸'}</span> : null}{mdw(r.date)}{isLegalHol(r.date) ? <> <span className="badge warn">休</span></> : null}</td><td className="nw">{w.name} <span className={`tag ${ext ? 'ext' : 'staff'}`}>{ext ? '外部' : '社員'}</span></td>{cells}</tr>);
    if (detail) rowsH.push(detail);
  });

  const sum = (l: string, n: number, c: number, cls: string) => <div className="kpi"><div className="klabel"><span className={`tag ${cls}`}>{l}</span></div><div className="kval">{nk(round025(n))}<span className="small muted" style={{ fontWeight: 400 }}> 人工</span></div>{cv ? <div className="kfoot">労務費 <b className="num" style={{ color: 'var(--ink)' }}>{yen(c)}</b></div> : null}</div>;
  const sub = (l: string, t: Tot, ext: boolean) => <tr className="subt"><td colSpan={2}>{l}</td><td className="r num">{hm(t.min)}</td><td className="r num">{nk(round025(t.n))}</td>{cv ? <>{wv ? (ext ? <td colSpan={5}></td> : <><td className="r num">{num(t.base)}</td><td className="r num">{num(t.ot)}</td><td className="r num">{num(t.night)}</td><td className="r num">{num(t.hol)}</td><td className="r num">{num(t.bur)}</td></>) : null}<td className="r num">{num(t.c)}</td></> : null}</tr>;
  const all: Tot = { n: T.s.n + T.e.n, c: T.s.c + T.e.c, min: T.s.min + T.e.min, base: T.s.base, ot: T.s.ot, night: T.s.night, hol: T.s.hol, bur: T.s.bur };

  return <>
    <div className="kpis">{sum('社員', T.s.n, T.s.c, 'staff')}{sum('外部（労務外注費）', T.e.n, T.e.c, 'ext')}<div className="kpi"><div className="klabel">合計</div><div className="kval">{nk(round025(T.s.n + T.e.n))}<span className="small muted" style={{ fontWeight: 400 }}> 人工</span></div>{cv ? <div className="kfoot">労務費 <b className="num" style={{ color: 'var(--ink)' }}>{yen(T.s.c + T.e.c)}</b>{pend ? `　未承認 ${nk(pend)}人工は未計上` : ''}</div> : null}</div></div>
    <div className="card"><FilterBar keyName={K} cfg={{ kw: '作業員名・協力会社名で検索', quick: [{ k: 'mon', label: '月', type: 'month' }, { k: 'kind', label: '区分', type: 'select', opts: ['社員', '外部'] }, { k: 'st', label: '状態', type: 'select', opts: [['final', '承認・確認済みのみ']] }] }} />
      <div className="card-head"><TableCount n={recs.length} total={recsAll.length} unit="件" /><span className="cs">この現場の打刻（日別×作業員）。社員は{B ? 'B：打刻から計算した賃金相当額' : 'A：人工×標準単価'}{wv && cv ? '。社員の行を押すと計算の内訳' : ''}</span>{!wv && cv ? <span className="tag kari">【仮】職長には内訳（賃金）を出さない</span> : null}</div>
      <div className="tbl"><table className="nklist"><thead><tr><th>日付</th><th>作業員</th><th className="r">現場の実働</th><th className="r">人工</th>{cv ? <>{wv ? <><th className="r">基本</th><th className="r">時間外</th><th className="r">深夜</th><th className="r">休日</th><th className="r">会社負担</th></> : null}<th className="r">原価（按分後）</th></> : null}</tr></thead>
        <tbody>{rowsH.length ? rowsH : <tr><td colSpan={10} className="muted">条件に合う打刻はありません</td></tr>}</tbody>
        <tfoot>{sub('社員（承認済み）', T.s, false)}{sub('外部（確認済み）', T.e, true)}{sub('合計', all, !wv)}</tfoot></table></div>
      <div className="card-body" style={{ borderTop: '1px solid var(--line-2)' }}><p className="note" style={{ margin: 0 }}>社員：{B ? 'B 賃金相当＝（基本＋時間外25%〈月60時間超50%〉＋深夜25%＋法定休日35%）×（1＋会社負担率＋賞与引当率）を1日ごとに計算し、現場ごとの実働の比率で按分。人工は「実働÷所定時間」（上限なし。0.25の丸めは表示だけで、金額は分単位で計算）' : 'A 標準単価＝人工（実働÷所定時間、丸めない）×標準単価。割増はかけない'}。外部：今までどおり、0.25人工に丸めた人工×協力会社の常用単価（外注支払と同じ）。点線＝未承認・未確認（原価には未計上）。計算方式・割増率・会社負担率は<button className="lnk" onClick={() => go('S-10', { tab: '会社設定' })}>会社設定</button>。</p></div></div>
  </>;
}
