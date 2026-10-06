'use client';
/* スマホ画面 M-01〜M-05（打刻・自分の記録・工程表・代理入力） */
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { StatusBadge, useNa } from '@/components/ui';
import { SchedSVG } from '@/components/svgs';
import { StateChip } from '@/components/punch';
import { ROLES, worker, partner, isExt, projByNo, custOf, siteName, siteShort, recCalc, isFinal, assignedSites, mySites, punchState, BREAKS } from '@/lib/calc';
import { punchIn, punchMove, punchOut, proxySave } from '@/lib/store';
import { TODAY, SITE_INTERNAL } from '@/lib/data';
import { mdw, md, nk, hm, toMin } from '@/lib/format';
import type { Project } from '@/lib/types';

/* 打刻ボタンを押した後にデモ時刻を進める（本番は押した時刻） */
const NEXT: Record<string, string> = { '出勤': '11:00', '移動': '17:30', '退勤': '17:30' };
type Sheet = { type: 'plan' | 'move' | 'out'; brk: string; mins?: number; q?: string };
type M05Field = 'worker' | 'site' | 'start' | 'end' | 'brk' | 'reason';

export default function MobilePage() {
  const { s, ui, setUi, act, toast } = useStore();
  const { goMobile } = useNav();
  const sp = useSearchParams();
  const scr = sp.get('s') || 'M-02';
  const na = useNa();
  const [sheet, setSheet] = useState<Sheet | null>(null);

  const wid = ROLES[ui.role].me || 'E2'; // 本人（PCの役割では仮に社員職人）
  const w = worker(s, wid);
  const ext = isExt(s, wid);
  const curClock = ui.clock[wid] || '08:00';
  const setClock = (t: string) => setUi(u => ({ clock: { ...u.clock, [wid]: t } }));
  const defaultSite = (): string | undefined => { const a = assignedSites(s, wid); return (ui.planSite && ui.planSite[wid]) || (a[0] || {}).no || undefined; };
  const tabs: [string, string][] = ([['M-02', '打刻'], ['M-03', '記録'], ['M-04', '工程表']] as [string, string][]).concat(ui.role === '職長' ? [['M-05', '代理入力']] : []);
  const org = w.kind === '社員' ? '颯エンタープライズ 建設事業部' : partner(s, w.org).name;

  /* ---- M-01 ログイン（見た目だけ） ---- */
  const m01 = () => <div style={{ padding: '40px 8px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <div style={{ textAlign: 'center' }}><img src="/logo.png" alt="h-ent" style={{ height: 48 }} /><div style={{ fontWeight: 800, marginTop: 8 }}>颯エンタープライズ 打刻</div></div>
    <label className="ph-field">ログインID<input value={wid === 'X1' ? 'yamakita-watanabe' : 'suzuki.d'} disabled /></label>
    <label className="ph-field">パスワード<input type="password" value="********" disabled /></label>
    <button className="ph-send" onClick={na}>ログイン</button>
    <p className="note" style={{ textAlign: 'center' }}>入力端末（個人スマホ／会社タブレット）はヒアリング：Q12</p>
    <button className="lnk" onClick={() => goMobile('M-02')} style={{ textAlign: 'center' }}>打刻画面へ（モック）</button></div>;

  /* ---- M-02 打刻 ---- */
  const m02 = () => {
    const ps = punchState(s, wid); const t = curClock;
    const site = ps.state === '作業中' && ps.seg ? ps.seg.site : defaultSite();
    const p = site && site !== SITE_INTERNAL ? projByNo(s, site) : null;
    const el = ps.state === '作業中' && ps.seg ? hm(Math.max(0, toMin(t) - toMin(ps.seg.start))) : '';
    const r = ps.r; const c = r && ps.state === '退勤済' ? recCalc(r) : null;
    const timeline = r ? r.segs.map((sg, i) => <li key={i}><span className="num">{sg.start}</span><span><b>{siteName(s, sg.site)}</b><br /><span className="small muted num">{siteShort(sg.site)}{sg.end ? '　〜' + sg.end : '　作業中'}</span></span></li>) : null;
    return <>
      <div className="ph-card ph-site">
        <div className="row" style={{ justifyContent: 'space-between' }}><span className="small muted" style={{ fontWeight: 700 }}>{ps.state === '作業中' ? 'いまの現場' : ps.state === '退勤済' ? '今日の打刻' : '今日の現場'}</span><StateChip s={ps.state} /></div>
        {ps.state === '退勤済' && c ? <><div className="site-name">おつかれさまでした</div><div className="small">{ext ? null : <>実働 <b className="num">{hm(c.work)}</b>　</>}休憩 <b className="num">{c.breakMin}分</b>　人工 <b className="num">{nk(c.dayNinku)}</b> <span className="tag kari">仮</span></div></>
          : <><div className="site-name">{p ? p.title : site === SITE_INTERNAL ? '社内作業' : '現場が未設定'}</div><div className="small muted num">{p ? site + '　' + custOf(s, p).short : ''}</div>
            {ps.state === '作業中' && ps.seg ? <div className="el num">{el}<small> 経過（{ps.seg.start}〜）</small></div> : <button className="lnk small" onClick={() => setSheet({ type: 'plan', brk: 'std' })}>別の現場にする</button>}</>}
      </div>
      {ps.state === '未出勤' ? <button className="ph-big main" disabled={!site} onClick={() => { if (!site) return; act(st => punchIn(st, wid, site, t)); setClock(NEXT['出勤']); toast('出勤しました　' + t + '　' + siteName(s, site)); }}>出勤する</button> : null}
      {ps.state === '作業中' ? <><button className="ph-big" onClick={() => setSheet({ type: 'move', brk: 'std' })}>現場を変える（移動）</button><button className="ph-big main" onClick={() => setSheet({ type: 'out', brk: 'std' })}>退勤する</button></> : null}
      {timeline && timeline.length ? <div className="ph-card"><h3>今日の記録</h3><ul className="tl">{timeline}</ul>{ps.state === '退勤済' && r ? <div className="small" style={{ marginTop: 6 }}><StatusBadge s={r.status} /> 職長の{ext ? '確認' : '承認'}待ち</div> : null}</div> : null}
      {site && site !== SITE_INTERNAL ? <button className="ph-chip" onClick={() => { setUi({ m04site: site }); goMobile('M-04'); }} style={{ textAlign: 'center' }}>{site} の工程表を見る</button> : null}
      {ext ? <p className="note" style={{ margin: 0 }}>協力会社・一人親方の方は「出面」として記録します（残業の計算はしません）。</p> : null}
    </>;
  };

  /* ---- M-03 自分の記録（見た目だけ） ---- */
  const m03 = () => {
    const recs = s.punches.filter(r => r.worker === wid).sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 8);
    return <>
      <div className="ph-card"><h3>最近の記録</h3><div className="ph-list">{recs.length ? recs.map(r => { const c = recCalc(r); return <div key={r.id} className="it"><span>{mdw(r.date)}<br /><span className="small muted">{r.segs.map(sg => siteShort(sg.site)).join(' → ')}</span></span><span style={{ textAlign: 'right' }}><span className="num">{c.open ? '－' : nk(c.dayNinku) + '人工'}</span><br /><StatusBadge s={r.status} /></span></div>; }) : <span className="muted small">記録がありません</span>}</div></div>
      <button className="ph-chip" onClick={na} style={{ textAlign: 'center' }}>修正を依頼する（△）</button>
      <p className="note">自分の打刻と承認状況を見る画面（D-09）。モックでは見た目だけです。</p>
    </>;
  };

  /* ---- M-04 工程表 ---- */
  const m04 = () => {
    const sites = assignedSites(s, wid);
    const m04site = ui.m04site && sites.find(p => p.no === ui.m04site) ? ui.m04site : (sites[0] || {}).no || null;
    const p = projByNo(s, m04site);
    const vs = p && p.no ? (s.schedules[p.no] || []) : []; const v = vs[vs.length - 1];
    return <>
      <div className="ph-chips row-wrap">{sites.map(x => <button key={x.no} className="ph-chip" onClick={() => setUi({ m04site: x.no })} aria-pressed={x.no === m04site}>{x.no}</button>)}</div>
      {p ? <div className="ph-card"><h3>{p.title}</h3>{v ? <><div className="att"><div className="att-cap">第{v.ver}版（{md(v.date)} 更新）・最新</div><SchedSVG p={p} ver={v.ver} /></div><p className="note">ピンチで拡大できます（想定）。過去の版は事務所側に履歴として残ります。</p></> : <div className="placeholder">工程表はまだ添付されていません</div>}</div> : <div className="placeholder">割り当て済みの現場がありません</div>}
    </>;
  };

  /* ---- M-05 代理入力（職長） ---- */
  const m05 = () => {
    const sites = mySites(s, ui.role);
    const ws = [...new Set(sites.flatMap(p => p.members))].filter(id => id !== 'E1');
    const f = { ...ui.m05 };
    if (!f.worker) f.worker = ws.includes('X2') ? 'X2' : ws[0];
    if (!f.site) f.site = (sites[0] || {}).no || '';
    const ex = s.punches.find(r => r.worker === f.worker && r.date === TODAY);
    const setF = (k: M05Field, v: string) => setUi(u => ({ m05: { ...u.m05, ...f, [k]: k === 'brk' ? Number(v) : v } }));
    const save = () => {
      if (toMin(f.end) <= toMin(f.start)) { toast('終了は開始より後にしてください'); return; }
      act(st => proxySave(st, f));
      toast(worker(s, f.worker).name + 'さんの' + md(TODAY) + 'を代理で登録しました（理由：' + f.reason + '）');
    };
    return <div className="ph-card stack" style={{ gap: 10 }}><h3 style={{ margin: 0 }}>作業員の代わりに入力</h3>
      <label className="ph-field">作業員<select value={f.worker} onChange={e => setF('worker', e.target.value)}>{ws.map(id => <option key={id} value={id}>{worker(s, id).name}（{worker(s, id).kind}）</option>)}</select></label>
      <label className="ph-field">日付<input value={mdw(TODAY)} disabled /></label>
      <label className="ph-field">現場<select value={f.site} onChange={e => setF('site', e.target.value)}>{sites.map(p => <option key={p.no!} value={p.no!}>{p.no} {p.title}</option>)}</select></label>
      <div className="row2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><label className="ph-field">開始<input type="time" value={f.start} onChange={e => setF('start', e.target.value)} /></label><label className="ph-field">終了<input type="time" value={f.end} onChange={e => setF('end', e.target.value)} /></label></div>
      <label className="ph-field">休憩（分）<input type="number" value={f.brk} inputMode="numeric" onChange={e => setF('brk', e.target.value)} /></label>
      <div className="ph-field">理由<div className="ph-chips row-wrap">{['スマホがない', '端末持ち込み禁止の現場', '打ち忘れ'].map(x => <button key={x} className="ph-chip" onClick={() => setF('reason', x)} aria-pressed={f.reason === x}>{x}</button>)}</div></div>
      {ex && isFinal(ex) ? <div className="hint">この日は承認・確認済みのため代理入力できません。</div> : ex ? <div className="hint">すでに打刻があります。登録すると代理入力の内容で置き換えます。</div> : null}
      <button className="ph-send" onClick={save} disabled={!!(ex && isFinal(ex))}>代理で登録する</button>
      <p className="note" style={{ margin: 0 }}>入力者（佐藤 健一）と理由が記録されます。登録後は日次チェック（S-06）に「入力済」で出ます。</p></div>;
  };

  /* ---- シート（退勤の休憩選択・現場の選択） ---- */
  const sheetView = () => {
    if (!sheet) return null;
    const sh = sheet; const ps = punchState(s, wid);
    const close = () => setSheet(null);
    const bg = (e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) close(); };
    if (sh.type === 'out') {
      const pOut = () => { const t = curClock; act(st => punchOut(st, wid, t, sh.brk, sh.mins ?? 75)); setSheet(null); setClock(NEXT['退勤']); toast('退勤しました　' + t + '。職長の' + (ext ? '確認' : '承認') + '待ちです'); };
      return <div className="ph-sheet" onClick={bg}><div className="in">
        <div className="row" style={{ justifyContent: 'space-between' }}><b>退勤する（{curClock}）</b><button className="lnk" onClick={close}>閉じる</button></div>
        <div className="small muted" style={{ fontWeight: 700 }}>今日の休憩時間</div>
        <div className="ph-chips">{BREAKS.map(b => <button key={b.k} className="ph-chip" onClick={() => setSheet({ ...sh, brk: b.k })} aria-pressed={sh.brk === b.k}><b>{b.label}</b>{b.sub ? <>　<span className="small muted">{b.sub}</span></> : null}</button>)}</div>
        {sh.brk === 'custom' ? <label className="ph-field">休憩（分）<input type="number" inputMode="numeric" step={5} min={0} value={sh.mins ?? 75} onChange={e => setSheet({ ...sh, mins: Number(e.target.value) })} /></label> : null}
        <p className="note" style={{ margin: 0 }}>いつもと違う日だけ変えてください。標準の休憩は会社の決まりに合わせて設定します【仮】。休憩は5分単位で記録します。</p>
        <button className="ph-send" onClick={pOut}>退勤する</button></div></div>;
    }
    const assigned = assignedSites(s, wid);
    const others = s.projects.filter(p => p.no && (p.status === '受注' || p.status === '施工中') && !assigned.includes(p));
    const cur = sh.type === 'move' && ps.seg ? ps.seg.site : defaultSite();
    const q = sh.q || ''; const hits = q ? others.filter(p => (p.no + p.title + custOf(s, p).short).includes(q)) : [];
    const pickSite = (site: string) => {
      const t = curClock;
      if (sh.type === 'plan') { setUi(u => ({ planSite: { ...(u.planSite || {}), [wid]: site } })); setSheet(null); return; }
      act(st => punchMove(st, wid, site, t)); setSheet(null); setClock(NEXT['移動']); toast('現場を変えました　' + t + '　' + siteName(s, site));
    };
    const chip = (p: Project, withCust: boolean) => <button key={p.no!} className="ph-chip" onClick={() => pickSite(p.no!)} disabled={p.no === cur}><b className="num">{p.no}</b>　{p.title}{withCust ? <><br /><span className="small muted">{custOf(s, p).short}{p.no === cur ? '（いまの現場）' : ''}</span></> : null}</button>;
    return <div className="ph-sheet" onClick={bg}><div className="in">
      <div className="row" style={{ justifyContent: 'space-between' }}><b>{sh.type === 'move' ? '移動先の現場' : '今日の現場'}</b><button className="lnk" onClick={close}>閉じる</button></div>
      <div className="small muted" style={{ fontWeight: 700 }}>割り当て済みの現場</div>
      <div className="ph-chips">{assigned.length ? assigned.map(p => chip(p, true)) : <span className="small muted">割り当てがありません</span>}</div>
      {ext ? null : <button className="ph-chip" onClick={() => pickSite(SITE_INTERNAL)} disabled={cur === SITE_INTERNAL}><b>社内作業</b>　<span className="small muted">倉庫整理・車両整備など【仮】</span></button>}
      <div className="small muted" style={{ fontWeight: 700 }}>それ以外の現場を探す</div>
      <input value={q} onChange={e => setSheet({ ...sh, q: e.target.value })} placeholder="工事番号・件名" style={{ height: 40, fontSize: 16 }} />
      <div className="ph-chips">{hits.map(p => <button key={p.no!} className="ph-chip" onClick={() => pickSite(p.no!)}><b className="num">{p.no}</b>　{p.title}</button>)}</div>
      {sh.type === 'move' ? <p className="note" style={{ margin: 0 }}>移動の時間は行き先の現場に含めます。出発するときに押してください。</p> : null}
    </div></div>;
  };

  const body = ({ 'M-01': m01, 'M-02': m02, 'M-03': m03, 'M-04': m04, 'M-05': m05 } as Record<string, () => React.ReactNode>)[scr] || m02;

  return <main className="mstage">
    {scr === 'M-02' ? <div className="demo-strip"><span className="tag kari">デモ操作</span>打刻の時刻<input type="time" value={curClock} onChange={e => setClock(e.target.value)} aria-label="デモ用の時刻" /><span className="small muted">押すと次の時刻に進みます（本番は押した時刻）</span></div> : null}
    <div className="phone" aria-label="スマホ画面">
      {scr === 'M-01' ? null : <div className="ph-top"><small>{mdw(TODAY)}　{org}</small><div className="who">{w.name} さん</div></div>}
      <div className="ph-body">{body()}</div>
      {scr === 'M-01' ? null : <nav className="ph-nav" style={{ gridTemplateColumns: `repeat(${tabs.length},1fr)` }}>{tabs.map(t => <button key={t[0]} className="ph-tab" onClick={() => goMobile(t[0])} aria-current={scr === t[0] ? 'page' : undefined}>{t[1]}</button>)}</nav>}
      {sheetView()}
    </div>
  </main>;
}
