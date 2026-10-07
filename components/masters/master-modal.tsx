'use client';
/* S-10 マスタの編集モーダル（新規登録／編集）。モックの FORM / MODALS.medit をそのまま */
import React, { useState } from 'react';
import { Modal } from '@/components/ui';
import { useStore } from '@/lib/store-context';
import { masterDraft, saveMaster, type MasterTab, type MasterDraft } from '@/lib/store';
import { FLAG_DEF } from '@/lib/data';
import type { Contact, FlagKey } from '@/lib/types';

/* [キー, ラベル, 種類, 選択肢, 条件(staff/ext), 幅wide]。'#' は見出し（[ '#', 見出し, 条件, 注記 ]） */
type FormField = [string, string, string?, (string[] | string | null)?, (string | null)?, string?];
const FORM: Record<MasterTab, FormField[]> = {
  '品目': [['name', '標準品名'], ['alias', '先方での呼び名（読点区切り）'], ['spec', '規格'], ['unit', '単位'], ['cost', '原価（円）', 'num'], ['cat', '区分', 'sel', ['材料', '労務', '法定福利費', '経費']], ['kind', '分類']],
  '工種': [['name', '名称'], ['desc', '説明']],
  '得意先': [['name', '名称（正式名）'], ['short', '略称'], ['zip', '郵便番号'], ['addr', '住所'], ['tel', '代表電話'], ['rate', '掛率', 'num'], ['note', '備考', 'area']],
  '作業員': [
    ['#', '基本'],
    ['name', '氏名'], ['kana', 'ふりがな'], ['kind', '区分', 'sel', ['社員', '協力会社', '一人親方']], ['org', '所属', 'org'], ['job', '職種'],
    ['empNo', '社員番号', '', null, 'staff'], ['hired', '入社日', 'date', null, 'staff'], ['left', '退職日（入れるとその翌日から打刻できない）', 'date', null, 'staff'],
    ['means', '打刻の方法', 'sel', ['スマホ', '共用端末のみ', '代理入力のみ']],
    ['#', '計算の対象', 'staff', '打刻・勤怠・原価・残業を別々に決める。例：事務員は勤怠の対象だが原価の対象外'],
    ['flags', '', 'flags', null, 'staff'],
    ['#', '賃金（実績の労務費：B方式）', 'staff', '打刻から賃金相当額を計算するための額。管理者・経理だけが見られます（職長・作業員には出しません）'],
    ['pay', '給与形態', 'sel', ['日給', '日給月給', '月給', '時給'], 'staff'], ['wageV', '賃金額（日給・月給・時給の額。円）', 'num', null, 'staff'], ['wageFrom', '賃金の適用開始日', 'date', null, 'staff'], ['excl', '割増の基礎から除く手当（月給制のみ。家族・通勤など。円/月）', 'num', null, 'staff'],
    ['#', '標準単価（予算・見積用：A方式）', 'staff', '（所定内の年間給与＋賞与＋会社負担）÷ 年間の所定労働日数。残業代は含めない'],
    ['rateV', '標準単価（円/日）', 'num', null, 'staff'], ['rateFrom', '標準単価の適用開始日', 'date', null, 'staff'],
    ['#', '勤怠', 'staff', '案1（颯を勤怠の正本にする）のときだけ使う'],
    ['emp', '雇用形態', 'sel', ['正社員', '契約社員', 'パート・アルバイト', '役員'], 'staff'],
    ['rule', '就業ルール', 'rule', null, 'staff'], ['approver', '打刻の承認者', 'sel', ['川口（管理者）', '佐藤 健一（職長）', '田中 誠（職長）'], 'staff'],
    ['#', '有給休暇', 'staff', '案1のときだけ使う。年10日以上付与される人は年5日の取得が義務'],
    ['lvBase', '付与の基準日', 'date', null, 'staff'], ['lvGrant', '今年度の付与日数', 'num', null, 'staff'], ['lvUsed', '今年度の取得日数', 'num', null, 'staff'],
    ['#', '外部の作業員について', 'ext', '協力会社・一人親方の人は、打刻を「出面（稼働の記録）」として使うだけです。就業ルール・残業申請・有給などの勤怠の設定は持ちません（雇用と見られないため）。単価は協力会社マスタで持ちます'],
  ],
  '協力会社': [
    ['#', '基本'], ['name', '名称'], ['type', '区分', 'sel', ['法人', '個人（一人親方）']], ['person', '担当者'], ['tel', '電話'], ['addr', '住所', '', null, null, 'wide'],
    ['#', 'インボイス・許可'], ['invNo', 'インボイス登録番号（T＋13桁。なければ空欄）'], ['license', '建設業許可番号（任意）'],
    ['#', '取引の条件'], ['contract', '契約の形', 'sel', ['常用・請負', '常用のみ', '請負のみ']], ['rate', '人工単価（常用・円。請負のみなら空欄）', 'num'], ['rateFrom', '単価の適用開始日', 'date'], ['half', '半日の単価（任意・円）', 'num'],
    ['ot', '時間外の扱い', 'sel', ['人工に足す（0.25単位）', '時間単価で別に払う', '払わない（単価に含む）', '－']], ['close', '締め日', 'sel', ['月末', '20日', '25日', '15日']], ['pay', '支払日', 'sel', ['翌月末', '翌月10日', '翌月20日', '翌々月10日']], ['fee', '振込手数料', 'sel', ['当社負担', '先方負担']],
    ['#', '控除・源泉', '', '支払額から差し引くもの。外注支払に反映する【要確認：今やっているか】'], ['safety', '安全協力会費（％。しないなら0）', 'num'], ['other', 'その他の相殺（例：立替資材・駐車場）'], ['wht', '源泉徴収', 'sel', ['不要', '必要', '要確認']],
    ['#', '運用'], ['checker', '出面の確認者', 'sel', ['職長', '管理者', '職長と管理者']],
  ],
  '取引先': [['name', '名称'], ['cat', '区分', 'sel', ['材料', '重機・リース', '運搬', '産廃', 'その他']], ['invNo', 'インボイス登録番号（なければ空欄）'], ['tel', '電話'], ['close', '締め日', 'sel', ['月末', '20日', '25日', '15日']], ['pay', '支払日', 'sel', ['翌月末', '翌月10日', '翌月20日']], ['note', '備考', 'area']],
  '就業ルール': [['#', '名前'], ['name', '名称'], ['#', '内容', '', '中身を変えるときは「いつから」を入れて版を足します。社員の紐付けはそのままで、過去の月は前の版で計算します'], ['from', 'この内容の適用開始日', 'date'], ['days', '年間の所定労働日数（月給の時間単価に使う）', 'num'], ['start', '所定の始業', 'time'], ['end', '所定の終業', 'time'], ['hours', '所定労働時間（1日）', 'num'], ['brk', '標準の休憩', 'sel', ['標準（10時15分・昼60分・15時15分）', '昼60分', 'なし']],
    ['system', '労働時間制', 'sel', ['通常', '1か月単位の変形労働時間制', '1年単位の変形労働時間制【要確認】']], ['cal', '休日カレンダー', 'sel', ['現場カレンダー', '事務所カレンダー']], ['ot', '残業の数え方', 'sel', ['1日8時間超・週40時間超', '1日8時間超のみ']], ['late', '遅刻・早退', 'sel', ['判定しない（朝礼基準）', '判定する']]],
};

