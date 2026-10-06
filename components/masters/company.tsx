'use client';
/* S-10 会社設定（全社で1つ）＋休日カレンダー。モックの CS_DEF / s10company をそのまま */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { useNav } from '@/components/shell';
import { PageHead, Modal } from '@/components/ui';
import { saveCompany, addHoliday, deleteHoliday } from '@/lib/store';
import { uniq } from '@/lib/format';
import type { Company, CompanyKey } from '@/lib/types';

/* [キー, ラベル, 種類(sel/num/ro), 選択肢] */
type CsField = [CompanyKey, string, 'sel' | 'num' | 'ro', string[]?];
type CsGroup = { id: string; title: string; sub: string; plan1?: boolean; fields: CsField[] };
const CS_DEF: CsGroup[] = [
  { id: 'close', title: '締め', sub: '締めた月の打刻・原価は変えられない', fields: [['close', '勤怠の締め日', 'sel', ['月末', '20日', '25日', '15日']], ['costClose', '原価（月次）の締め', 'sel', ['月末（勤怠と同じ）', '翌月5日', '翌月10日']], ['lockAfter', '締めた後', 'ro']] },
  { id: 'ninku', title: '人工の換算', sub: '打刻の時間を人工にする決まり（Q6は仮）', fields: [['ninkuH', '1人工の時間', 'num'], ['ninkuUnit', '端数の単位', 'sel', ['0.25', '0.5', '0.1']], ['split', '複数現場の日', 'sel', ['時間で按分', '長くいた現場に1.0']]] },
  { id: 'punch', title: '打刻', sub: '', fields: [['means', '打刻の手段', 'ro'], ['gps', '位置の記録', 'sel', ['出勤・退勤のときに記録', '記録しない']], ['proxy', '代理入力', 'ro'], ['approveBy', '承認の期限', 'sel', ['翌日まで（過ぎたら一覧で警告）', '週末まで', '月末まで']]] },
  { id: 'calc', title: '時間の計算', sub: '案1（颯を勤怠の正本にする）のときだけ使う', plan1: true, fields: [['round', '時刻の丸め', 'sel', ['丸めない（1分単位で集計）', '15分単位（出勤は切り上げ・退勤は切り捨て）']], ['night', '深夜の時間帯（割増25%）', 'ro']] },
  { id: 'ot36', title: '36協定と残業アラート', sub: '建設業は2024年4月から上限規制の対象。協定の内容を入れる', plan1: true, fields: [['m45', '原則の上限（月・時間）', 'num'], ['y360', '原則の上限（年・時間）', 'num'], ['special', '特別条項', 'sel', ['あり', 'なし']], ['spY', '特別条項の上限（年）', 'num'], ['spM', '単月の上限（未満）', 'num'], ['spAvg', '2〜6か月平均の上限', 'num'], ['alert1', '注意を出す（月・時間）', 'num'], ['alert2', '警告を出す（月・時間）', 'num']] },
  { id: 'leave', title: '有給休暇', sub: '年10日以上付与される人は年5日の取得が義務。管理簿を残す', plan1: true, fields: [['lvBase', '付与の基準日', 'sel', ['入社日ごと', '毎年4月1日に一斉付与']], ['lvFirst', '初回の付与', 'ro'], ['lv5', '年5日の取得アラート', 'sel', ['基準日から9か月で5日未満なら知らせる', '基準日から6か月で知らせる', '知らせない']]] },
  { id: 'other', title: '社内作業・給与連携', sub: '', fields: [['internal', '社内作業（現場以外）の時間', 'sel', ['原価に入れない【要確認】', '共通費として按分する']], ['payroll', '給与ソフトへの出力', 'ro']] },
];
const HOURS_KEYS: CompanyKey[] = ['m45', 'y360', 'spY', 'spM', 'spAvg', 'alert1', 'alert2'];

