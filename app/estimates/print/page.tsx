'use client';
/* =========================================================
   見積書（印刷用）
   - S-03 の「PDF」から別タブで開く。/estimates/print/?pid=&ei=&v=
   - 社外向け（工種ごとに一式）。原価・掛率・粗利は出さない
   - 共通レイアウト（components/shell.tsx）はこのパスをメニューなし（bare）で描く。
     データは layout の StoreProvider が localStorage から復元するので、別タブでも同じものが読める
   ========================================================= */
import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { custOf, contactOf, estTotals, groupsOf } from '@/lib/calc';
import { resolveEst } from '@/lib/store';
import { num, yen, fmtD, fmtDate } from '@/lib/format';

export default function EstimatePrintPage() {
  const { s, hydrated } = useStore();
  const sp = useSearchParams();
  if (!hydrated) return null;                            // 保存データの復元中
  const r = resolveEst(s, { pid: sp.get('pid') || undefined, ei: Number(sp.get('ei')), v: Number(sp.get('v')) });
  if (!r) return <div className="print-page"><div className="print-tools"><button className="btn btn-secondary btn-sm" onClick={() => window.close()}>閉じる</button></div><p className="muted">見積がありません</p></div>;
  const { p, e, v } = r;
  const c = custOf(s, p), ct = contactOf(s, p);
  const t = estTotals(s, v.lines, e.rate);
  const groups = groupsOf(v).map(g => ({ g, sub: estTotals(s, v.lines.filter(l => l.group === g), e.rate).sub })).filter(x => v.lines.some(l => l.group === x.g));
  const exp = new Date(v.date + 'T00:00:00'); exp.setDate(exp.getDate() + 30);
  const custName = c.unreg ? (p.custName || '（未入力）') : c.name;
  return <div className="print-page">
    <div className="print-tools"><button className="btn btn-primary btn-sm" onClick={() => window.print()}>印刷する</button><button className="btn btn-secondary btn-sm" onClick={() => window.close()}>閉じる</button></div>
    <h1>御見積書</h1>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 18 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{custName}</div>
        {ct ? <div style={{ fontSize: 14, marginTop: 4 }}>{ct.dept ? <span>{ct.dept}　</span> : null}{ct.name.replace(/ 様$/, '')} 様</div> : null}
        <div style={{ marginTop: 14 }}>下記のとおり御見積申し上げます。</div>
      </div>
      <dl className="kv" style={{ fontSize: 12.5, minWidth: 260 }}>
        <dt>見積番号</dt><dd className="num">{e.no}　第{v.v}版</dd>
        <dt>見積日</dt><dd>{fmtD(v.date)}</dd>
        <dt>有効期限</dt><dd>{fmtD(fmtDate(exp))}</dd>
      </dl>
    </div>
    <dl className="kv" style={{ marginBottom: 14 }}>
      <dt>件名</dt><dd style={{ fontWeight: 700, color: '#000' }}>{p.title}</dd>
      <dt>御見積金額</dt><dd><b className="num" style={{ fontSize: 20, color: '#000' }}>{yen(t.total)}</b>　<span className="small">（税込）</span></dd>
    </dl>
    <div className="tbl" style={{ marginBottom: 14 }}><table>
      <thead><tr><th>工種</th><th className="r">数量</th><th>単位</th><th className="r">金額（円）</th></tr></thead>
      <tbody>{groups.length ? groups.map(x => <tr key={x.g}><td><b>{x.g}</b></td><td className="r num">1</td><td>式</td><td className="r num">{num(x.sub)}</td></tr>)
        : <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 18 }}>明細がありません</td></tr>}</tbody>
      <tfoot>
        <tr><td colSpan={3} className="r">小計（税抜）</td><td className="r num">{num(t.sub)}</td></tr>
        <tr><td colSpan={3} className="r">消費税（10%）</td><td className="r num">{num(t.tax)}</td></tr>
        <tr><td colSpan={3} className="r"><b>合計（税込）</b></td><td className="r num"><b>{num(t.total)}</b></td></tr>
      </tfoot>
    </table></div>
    <div style={{ marginBottom: 18 }}><div className="small muted" style={{ marginBottom: 4 }}>備考</div><div style={{ border: '1px solid var(--line)', borderRadius: 6, minHeight: 72 }} /></div>
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>颯エンタープライズ　建設事業部</div>
        <div style={{ marginTop: 4 }}>担当：{p.staff}</div>
      </div>
    </div>
  </div>;
}
