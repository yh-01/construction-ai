'use client';
/* S-10 マスタ v0.1.4：品目・工種・得意先・作業員・協力会社・取引先・就業ルール（＋会社設定）
   すべて 新規／編集／停止（再開）／削除（使われているものは削除不可→停止を使う） */
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { PageHead, TableCount, EmptyRow, MoreMenu, ConfirmModal, type ConfirmSpec } from '@/components/ui';
import { FilterBar, useFilter, useSort, type FilterDef } from '@/components/filter';
import { MasterModal } from '@/components/masters/master-modal';
import { CompanySettings } from '@/components/masters/company';
import { MDEF, toggleMasterStop, deleteMaster, type MasterTab } from '@/lib/store';
import { ROLES, partner, rateOf, ruleName } from '@/lib/calc';
import { TODAY, FLAG_DEF, FLAG_SHORT } from '@/lib/data';
import { num, uniq, fmtD } from '@/lib/format';
import type { Worker, FlagKey } from '@/lib/types';

const KW: Record<MasterTab, string> = { '品目': '品番・品名・呼び名・規格をまとめて検索', '工種': 'コード・名称・説明で検索', '得意先': '名称・住所・担当者・メールで検索', '作業員': '氏名・所属・職種で検索', '協力会社': '名称・所属作業員・インボイス番号で検索', '取引先': '名称・インボイス番号・備考で検索', '就業ルール': '名称で検索' };
const DESC: Partial<Record<MasterTab, string>> = { '取引先': '材料・リース・運搬・産廃などの請求元。原価の明細で「取引先」として選ぶ（協力会社は別マスタ）', '就業ルール': '雇用区分ごとの働き方。社員には「どのルールか」だけを持たせる', '作業員': '社員は勤怠・原価の設定を持つ。協力会社・一人親方の人は「出面（稼働の記録）」だけで、勤怠の設定は持たない', '協力会社': '外注先（法人・個人）。常用の単価、時間外、締め・支払、控除、インボイスを持つ' };
const flagChips = (w: Worker) => FLAG_DEF.map(([k, l]) => { const on = !!(w.flags || {})[k]; return <span key={k} className={`flagc ${on ? 'on' : ''}`} title={`${l}${on ? '：対象' : '：対象外'}`}>{FLAG_SHORT[k]}</span>; });
const ST_DEF: FilterDef = { k: 'st', label: '状態', type: 'select', opts: [['use', '利用中'], ['stop', '停止中']] };
const stTag = (x: { stopped?: boolean }) => x.stopped ? <> <span className="badge gray">停止中</span></> : null;
/* 配列を <br> 区切りで並べる（モックの join('<br>')） */
const brList = (a: string[]) => a.length ? a.map((x, i) => <React.Fragment key={i}>{i ? <br /> : null}{x}</React.Fragment>) : '－';
const B = ({ children }: { children: React.ReactNode }) => <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{children}</b>;

export default function MastersPage() {
  const sp = useSearchParams();
  const raw = sp.get('tab') || '品目';
  const t = raw === '商品' ? '品目' : raw;
  if (t === '会社設定') return <CompanySettings />;
  return <MasterList t={(t in MDEF ? t : '品目') as MasterTab} />;
}