export function CompanySettings() {
  const { s, ui, act, toast } = useStore();
  const { go } = useNav();
  const ed = ui.role === '管理者'; const C = s.company;
  const [edit, setEdit] = useState<string | null>(null);              // 編集中のカード（cs-xxx）
  const [vals, setVals] = useState<Record<string, string>>({});       // 編集中の入力値
  const [hol, setHol] = useState(false);

  const csEdit = (g: CsGroup) => { const v: Record<string, string> = {}; g.fields.forEach(([k]) => { v[k] = String(C[k]); }); setVals(v); setEdit('cs-' + g.id); };
  const csSave = (g: CsGroup) => {
    const patch: Record<string, unknown> = {};
    g.fields.forEach(([k, , t]) => { if (t === 'ro') return; const v = vals[k]; if (v === undefined) return; patch[k] = t === 'num' ? (Number(v) || C[k]) : v; });
    act(st => saveCompany(st, patch as Partial<Company>));
    setEdit(null); toast('「' + g.title + '」を保存しました');
  };
  const card = (g: CsGroup) => { const on = edit === 'cs-' + g.id;
    return <div key={g.id} className="card"><div className="card-head"><h2 className="section-label">{g.title}</h2>{g.plan1 ? <span className="tag kari">案1のときだけ</span> : null}<span className="cs">{g.sub}</span>{ed && !on ? <div className="r"><button className="btn btn-secondary btn-sm" onClick={() => csEdit(g)}>編集</button></div> : null}</div>
      <div className="card-body">{on ? <><div className="form">{g.fields.map(([k, l, t, o]) => t === 'ro' ? <label key={k}>{l}<input value={String(C[k])} disabled /></label>
        : t === 'sel' ? <label key={k}>{l}<select id={'cs-' + k} value={vals[k] ?? String(C[k])} onChange={e => setVals({ ...vals, [k]: e.target.value })}>{uniq([String(C[k]), ...(o || [])]).map(x => <option key={x}>{x}</option>)}</select></label>
        : <label key={k}>{l}<input id={'cs-' + k} value={vals[k] ?? String(C[k])} onChange={e => setVals({ ...vals, [k]: e.target.value })} inputMode="decimal" /></label>)}</div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}><button className="btn btn-secondary btn-md" onClick={() => setEdit(null)}>キャンセル</button><button className="btn btn-primary btn-md" onClick={() => csSave(g)}>保存</button></div></>
        : <dl className="kv">{g.fields.map(([k, l]) => <React.Fragment key={k}><dt>{l}</dt><dd>{String(C[k])}{HOURS_KEYS.includes(k) ? ' 時間' : k === 'ninkuH' ? ' 時間＝1.0人工' : ''}</dd></React.Fragment>)}</dl>}</div></div>; };
  const holDel = (i: number) => { const h = act(st => deleteHoliday(st, i)); toast(h.name + ' を削除しました'); };

  return <>
    <PageHead id="S-10" title="会社設定" sub={<><span className="tag kari">【仮】項目・値はヒアリングで確定</span> 全社で1つの設定</>} />
    <div className="hint" style={{ marginBottom: 14 }}>設定は「会社設定（ここ）→ <button className="lnk" onClick={() => go('S-10', { tab: '就業ルール' })}>就業ルール</button>（雇用区分ごと）→ <button className="lnk" onClick={() => go('S-10', { tab: '作業員' })}>作業員</button>（個人）」の順に細かくなります。個人には「どのルールか」と「計算の対象」だけを持たせ、ルールを変えたときに全員を直さずに済むようにしています。</div>
    <div className="grid2"><div className="stack">{CS_DEF.filter((g, i) => i % 2 === 0).map(card)}</div><div className="stack">{CS_DEF.filter((g, i) => i % 2 === 1).map(card)}</div></div>
    <div style={{ marginTop: 14 }}>
      <div className="card"><div className="card-head"><h2 className="section-label">休日カレンダー</h2><span className="tag kari">割増は案1のときだけ</span><span className="cs">法定休日（週1日・割増35%）と所定休日（割増25%：週40時間を超えた分）を分ける</span>{ed ? <div className="r"><button className="btn btn-soft btn-sm" onClick={() => setHol(true)}>＋ 休日を追加</button></div> : null}</div>
        <div className="tbl"><table><thead><tr><th>名称</th><th>いつ</th><th>種類</th><th>割増</th><th>対象のカレンダー</th>{ed ? <th></th> : null}</tr></thead><tbody>
          {s.holidays.map((h, i) => <tr key={i}><td className="nw">{h.name}</td><td className="small">{h.when}</td><td>{h.kind === '法定休日' ? <span className="badge warn">法定休日</span> : <span className="badge gray">所定休日</span>}</td><td className="num small">{h.kind === '法定休日' ? '35%' : '25%（週40時間超）'}</td><td className="small">{h.cal}</td>{ed ? <td><button className="icon-btn" onClick={() => holDel(i)} aria-label={`${h.name}を削除`}>×</button></td> : null}</tr>)}</tbody></table></div></div>
    </div>
    {hol ? <HolidayModal onClose={() => setHol(false)} /> : null}
  </>;
}

/* MODALS.hol：休日を追加 */
function HolidayModal({ onClose }: { onClose: () => void }) {
  const { act, toast } = useStore();
  const [n, setN] = useState('創立記念日'); const [w, setW] = useState('2026/11/20'); const [k, setK] = useState('所定休日'); const [c, setC] = useState('すべて');
  const ok = () => { act(st => addHoliday(st, { name: n, when: w, kind: k, cal: c })); onClose(); toast('休日を追加しました'); };
  return <Modal onClose={onClose}>
    <div className="card-head"><h2 className="section-label">休日を追加</h2></div><div className="card-body"><div className="form">
      <label>名称<input id="hl-n" value={n} onChange={e => setN(e.target.value)} /></label><label>いつ<input id="hl-w" value={w} onChange={e => setW(e.target.value)} /></label>
      <label>種類<select id="hl-k" value={k} onChange={e => setK(e.target.value)}><option>所定休日</option><option>法定休日</option></select></label><label>対象のカレンダー<select id="hl-c" value={c} onChange={e => setC(e.target.value)}><option>すべて</option><option>現場カレンダー</option><option>事務所カレンダー</option></select></label></div></div>
    <div className="foot"><button className="btn btn-secondary" onClick={onClose}>キャンセル</button><button className="btn btn-primary" onClick={ok}>追加</button></div>
  </Modal>;
}
