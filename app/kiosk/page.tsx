'use client';
/* T-01 打刻（共用端末：PC・タブレット） */
import React, { useEffect } from 'react';
import { useStore, type KioskUI } from '@/lib/store-context';
import { PageHead } from '@/components/ui';
import { StateChip } from '@/components/punch';
import { activeSites, projByNo, worker, partner, punchState, siteShort, BREAKS } from '@/lib/calc';
import { punchIn, punchMove, punchOut } from '@/lib/store';
import { TODAY, SITE_INTERNAL } from '@/lib/data';
import { mdw } from '@/lib/format';

export default function KioskPage() {
  const { s, ui, setUi, act, toast } = useStore();
  const k = ui.kiosk; const sites = activeSites(s);
  const p = projByNo(s, k.site) || sites[0];
  // 端末の現場が無効なら最初の現場にする（モックの k.site=p.no）
  useEffect(() => { if (p && p.no && p.no !== k.site) setUi(u => ({ kiosk: { ...u.kiosk, site: p.no as string } })); }, [p, k.site, setUi]);
  const setK = (patch: Partial<KioskUI>) => setUi(u => ({ kiosk: { ...u.kiosk, ...patch } }));
  if (!p || !p.no) return null;
  const pno = p.no;
  const people = p.members.slice();
  const selIds = Object.keys(k.sel).filter(id => k.sel[id]);
  const sel = selIds.map(id => ({ id, ps: punchState(s, id) }));
  const canIn = sel.length > 0 && sel.every(x => x.ps.state === '未出勤');
  const canMove = sel.length > 0 && sel.every(x => x.ps.state === '作業中');
  const canOut = canMove;
  const kNext = (t: string) => setK({ sel: {}, mode: null, clock: t });
  const kIn = () => { const ids = selIds; act(st => ids.forEach(id => punchIn(st, id, pno, k.clock, '共用端末', ids.length > 1 ? { by: 'E1', reason: '共用端末でまとめて打刻' } : undefined))); toast(ids.length + '人が出勤しました　' + k.clock + '　' + pno); kNext('11:00'); };
  const kMoveTo = (site: string) => { const ids = selIds; act(st => ids.forEach(id => punchMove(st, id, site, k.clock, '共用端末'))); toast(ids.length + '人の現場を変えました　' + k.clock + '　→ ' + siteShort(site)); kNext('17:30'); };
  const kOutOk = () => { const ids = selIds; act(st => ids.forEach(id => punchOut(st, id, k.clock, k.brk, k.mins ?? 75, '共用端末'))); toast(ids.length + '人が退勤しました　' + k.clock); kNext('17:30'); };
  const tile = (id: string) => {
    const w = worker(s, id), ps = punchState(s, id); const on = !!k.sel[id];
    const where = ps.state === '作業中' && ps.seg ? `${siteShort(ps.seg.site)}　${ps.seg.start}〜` : ps.state === '退勤済' && ps.r ? `〜${ps.r.segs[ps.r.segs.length - 1].end}` : '';
    return <button key={id} className={`ktile ${on ? 'on' : ''}`} onClick={() => setK({ sel: { ...k.sel, [id]: !k.sel[id] }, mode: null })} aria-pressed={on}><span className="kcheck">{on ? '✓' : ''}</span><span className="kname">{w.name}</span><span className="small muted">{w.kind === '社員' ? '社員' : partner(s, w.org).name}</span><span className="row" style={{ gap: 6 }}><StateChip s={ps.state} /><span className="num small">{where}</span></span></button>;
  };
  return <>
    <PageHead id="T-01" title="打刻（共用端末）" sub="現場の詰所・事務所に置くタブレット（またはPC）。スマホを持っていない／持ち込めない人が、名前を選んで打刻する" />
    <div className="kiosk card">
      <div className="khead">
        <label className="fsel"><span className="fsel-l">この端末の現場</span><select value={pno} onChange={e => setK({ site: e.target.value, sel: {}, mode: null })}>{sites.map(x => <option key={x.no as string} value={x.no as string}>{x.no} {x.title}</option>)}</select></label>
        <div className="kclock"><span className="small muted">{mdw(TODAY)}</span><b className="num">{k.clock}</b></div>
        <div className="demo-strip inline"><span className="tag kari">デモ操作</span>打刻の時刻<input type="time" value={k.clock} onChange={e => setK({ clock: e.target.value })} /></div>
      </div>
      <div className="khint">自分の名前を押して打刻。職長は何人か選んで<b>まとめて</b>打刻できます（車で移動するときの「現場を変える」など）。本人確認は名前を選ぶ方式（モック）。本番はICカードや顔認証も選べます【仮】。</div>
      <div className="row" style={{ padding: '0 16px', gap: 8 }}><button className="btn btn-secondary btn-sm" onClick={() => { const selAll = { ...k.sel }; p.members.forEach(id => selAll[id] = true); setK({ sel: selAll }); }}>この現場の全員を選ぶ</button><button className="btn btn-secondary btn-sm" onClick={() => setK({ sel: {}, mode: null })} disabled={!sel.length}>選択を外す</button><span className="small muted">{sel.length}人を選択中</span></div>
      <div className="kgrid">{people.map(tile)}</div>
      <div className="kbar">
        {k.mode === 'move' ? <div className="kpanel"><b>移動先の現場</b><div className="row">{sites.filter(x => x.no !== pno).map(x => <button key={x.no as string} className="btn btn-secondary" onClick={() => kMoveTo(x.no as string)}>{x.no} {x.title}</button>)}<button className="btn btn-secondary" onClick={() => kMoveTo(SITE_INTERNAL)}>社内作業</button><button className="lnk" onClick={() => setK({ mode: null })}>やめる</button></div></div>
          : k.mode === 'out' ? <div className="kpanel"><b>休憩時間</b><div className="row">{BREAKS.map(b => <button key={b.k} className={`btn ${k.brk === b.k ? 'btn-soft' : 'btn-secondary'}`} onClick={() => setK({ brk: b.k })} aria-pressed={k.brk === b.k}>{b.label}</button>)}{k.brk === 'custom' ? <label className="fsel"><span className="fsel-l">休憩（分）</span><input type="number" step={5} min={0} value={k.mins ?? 75} onChange={e => setK({ mins: Number(e.target.value) })} style={{ width: 80 }} /></label> : null}<button className="btn btn-primary" onClick={kOutOk}>{sel.length}人を退勤にする</button><button className="lnk" onClick={() => setK({ mode: null })}>やめる</button></div></div>
          : <><button className="kbtn main" onClick={kIn} disabled={!canIn}>出勤<small>この現場で</small></button><button className="kbtn" onClick={() => setK({ mode: 'move' })} disabled={!canMove}>現場を変える<small>移動</small></button><button className="kbtn dark" onClick={() => setK({ mode: 'out' })} disabled={!canOut}>退勤<small>休憩を選ぶ</small></button></>}
      </div>
    </div>
    <p className="note">共用端末での打刻は「共用端末」と記録され、日次チェック（S-06）で区別できます。自分のスマホでの打刻（M-02）と同じデータになります。</p>
  </>;
}