function MasterList({ t }: { t: MasterTab }) {
  const { s, ui, act, toast } = useStore();
  const ed = ui.role === '管理者'; const K = 'm-' + t;
  const costVis = ROLES[ui.role].cost !== 'hide';
  const F = useFilter(K); const { sortBy, Th } = useSort(K);
  const [menu, setMenu] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ t: MasterTab; id: string | null } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const stOk = (x: { stopped?: boolean }) => { const v = F.fv('st'); return !v || (v === 'stop') === !!x.stopped; };

  const mStop = (id: string) => { const r = act(st => toggleMasterStop(st, t, id)); toast(r.name + ' を' + (r.stopped ? '停止' : '再開') + 'しました'); };
  const mDel = (id: string, name: string) => setConfirm({ title: t + 'を削除しますか', body: <p style={{ margin: 0 }}>「{name}」を削除します。元に戻せません。</p>, okLabel: '削除する', danger: true, onOk: () => { act(st => deleteMaster(st, t, id)); toast('削除しました'); } });
  /* 行の操作（管理者のみ）：編集／停止・再開／削除 */
  const rowActs = (x: { stopped?: boolean }) => {
    if (!ed) return null;
    const d = MDEF[t]; const used = d.used(s, x as never); const id = String((x as unknown as Record<string, string>)[d.key]); const key = t + ':' + id;
    return <td className="nw"><button className="btn btn-secondary btn-sm" onClick={() => setEdit({ t, id })}>編集</button> <MoreMenu small open={menu === key} onToggle={() => setMenu(menu === key ? null : key)} items={[
      { label: x.stopped ? '利用を再開する' : '停止する', onClick: () => mStop(id), note: x.stopped ? '' : '新しい見積・打刻などで選べなくなる（データは残る）' },
      { label: '削除', onClick: () => mDel(id, d.name(x as never)), danger: true, disabled: used, note: used ? d.usedMsg + '。削除できないので停止を使う' : '間違って登録したとき' }]} /></td>;
  };

  let defs: FilterDef[] = [], head: React.ReactNode = null, rows: React.ReactNode[] = [], total = 0, count = 0, nHead = 0;
  if (t === '品目') {
    defs = [{ k: 'cat', label: '区分', type: 'select', opts: ['材料', '労務', '法定福利費', '経費'] }, { k: 'kind', label: '分類', type: 'select', opts: uniq(s.products.map(p => p.kind)) }, { k: 'unit', label: '単位', type: 'select', opts: uniq(s.products.map(p => p.unit)) }, { k: 'cost', label: '原価（円）', type: 'range' }, ST_DEF];
    const list = s.products.filter(p => stOk(p) && F.fText('kw', p.code, p.name, p.alias, p.spec) && F.fSel('cat', p.cat) && F.fSel('kind', p.kind) && F.fSel('unit', p.unit) && F.fRange('cost', p.cost));
    total = s.products.length; count = list.length; nHead = 8;
    head = <><Th k="code" label="品番" /><Th k="name" label="標準品名" /><th>先方での呼び名</th><th>規格</th><th>単位</th><Th k="cost" label="原価" cls="r" /><th>区分</th><th>分類</th></>;
    rows = sortBy(list, { code: p => p.code, name: p => p.name, cost: p => p.cost }).map(p => <tr key={p.code} className={p.stopped ? 'stopped' : ''}><td className="num small">{p.code}</td><td><B>{p.name}</B>{stTag(p)}</td><td className="small">{p.alias}</td><td className="small">{p.spec}</td><td>{p.unit}</td><td className="r num">{p.cat === '法定福利費' ? '－' : num(p.cost)}</td><td>{p.cat}</td><td className="small">{p.kind}</td>{rowActs(p)}</tr>);
  }
  if (t === '工種') {
    defs = [ST_DEF];
    const list = s.koshu.filter(k => stOk(k) && F.fText('kw', k.code, k.name, k.desc)); total = s.koshu.length; count = list.length; nHead = 3;
    head = <><Th k="code" label="コード" /><Th k="name" label="名称" /><th>説明</th></>;
    rows = sortBy(list, { code: k => k.code, name: k => k.name }).map(k => <tr key={k.code} className={k.stopped ? 'stopped' : ''}><td className="num small">{k.code}</td><td><B>{k.name}</B>{stTag(k)}</td><td className="small">{k.desc}</td>{rowActs(k)}</tr>);
  }
  if (t === '得意先') {
    defs = [{ k: 'rate', label: '掛率', type: 'range' }, ST_DEF];
    const list = s.customers.filter(c => stOk(c) && F.fText('kw', c.name, c.short, c.addr, c.tel, ...(c.contacts || []).flatMap(k => [k.name, k.email, k.dept])) && F.fRange('rate', c.rate));
    total = s.customers.length; count = list.length; nHead = 6;
    head = <><Th k="name" label="名称" /><th>住所</th><th>電話</th><th>担当者</th><Th k="rate" label="掛率" cls="r" /><th>備考</th></>;
    rows = sortBy(list, { name: c => c.name, rate: c => c.rate }).map(c => <tr key={c.id} className={c.stopped ? 'stopped' : ''}><td><B>{c.name}</B>{stTag(c)}<div className="small muted">{c.short}</div></td><td className="small">{c.zip ? '〒' + c.zip + ' ' : ''}{c.addr || ''}</td><td className="num small nw">{c.tel}</td>
      <td className="small">{(c.contacts || []).length ? (c.contacts || []).map((k, i) => <div key={i}>{k.name} <span className="muted">{k.dept}</span><br /><span className="num">{k.email}</span></div>) : '－'}</td><td className="r num">{c.rate.toFixed(2)}</td><td className="small">{c.note || ''}</td>{rowActs(c)}</tr>);
  }
  if (t === '作業員') {
    const orgName = (w: Worker) => w.kind === '社員' ? w.org : partner(s, w.org).name;
    defs = [{ k: 'kind', label: '区分', type: 'select', opts: ['社員', '協力会社', '一人親方'] }, { k: 'org', label: '所属', type: 'select', opts: uniq(s.workers.map(orgName)) }, { k: 'emp', label: '雇用形態', type: 'select', opts: ['正社員', '契約社員', 'パート・アルバイト', '役員'] }, { k: 'fl', label: '計算の対象', type: 'select', opts: FLAG_DEF.map(([k, l]) => [k, l] as [string, string]) }, ST_DEF];
    const list = s.workers.filter(w => stOk(w) && F.fText('kw', w.name, w.kana, orgName(w), w.job, w.empNo) && F.fSel('kind', w.kind) && F.fSel('org', orgName(w)) && F.fSel('emp', w.emp || '') && (!F.fv('fl') || (w.flags || {})[F.fv('fl') as FlagKey]));
    total = s.workers.length; count = list.length; nHead = 7;
    head = <><Th k="name" label="氏名" /><th>区分・所属</th><th>職種</th><th>雇用・給与形態</th><th>就業ルール</th><th>計算の対象</th><th className="r">単価（日額）</th></>;
    rows = sortBy(list, { name: w => w.kana || w.name }).map(w => { const pt = w.kind !== '社員' ? partner(s, w.org) : null; const r = rateOf(s, w.id, TODAY); const rates = w.rates || [];
      return <tr key={w.id} className={w.stopped ? 'stopped' : ''}><td><B>{w.name}</B>{stTag(w)}<div className="small muted">{w.kana || ''}{w.empNo ? '　No.' + w.empNo : ''}</div></td>
        <td><span className={`tag ${pt ? 'ext' : 'staff'}`}>{w.kind}</span><div className="small">{orgName(w)}</div></td><td className="small">{w.job}</td>
        <td className="small">{pt ? <span className="muted">－（外部）</span> : <>{w.emp || ''}<br />{w.pay || ''}</>}</td><td className="small">{pt ? <span className="muted">持たない</span> : ruleName(s, w.rule)}</td>
        <td className="nw">{flagChips(w)}</td>
        <td className="r num small">{costVis ? (r ? num(r) : '－') : '－'}<div className="muted">{pt ? '協力会社の単価' : (rates.length > 1 ? '履歴 ' + rates.length + '件' : '')}</div></td>{rowActs(w)}</tr>; });
  }
  if (t === '協力会社') {
    defs = [{ k: 'type', label: '区分', type: 'select', opts: ['法人', '個人（一人親方）'] }, { k: 'ct', label: '契約の形', type: 'select', opts: ['常用・請負', '常用のみ', '請負のみ'] }, { k: 'close', label: '締め日', type: 'select', opts: uniq(s.partners.map(p => p.close)) }, { k: 'inv', label: 'インボイス登録', type: 'select', opts: [['あり', 'あり'], ['なし', 'なし']] }, { k: 'rate', label: '人工単価（円）', type: 'range' }, ST_DEF];
    const list = s.partners.filter(p => stOk(p) && F.fText('kw', p.name, p.invNo, p.person, ...s.workers.filter(w => w.org === p.id).map(w => w.name)) && F.fSel('type', p.type) && F.fSel('ct', p.contract || '') && F.fSel('close', p.close) && F.fSel('inv', p.invNo ? 'あり' : 'なし') && F.fRange('rate', p.rate));
    total = s.partners.length; count = list.length; nHead = 8;
    head = <><Th k="name" label="名称" /><th>所属作業員</th><th>契約の形</th><Th k="rate" label="人工単価（常用）" cls="r" /><th>時間外</th><th>締め／支払</th><th>控除</th><th>インボイス</th></>;
    rows = sortBy(list, { name: p => p.name, rate: p => p.rate }).map(p => { const h = p.rateHist || [];
      return <tr key={p.id} className={p.stopped ? 'stopped' : ''}><td><B>{p.name}</B>{stTag(p)}<div className="small muted">{p.type}{p.person ? '　担当 ' + p.person : ''}</div></td>
        <td className="small">{brList(s.workers.filter(w => w.org === p.id).map(w => w.name))}</td><td className="small">{p.contract || ''}</td>
        <td className="r num">{p.rate ? num(p.rate) : '－'}{h.length > 1 ? <div className="small muted">{fmtD(h[h.length - 1].from)}〜</div> : null}{p.half ? <div className="small muted">半日 {num(p.half)}</div> : null}</td>
        <td className="small">{p.ot || ''}</td><td className="small nw">{p.close}締め<br />{p.pay}払い</td>
        <td className="small">{p.safety ? '安全協力会費 ' + p.safety + '%' : '－'}{p.other ? <div className="muted">{p.other}</div> : null}{p.wht && p.wht !== '不要' ? <div>源泉：{p.wht}</div> : null}</td>
        <td className="small">{p.invNo ? <><span className="badge ok">登録あり</span><div className="num muted">{p.invNo}</div></> : <span className="badge gray">なし</span>}</td>{rowActs(p)}</tr>; });
  }
  if (t === '取引先') {
    defs = [{ k: 'cat', label: '区分', type: 'select', opts: uniq(s.vendors.map(v => v.cat)) }, { k: 'inv', label: 'インボイス登録', type: 'select', opts: [['あり', 'あり'], ['なし', 'なし']] }, ST_DEF];
    const list = s.vendors.filter(v => stOk(v) && F.fText('kw', v.name, v.invNo, v.note) && F.fSel('cat', v.cat) && F.fSel('inv', v.invNo ? 'あり' : 'なし'));
    total = s.vendors.length; count = list.length; nHead = 7;
    head = <><Th k="name" label="名称" /><th>区分</th><th>電話</th><th>締め／支払</th><th>インボイス</th><th className="r">原価の明細</th><th>備考</th></>;
    rows = sortBy(list, { name: v => v.name }).map(v => { const n = Object.values(s.costs).reduce((tt, l) => tt + l.filter(c => c.sid === v.id).length, 0);
      return <tr key={v.id} className={v.stopped ? 'stopped' : ''}><td><B>{v.name}</B>{stTag(v)}</td><td>{v.cat}</td><td className="num small">{v.tel}</td><td className="small nw">{v.close}締め／{v.pay}</td>
        <td className="small">{v.invNo ? <><span className="badge ok">登録あり</span><div className="num muted">{v.invNo}</div></> : <span className="badge gray">なし</span>}</td><td className="r num">{n}件</td><td className="small">{v.note || ''}</td>{rowActs(v)}</tr>; });
  }
  if (t === '就業ルール') {
    defs = [ST_DEF];
    const list = s.workRules.filter(r => stOk(r) && F.fText('kw', r.name)); total = s.workRules.length; count = list.length; nHead = 8;
    head = <><Th k="name" label="名称" /><th>所定の時間</th><th>休憩</th><th>労働時間制</th><th>休日カレンダー</th><th>残業の数え方</th><th>遅刻・早退</th><th className="r">使っている社員</th></>;
    rows = list.map(r => <tr key={r.id} className={r.stopped ? 'stopped' : ''}><td><B>{r.name}</B>{stTag(r)}</td><td className="num small nw">{r.start}〜{r.end}<br />{r.hours}時間</td><td className="small">{r.brk}</td><td className="small">{r.system}</td><td className="small">{r.cal}</td><td className="small">{r.ot}</td><td className="small">{r.late}</td>
      <td className="r small">{brList(s.workers.filter(w => w.rule === r.id).map(w => w.name))}</td>{rowActs(r)}</tr>);
  }
  const cols = nHead + (ed ? 1 : 0);
  return <>
    <PageHead id="S-10" title={t + 'マスタ'} sub={<>{['作業員', '協力会社', '取引先', '就業ルール'].includes(t) ? <><span className="tag kari">【仮】項目はヒアリングで確定</span> </> : null}サンプル{ui.role === '経理' ? '（経理は閲覧のみ）' : ''}</>}
      acts={ed ? <button className="btn btn-primary btn-md" onClick={() => setEdit({ t, id: null })}>＋ 新規登録</button> : null} />
    <div className="card"><FilterBar keyName={K} cfg={{ kw: KW[t], quick: defs }} />
      <div className="card-head"><TableCount n={count} total={total} unit="件" />{t === '品目' ? <span className="cs">本番は約1,000品目（AIでドラフトし先方確認で確定）</span> : DESC[t] ? <span className="cs">{DESC[t]}</span> : null}</div>
      <div className="tbl"><table><thead><tr>{head}{ed ? <th></th> : null}</tr></thead><tbody>{rows.length ? rows : <EmptyRow cols={cols} onClear={F.clear} />}</tbody></table></div></div>
    <p className="note">停止：新しい見積・打刻・受注などで選べなくなりますが、過去のデータは残ります。削除：使われていないものだけ（間違って登録したとき用）。</p>
    {edit ? <MasterModal key={edit.t + ':' + (edit.id || '')} t={edit.t} id={edit.id} onClose={() => setEdit(null)} /> : null}
    {confirm ? <ConfirmModal spec={confirm} onClose={() => setConfirm(null)} /> : null}
  </>;
}
