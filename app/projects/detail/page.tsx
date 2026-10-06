'use client';
/* S-05 案件詳細（工事台帳） */
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { PageHead, StatusBadge, Kari, MoreMenu, ConfirmModal, type ConfirmSpec } from '@/components/ui';
import { Overview } from '@/components/project/overview';
import { Money } from '@/components/project/money';
import { CostList } from '@/components/project/costs';
import { Ninku } from '@/components/project/ninku';
import { Sched } from '@/components/project/sched';
import { ROLES, custOf, projFin, budDraft, caseHasActuals, meterCls } from '@/lib/calc';
import { resolveProject, caseBack, caseStop, caseDelete } from '@/lib/store';
import { yen, pct, nk, fmtD } from '@/lib/format';

const TABS = ['概要', '予実対比', '原価の明細', '人工', '工程表'];

export default function ProjectDetailPage() {
  const { s, ui, setUi, act, toast, clearF, setF } = useStore();
  const { go } = useNav();
  const sp = useSearchParams();
  const p = resolveProject(s, sp.get('id'), ui.role);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState<'back' | 'stop' | 'del' | null>(null);
  const [stopR, setStopR] = useState('発注者都合（設備更新計画の見直し）');
  if (!p || !p.no) return <div className="placeholder">案件がありません</div>;
  const c = custOf(s, p); const f = projFin(s, p); const cv = ROLES[ui.role].cost !== 'hide'; const ed = ROLES[ui.role].edit;
  const tabs = TABS.filter(t => cv || !['予実対比', '原価の明細'].includes(t));
  const tab = tabs.includes(ui.s05tab) ? ui.s05tab : '概要';
  const setTab = (t: string) => { setUi(t !== '原価の明細' ? { s05tab: t, costFrom: null } : { s05tab: t }); };
  /* 予実対比の実績金額 → 原価の明細タブに絞り込んで移動 */
  const toCost = (cat: string, grp: string) => { const K = 'cost-' + p.no; clearF(K); setF(K, 'cat', cat); setF(K, 'grp', grp); setUi({ costFrom: cat + '／' + grp, s05tab: '原価の明細' }); if (typeof window !== 'undefined') window.scrollTo(0, 0); };

  const kpi = (l: string, v: string, foot: React.ReactNode, cls?: string) => <div className={`kpi ${cls || ''}`}><div className="klabel">{l}</div><div className="kval">{v}</div>{foot ? <div className="kfoot">{foot}</div> : null}</div>;
  const contract = p.contract || [];
  const kpis = cv ? <div className="kpis">
    {kpi('受注額（税抜）', yen(f.contract), contract.length > 1 ? `うち追加 ${contract.filter(x => x.no !== p.no).length}件` : '当初のみ')}
    {kpi('実行予算', yen(f.budget), budDraft(s, p) ? <><span className="badge warn">下書き</span> まだ確定していない</> : '当初＋変更')}
    {kpi('原価実績', yen(f.actual), f.lab.pendingNinku ? `未承認 ${nk(f.lab.pendingNinku)}人工は未計上` : '承認済みのみ計上')}
    {kpi('残予算', yen(f.remain), f.remain < 0 ? <span style={{ color: 'var(--ng-tx)', fontWeight: 700 }}>予算超過</span> : '実行予算−原価実績')}
    {kpi('予定粗利', yen(f.planGP), '受注額−実行予算　' + pct(f.contract ? f.planGP / f.contract : 0))}
    {kpi('実績粗利', yen(f.actGP), '受注額−原価実績　' + pct(f.contract ? f.actGP / f.contract : 0), 'accent')}
    <div className="kpi"><div className="klabel">予算消化率</div><div className="kval">{pct(f.consume)}</div><div className="meter"><i className={meterCls(f.consume)} style={{ width: `${Math.min(100, f.consume * 100)}%` }} /></div></div>
  </div> : null;

  const has = caseHasActuals(s, p);
  const menuItems = [
    { label: '受注を取り消して与件に戻す', onClick: () => setConfirm('back'), disabled: has, note: has ? '打刻・原価実績があるため取り消せません（中止を使う）' : '工事番号は欠番になります' },
    { label: '工事を中止にする', onClick: () => setConfirm('stop'), disabled: p.status === '中止' || p.status === '完了', note: '途中で工事がなくなったとき。実績は残ります' },
    { label: '案件を削除', onClick: () => setConfirm('del'), danger: true, disabled: has, note: has ? '実績があるため削除できません' : '間違って受注したときだけ' },
  ];
  const spec: ConfirmSpec | null = confirm === 'back' ? {
    title: '受注を取り消して与件に戻しますか', okLabel: '与件に戻す',
    body: <p style={{ margin: 0 }}>工事番号 {p.no} を取り消し、与件「{p.title}」を「見積中」に戻します。受注にした見積は「提出済」に戻ります。工事番号は欠番になります。</p>,
    onOk: () => { const no = act(st => caseBack(st, p.id)); toast('受注を取り消し、与件に戻しました（' + no + ' は欠番）'); go('S-02', { id: p.id }); },
  } : confirm === 'stop' ? {
    title: '工事を中止にしますか', okLabel: '中止にする', danger: true,
    body: <><p style={{ margin: 0 }}>「{p.title}」を中止にします。打刻と原価実績は残し、打刻画面の現場候補からは外れます。</p><label className="fld" style={{ marginTop: 10 }}>中止の理由<input value={stopR} onChange={e => setStopR(e.target.value)} /></label></>,
    onOk: () => { act(st => caseStop(st, p.id, stopR)); toast('工事を中止にしました'); },
  } : confirm === 'del' ? {
    title: '案件を削除しますか', okLabel: '削除する', danger: true,
    body: <p style={{ margin: 0 }}>工事番号 {p.no}「{p.title}」と、ひもづく与件・見積を削除します。元に戻せません。</p>,
    onOk: () => { act(st => caseDelete(st, p.id)); toast('案件を削除しました'); go('S-01'); },
  } : null;

  return <>
    <div className="crumb"><button className="lnk" onClick={() => go('S-01')}>案件一覧</button> ／ 案件詳細（工事台帳）</div>
    <PageHead id="S-05" title={<><span className="num">{p.no}</span>　{p.title}</>} sub={<><StatusBadge s={p.status} /> {c.short}<Kari /></>} acts={ed ? <MoreMenu items={menuItems} open={menu} onToggle={() => setMenu(o => !o)} /> : null} />
    {p.status === '中止' ? <div className="hint" style={{ marginBottom: 14, borderColor: '#F1C4BE', background: 'var(--ng-bg)' }}>この工事は中止になりました（{fmtD(p.stopDate)}・理由：{p.stopReason || ''}）。発生した原価は残しています。</div> : null}
    {kpis}
    <div className="tabs" role="tablist">{tabs.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === '概要' ? <Overview p={p} c={c} f={f} /> : null}
    {tab === '予実対比' ? <Money p={p} f={f} setTab={setTab} toCost={toCost} /> : null}
    {tab === '原価の明細' ? <CostList p={p} setTab={setTab} /> : null}
    {tab === '人工' ? <Ninku p={p} /> : null}
    {tab === '工程表' ? <Sched p={p} /> : null}
    {spec ? <ConfirmModal spec={spec} onClose={() => setConfirm(null)} /> : null}
  </>;
}
