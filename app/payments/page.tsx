'use client';
/* S-08 外注支払 */
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { PageHead, downloadCsv } from '@/components/ui';
import { ptRate, payCalc, monthEnd, siteName } from '@/lib/calc';
import { setPayAdj } from '@/lib/store';
import { TODAY, THIS_MONTH, PREV_MONTH } from '@/lib/data';
import { md, nk, num, yen } from '@/lib/format';

export default function PaymentsPage() {
  const { s, ui, setUi, act, toast } = useStore();
  const [open, setOpen] = useState<string | null>(null); // 開いている協力会社
  const ed = ui.role === '管理者' || ui.role === '経理';
  const month = ui.s08month;
  const tot = { n: 0, e: 0, a: 0, p: 0 };
  const csvRows: (string | number)[][] = []; // 支払明細の出力（表に出している列）
  // その他の控除（手入力）。モックは change イベントで反映するので、確定（blur／Enter）で保存する
  const commitAdj = (pid: string, v: string) => { const n = Number(v.replace(/[,，]/g, '')); if (isNaN(n)) return; act(st => setPayAdj(st, month, pid, 'deduct', n)); };
  const rows = s.partners.map(pt => {
    const c = payCalc(s, pt.id, month); tot.n += c.normal; tot.e += c.extra; tot.a += c.amount; tot.p += c.pay;
    csvRows.push([pt.type, pt.name, `${pt.close}締め／${pt.pay}`, pt.rate ? nk(c.normal) : '', pt.rate ? nk(c.extra) : '', pt.rate ? ptRate(pt, monthEnd(month)) : '', pt.rate ? c.amount : '', c.contract, c.safety, c.adj.deduct, c.pay, pt.invNo ? '登録あり' : '登録なし']);
    const isOpen = open === pt.id;
    let detail: React.ReactNode = null;
    if (isOpen) {
      const days = [...new Set(c.byDay.map(x => x.date))].sort();
      const ws = s.workers.filter(w => w.org === pt.id);
      detail = <tr><td colSpan={13} style={{ background: 'var(--panel-tint)', padding: '12px 16px' }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
          <div><div className="small muted" style={{ fontWeight: 700, marginBottom: 4 }}>請負（案件の原価実績・外注費）</div><table style={{ width: 'auto' }}><tbody>{c.ukeoi.length ? c.ukeoi.map((u, i) => <tr key={i}><td className="num">{u.no}</td><td className="nw">{md(u.date)}</td><td className="small">{u.memo}</td><td className="r num">{num(u.amount)}</td></tr>) : <tr><td className="muted small">なし</td></tr>}</tbody></table></div><div><div className="small muted" style={{ fontWeight: 700, marginBottom: 4 }}>現場別</div><table style={{ width: 'auto' }}><tbody>{Object.keys(c.bySite).length ? Object.entries(c.bySite).map(([k, v]) => <tr key={k}><td className="num">{k}</td><td className="small">{siteName(s, k)}</td><td className="r num">{nk(v)} 人工</td><td className="r num">{yen(v * ptRate(pt, monthEnd(month)))}</td></tr>) : <tr><td className="muted">なし</td></tr>}</tbody></table></div>
          <div className="tbl" style={{ flex: 1, minWidth: 300 }}><div className="small muted" style={{ fontWeight: 700, marginBottom: 4 }}>日別（確認済み）</div><table className="ngrid"><thead><tr><th className="nm">作業員・現場</th>{days.map(d => <th key={d}>{md(d)}</th>)}</tr></thead><tbody>
            {ws.flatMap(w => [...new Set(c.byDay.filter(x => x.worker === w.id).map(x => x.site))].map(site => <tr key={w.id + site}><td className="nm">{w.name}　<span className="num small">{site}</span></td>{days.map(d => { const x = c.byDay.find(y => y.worker === w.id && y.site === site && y.date === d); return <td key={d} className={x ? 'e' : ''}>{x ? x.n : ''}</td>; })}</tr>))}
          </tbody></table></div></div></td></tr>;
    }
    return <React.Fragment key={pt.id}><tr className={`click ${isOpen ? 'sel' : ''}`} onClick={() => setOpen(isOpen ? null : pt.id)}><td><span className="tag ext">{pt.type}</span></td><td className="nw"><b style={{ color: 'var(--ink)' }}>{pt.name}</b><div className="small muted">{isOpen ? '▲ 閉じる' : '▼ 現場別・日別を見る'}</div></td>
      <td className="small nw">{pt.close}締め／{pt.pay}</td><td className="r num">{pt.rate ? nk(c.normal) : '－'}</td><td className="r num">{pt.rate ? nk(c.extra) : '－'}</td><td className="r num">{pt.rate ? num(ptRate(pt, monthEnd(month))) : '－'}</td><td className="r num">{pt.rate ? num(c.amount) : '－'}</td>
      <td className="r num">{c.contract ? num(c.contract) : '－'}</td>
      <td className="r num">{c.safety ? num(c.safety) : '－'}<div className="small muted">{pt.safety ? pt.safety + '%' : ''}</div></td>
      <td className="r">{ed ? <input className="w" key={month + pt.id + c.adj.deduct} defaultValue={c.adj.deduct} inputMode="numeric" aria-label="その他の控除" onClick={e => e.stopPropagation()} onBlur={e => commitAdj(pt.id, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commitAdj(pt.id, (e.target as HTMLInputElement).value); }} /> : num(c.adj.deduct)}{pt.other ? <div className="small muted">{pt.other}</div> : null}</td>
      <td className="r num"><b style={{ color: 'var(--ink)' }}>{num(c.pay)}</b></td><td>{pt.invNo ? <span className="badge ok">登録あり</span> : <span className="badge gray">登録なし</span>}</td>
      <td className="small">{c.pending ? <span style={{ color: 'var(--warn-tx)' }}>未確認 {nk(c.pending)}人工</span> : null}</td></tr>{detail}</React.Fragment>;
  });
  const doCsv = () => { downloadCsv(`外注支払_${month}.csv`, [['区分', '協力会社', '締め・支払', '人工', '割増人工', '単価', '常用金額', '請負金額', '安全協力会費', 'その他の控除', '支払額', 'インボイス'], ...csvRows]); toast(`${Number(month.slice(5))}月の支払明細（${csvRows.length}社）をCSVに出力しました`); };
  return <>
    <PageHead id="S-08" title="外注支払" sub="協力会社・一人親方" acts={<button className="btn btn-secondary btn-md" onClick={doCsv}>支払明細の出力</button>} />
    <div className="card"><div className="card-head"><h2 className="section-label">月×協力会社</h2><span className="cs">職長が「確認」した出面だけを集計</span>
      <div className="r"><span className="seg">{[PREV_MONTH, THIS_MONTH].map(m => <button key={m} onClick={() => { setUi({ s08month: m }); setOpen(null); }} aria-pressed={month === m}>{Number(m.slice(5))}月</button>)}</span></div></div>
    <div className="tbl"><table><thead><tr><th>区分</th><th>協力会社</th><th>締め・支払</th><th className="r">人工</th><th className="r">割増人工</th><th className="r">単価</th><th className="r">常用 金額</th><th className="r">請負 金額<br /><span style={{ fontWeight: 400 }}>（案件の外注費から）</span></th><th className="r">安全協力会費<br /><span style={{ fontWeight: 400 }}>（マスタの率）</span></th><th className="r">その他の控除<br /><span style={{ fontWeight: 400 }}>（手入力）</span></th><th className="r">支払額</th><th>インボイス</th><th></th></tr></thead>
    <tbody>{rows}</tbody><tfoot><tr><td colSpan={3}>合計</td><td className="r num">{nk(tot.n)}</td><td className="r num">{nk(tot.e)}</td><td></td><td className="r num">{num(tot.a)}</td><td></td><td></td><td></td><td className="r num">{num(tot.p)}</td><td colSpan={2}></td></tr></tfoot></table></div>
    <div className="card-body" style={{ borderTop: '1px solid var(--line-2)' }}><p className="note" style={{ margin: 0 }}>常用 金額＝（人工＋割増人工）×人工単価【仮：Q16】。割増人工＝1日8時間を超えた分を0.25人工単位で換算したもの。請負（出来高）は案件の「原価の明細」で外注費として登録した金額を自動で集計（ここでは入力しない）。安全協力会費は協力会社マスタの率で自動計算（常用＋請負に対して）、その他の控除（立替資材の相殺など）は手入力【要確認：今やっているか】。源泉徴収は個人の業務内容で決まるため未計算。モックは月単位で集計（締め日ごとの集計・支払期日の扱いはヒアリング後）。{month === THIS_MONTH ? `${Number(month.slice(5))}月は${md(TODAY)}までの確認済み分。` : ''}</p></div></div>
  </>;
}