type Group = { h: string | null; note?: string; skip?: boolean; items: FormField[] };
const str = (v: unknown) => (v === undefined || v === null) ? '' : String(v);
const WIDE: React.CSSProperties = { gridColumn: '1/-1' };

export function MasterModal({ t, id, onClose }: { t: MasterTab; id: string | null; onClose: () => void }) {
  const { s, act, toast } = useStore();
  const [d, setD] = useState<MasterDraft>(() => masterDraft(s, t, id));
  const staff = d.kind === '社員';
  const okCond = (c?: string | null) => !c || (c === 'staff' && staff) || (c === 'ext' && !staff);
  /* INPUT.md：区分を変えたら所属を初期値に戻す */
  const setK = (k: string, v: string) => setD(prev => { const n: MasterDraft = { ...prev, [k]: v }; if (k === 'kind') n.org = v === '社員' ? '建設事業部' : s.partners[0].id; return n; });
  const setFlag = (k: FlagKey, on: boolean) => setD(prev => ({ ...prev, flags: { ...(prev.flags || { punch: false, att: false, cost: false, ot: false }), [k]: on } }));
  const contacts: Contact[] = d.contacts || [];
  const setContact = (i: number, k: keyof Contact, v: string) => setD(prev => ({ ...prev, contacts: (prev.contacts || []).map((c, j) => j === i ? { ...c, [k]: v } : c) }));
  const mcAdd = () => setD(prev => ({ ...prev, contacts: [...(prev.contacts || []), { name: '', dept: '', email: '', tel: '' }] }));
  const mcDel = (i: number) => setD(prev => ({ ...prev, contacts: (prev.contacts || []).filter((_, j) => j !== i) }));
  const save = () => {
    const err = act(st => saveMaster(st, t, id, d));
    if (err) { toast(err); return; }
    onClose(); toast(t + 'マスタを' + (id ? '更新' : '登録') + 'しました');
  };

  const field = ([k, l, type, opts, cond, wide]: FormField) => {
    if (!okCond(cond)) return null;
    if (k === '#') return null;
    const st = wide ? WIDE : undefined;
    const v = str(d[k]);
    if (type === 'sel') { const o = (opts as string[]) || []; return <label key={k} style={st}>{l}<select value={o.includes(v) ? v : o[0]} onChange={e => setK(k, e.target.value)}>{o.map(x => <option key={x}>{x}</option>)}</select></label>; }
    if (type === 'rule') return <label key={k}>{l}<select value={str(d.rule)} onChange={e => setK('rule', e.target.value)}>{s.workRules.filter(r => !r.stopped || r.id === d.rule).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>;
    if (type === 'org') return d.kind === '社員'
      ? <label key={k}>{l}<input value={str(d.org || '建設事業部')} onChange={e => setK('org', e.target.value)} /></label>
      : <label key={k}>{l}<select value={str(d.org)} onChange={e => setK('org', e.target.value)}>{s.partners.filter(p => !p.stopped).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>;
    if (type === 'area') return <label key={k} style={WIDE}>{l}<textarea rows={2} value={v} onChange={e => setK(k, e.target.value)} /></label>;
    if (type === 'flags') return <div key={k} className="flags" style={WIDE}>{FLAG_DEF.map(([fk, fl, fd]) => <label key={fk} className="opt"><input type="checkbox" checked={!!(d.flags || ({} as Partial<Record<FlagKey, boolean>>))[fk]} onChange={e => setFlag(fk, e.target.checked)} /><span><b>{fl}</b><small>{fd}</small></span></label>)}</div>;
    return <label key={k} style={st}>{l}<input inputMode={type === 'num' ? 'decimal' : undefined} type={type === 'date' ? 'date' : type === 'time' ? 'time' : undefined} value={v} onChange={e => setK(k, e.target.value)} /></label>;
  };
  // 見出しごとにまとめる
  const groups: Group[] = []; let cur: Group = { h: null, items: [] }; groups.push(cur);
  FORM[t].forEach(f => {
    if (f[0] === '#') { if (!okCond(f[2])) { cur = { h: null, skip: true, items: [] }; groups.push(cur); return; } cur = { h: f[1], note: typeof f[3] === 'string' ? f[3] : undefined, items: [] }; groups.push(cur); }
    else if (!cur.skip) cur.items.push(f);
  });
  const body = groups.filter(g => g.h || g.items.length).map((g, i) => <React.Fragment key={i}>
    {g.h ? <div className="fgroup-h">{g.h}{g.note ? <small>{g.note}</small> : null}</div> : null}
    {g.items.length ? <div className="form">{g.items.map(field)}</div> : null}
  </React.Fragment>);

  return <Modal size="mid" onClose={onClose}>
    <div className="card-head"><h2 className="section-label">{t}マスタ　{id ? '編集' : '新規登録'}</h2>{id ? <span className="cs num">{id}</span> : null}{['作業員', '協力会社', '就業ルール', '取引先'].includes(t) ? <span className="tag kari">【仮】</span> : null}</div>
    <div className="card-body">{body}
      {t === '得意先' ? <><div className="step" style={{ marginTop: 14 }}>担当者（見積の送付先になります）</div>
        <div className="stack" style={{ gap: 8 }}>{contacts.map((k, i) => <div key={i} className="contact-row"><input placeholder="氏名" value={k.name} onChange={e => setContact(i, 'name', e.target.value)} /><input placeholder="部署" value={k.dept} onChange={e => setContact(i, 'dept', e.target.value)} /><input type="email" placeholder="メールアドレス" value={k.email} onChange={e => setContact(i, 'email', e.target.value)} /><input type="tel" placeholder="電話番号" value={k.tel} onChange={e => setContact(i, 'tel', e.target.value)} /><button className="icon-btn" onClick={() => mcDel(i)} aria-label="担当者を削除">×</button></div>)}
          <div><button className="btn btn-soft btn-sm" onClick={mcAdd}>＋ 担当者を追加</button></div></div></> : null}
      {(t === '作業員' && id && staff) || (t === '協力会社' && id) ? <p className="note">単価を変えるときは適用開始日も入れてください。履歴として残り、それより前の打刻は前の単価で計算します。</p> : null}
    </div>
    <div className="foot"><button className="btn btn-secondary" onClick={onClose}>キャンセル</button><button className="btn btn-primary" onClick={save}>{id ? '保存' : '登録'}</button></div>
  </Modal>;
}
