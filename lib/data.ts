/* =========================================================
   サンプルデータ（すべて架空）。HTMLモック v0.1.5 のものをそのまま型付きで保持。
   読み書きは lib/store.ts から行う（画面から直接触らない）
   ========================================================= */
import type {
  Koshu, Customer, Product, Partner, Worker, Vendor, WorkRule, Company, Holiday,
  Project, Cost, Punch, EstLine, Flags, FlagKey,
} from './types';

export const TODAY = '2026-10-07';
export const SITE_INTERNAL = 'INT'; // 社内作業
export const DEFAULT_RATE = 1.30; // 得意先マスタ未登録の与件で使う標準掛率【仮】

export const KOSHU: Koshu[] = [
  { code: 'K01', name: '配管工事', desc: '配管の敷設・接続（材料・人工）' },
  { code: 'K02', name: '支持・吊り', desc: '架台・支持金物・吊りボルト' },
  { code: 'K03', name: '保温工事', desc: '保温・ラギング' },
  { code: 'K04', name: '撤去・搬出', desc: '既設設備・配管の撤去と搬出' },
  { code: 'K05', name: '搬入・据付', desc: '重量物の搬入・据付・芯出し' },
  { code: 'K06', name: '仮設・運搬', desc: '足場・運搬・重機・処分' },
  { code: 'K07', name: '試運転・調整', desc: '耐圧試験・試運転立会' },
  { code: 'K08', name: '電気工事', desc: '電源切替・盤改造など（外注）' },
];

export const CUSTOMERS: Customer[] = [
  { id: 'C1', name: '東駿精機工業株式会社', short: '東駿精機', zip: '420-0000', addr: '静岡県静岡市葵区（架空）1-2-3', tel: '054-000-1101', rate: 1.30, note: '見積はPDFをメールで送付。本社工場と第3工場で窓口が別',
    contacts: [{ id: 'c11', name: '杉山 一郎', dept: '本社工場 設備課', email: 'sugiyama@example.com', tel: '054-000-1102' }, { id: 'c12', name: '内田 学', dept: '第3工場 設備課', email: 'uchida@example.com', tel: '054-000-1188' }] },
  { id: 'C2', name: '大浜ケミカル株式会社', short: '大浜ケミカル', zip: '424-0000', addr: '静岡県静岡市清水区（架空）4-5', tel: '054-000-2202', rate: 1.25, note: '支払は月末締め翌々月末',
    contacts: [{ id: 'c21', name: '片桐 由美', dept: '工務部', email: 'katagiri@example.com', tel: '054-000-2203' }] },
  { id: 'C3', name: '清見製紙株式会社', short: '清見製紙', zip: '417-0000', addr: '静岡県富士市（架空）6-7-8', tel: '0545-00-3303', rate: 1.35, note: '',
    contacts: [{ id: 'c31', name: '望月 正', dept: '保全課', email: 'mochizuki@example.com', tel: '0545-00-3304' }, { id: 'c32', name: '石川 恵', dept: '第2工場 保全', email: 'ishikawa@example.com', tel: '0545-00-3390' }] },
];

/* 品目マスタ（cat：材料／労務／法定福利費／経費、kind：工種の目安） */
export const PRODUCTS: Product[] = [
  { code: 'P-0101', name: 'SUS配管 25A Sch10S', alias: 'ステン管25、SUS25', spec: '4m', unit: '本', cost: 6800, cat: '材料', kind: '配管' },
  { code: 'P-0102', name: 'SUS配管 50A Sch10S', alias: 'ステン管50、SUS50', spec: '4m', unit: '本', cost: 12400, cat: '材料', kind: '配管' },
  { code: 'P-0111', name: 'SUS エルボ 25A', alias: 'L25、エル25', spec: '90°ロング', unit: '個', cost: 680, cat: '材料', kind: '配管' },
  { code: 'P-0112', name: 'SUS エルボ 50A', alias: 'L50、エル50', spec: '90°ロング', unit: '個', cost: 1450, cat: '材料', kind: '配管' },
  { code: 'P-0115', name: 'SUS チーズ 25A', alias: 'T25、ティー25', spec: '同径', unit: '個', cost: 1200, cat: '材料', kind: '配管' },
  { code: 'P-0121', name: 'SUS フランジ 50A', alias: 'フランジ50', spec: 'JIS 10K', unit: '枚', cost: 2900, cat: '材料', kind: '配管' },
  { code: 'P-0122', name: 'ガスケット 50A', alias: 'パッキン50', spec: 'ノンアス', unit: '枚', cost: 350, cat: '材料', kind: '配管' },
  { code: 'P-0131', name: 'Uボルト 25A', alias: 'Uバン25', spec: 'SUS', unit: '個', cost: 180, cat: '材料', kind: '支持' },
  { code: 'P-0132', name: '支持金物 L型架台', alias: 'Lアングル架台、架台', spec: 'L-50 溶融亜鉛', unit: '台', cost: 3800, cat: '材料', kind: '支持' },
  { code: 'P-0133', name: '吊りボルト W3/8', alias: '全ネジ、寸切り', spec: '1m', unit: '本', cost: 220, cat: '材料', kind: '支持' },
  { code: 'P-0141', name: '保温材 25A用', alias: 'ラギング25', spec: 'GW 25t', unit: 'm', cost: 1100, cat: '材料', kind: '保温' },
  { code: 'P-0201', name: '配管工', alias: '配管屋、配管人工', spec: '', unit: '人工', cost: 22000, cat: '労務', kind: '労務' },
  { code: 'P-0202', name: '鳶工', alias: '鳶、重量鳶', spec: '', unit: '人工', cost: 24000, cat: '労務', kind: '労務' },
  { code: 'P-0203', name: '溶接工', alias: 'TIG溶接、溶接屋', spec: 'TIG', unit: '人工', cost: 25000, cat: '労務', kind: '労務' },
  { code: 'P-0204', name: '機械据付工', alias: '据付、芯出し', spec: '', unit: '人工', cost: 24000, cat: '労務', kind: '労務' },
  { code: 'P-0301', name: '法定福利費', alias: '社保、法定福利', spec: '事業主負担分', unit: '式', cost: 0, cat: '法定福利費', kind: '法定福利費' },
  { code: 'P-0401', name: 'クレーン回送費 25t', alias: '回送、ラフター回送', spec: '往復', unit: '回', cost: 45000, cat: '経費', kind: '重機' },
  { code: 'P-0402', name: 'ラフタークレーン 25t', alias: 'ラフター、クレーン', spec: 'オペ付', unit: '日', cost: 68000, cat: '経費', kind: '重機' },
  { code: 'P-0403', name: 'フォークリフト リース', alias: 'フォーク', spec: '3t', unit: '日', cost: 12000, cat: '経費', kind: '重機' },
  { code: 'P-0404', name: '運搬費 4tユニック', alias: 'ユニック、運搬', spec: '', unit: '台', cost: 38000, cat: '経費', kind: '運搬' },
  { code: 'P-0405', name: '産業廃棄物処分費', alias: '産廃', spec: '', unit: '式', cost: 30000, cat: '経費', kind: '処分' },
];

/* 協力会社（法人2・一人親方2・請負のみ1） */
const PARTNERS_BASE: Partner[] = [
  { id: 'K1', name: '有限会社 山北設備', type: '法人', rate: 22000, close: '月末', pay: '翌月末', invoice: true },
  { id: 'K2', name: '株式会社 浜鳶工業', type: '法人', rate: 25000, close: '20日', pay: '翌月10日', invoice: true },
  { id: 'S1', name: '吉田 浩二（一人親方）', type: '個人（一人親方）', rate: 23000, close: '月末', pay: '翌月末', invoice: false },
  { id: 'S2', name: '山本 修（一人親方）', type: '個人（一人親方）', rate: 26000, close: '月末', pay: '翌月末', invoice: true },
  { id: 'K3', name: '株式会社 駿東電設', type: '法人', rate: null, close: '月末', pay: '翌月末', invoice: true },
];
const PARTNER_EXT: Record<string, Partial<Partner>> = {
  K1: { addr: '静岡県富士市（架空）', tel: '0545-00-1111', person: '山北 和也', invNo: 'T1234567890123', license: '静岡県知事 許可（般-5）第00001号', contract: '常用・請負', rateHist: [{ from: '2025-04-01', v: 21000 }, { from: '2026-04-01', v: 22000 }], half: 12000, ot: '人工に足す（0.25単位）', fee: '先方負担', safety: 1.0, other: '', wht: '不要', checker: '職長' },
  K2: { addr: '静岡県沼津市（架空）', tel: '055-000-2222', person: '浜田 誠', invNo: 'T2345678901234', license: '', contract: '常用のみ', rateHist: [{ from: '2026-04-01', v: 25000 }], half: 13000, ot: '人工に足す（0.25単位）', fee: '先方負担', safety: 1.0, other: '立替資材は翌月相殺', wht: '不要', checker: '職長' },
  S1: { addr: '静岡県富士宮市（架空）', tel: '090-0000-3333', person: '吉田 浩二', invNo: '', license: '', contract: '常用のみ', rateHist: [{ from: '2026-04-01', v: 23000 }], half: null, ot: '時間単価で別に払う', fee: '当社負担', safety: 0, other: '', wht: '要確認', checker: '職長' },
  S2: { addr: '静岡県三島市（架空）', tel: '090-0000-4444', person: '山本 修', invNo: 'T3456789012345', license: '', contract: '常用のみ', rateHist: [{ from: '2026-04-01', v: 26000 }], half: null, ot: '人工に足す（0.25単位）', fee: '当社負担', safety: 0, other: '', wht: '要確認', checker: '職長と管理者' },
  K3: { addr: '静岡県駿東郡（架空）', tel: '055-000-5555', person: '駿東 太郎', invNo: 'T4567890123456', license: '国土交通大臣 許可（特-4）第00002号', contract: '請負のみ', rateHist: [], half: null, ot: '－', fee: '先方負担', safety: 1.0, other: '', wht: '不要', checker: '管理者' },
};
export const PARTNERS: Partner[] = PARTNERS_BASE.map(p => ({ ...p, ...(PARTNER_EXT[p.id] || {}) }));

/* 作業員（社員6、協力会社2社×2、一人親方2） */
const WORKERS_BASE: Worker[] = [
  { id: 'E1', name: '佐藤 健一', kind: '社員', org: '建設事業部', job: '配管工（職長）', rates: [{ from: '2026-04-01', v: 32000 }] },
  { id: 'E2', name: '鈴木 大輔', kind: '社員', org: '建設事業部', job: '配管工', rates: [{ from: '2025-04-01', v: 25000 }, { from: '2026-04-01', v: 26000 }] },
  { id: 'E3', name: '高橋 翔', kind: '社員', org: '建設事業部', job: '配管工', rates: [{ from: '2026-04-01', v: 24000 }] },
  { id: 'E4', name: '田中 誠', kind: '社員', org: '建設事業部', job: '鳶工（職長）', rates: [{ from: '2026-04-01', v: 30000 }] },
  { id: 'E5', name: '伊藤 亮', kind: '社員', org: '建設事業部', job: '溶接工', rates: [{ from: '2026-04-01', v: 28000 }] },
  { id: 'X1', name: '渡辺 剛', kind: '協力会社', org: 'K1', job: '配管工' },
  { id: 'X2', name: '中村 拓也', kind: '協力会社', org: 'K1', job: '配管工' },
  { id: 'X3', name: '小林 隆', kind: '協力会社', org: 'K2', job: '鳶工' },
  { id: 'X4', name: '加藤 大樹', kind: '協力会社', org: 'K2', job: '鳶工' },
  { id: 'X5', name: '吉田 浩二', kind: '一人親方', org: 'S1', job: '配管工' },
  { id: 'X6', name: '山本 修', kind: '一人親方', org: 'S2', job: '鳶工' },
  { id: 'E6', name: '望月 さやか', kind: '社員', org: '建設事業部', job: '事務', rates: [] },
];
/* ---- v0.1.5 設定まわり（すべて【仮】。勤怠の正本を颯にするか＝案1/案2 はヒアリングで決める） ---- */
export const FLAG_DEF: [FlagKey, string, string][] = [
  ['punch', '打刻する', '颯で出退勤・現場を打刻する'],
  ['att', '勤怠集計の対象', '月の勤怠集計・給与CSVに出す（案1）'],
  ['cost', '労務費（原価）の対象', '打刻した人工×日額原価単価を工事原価に入れる'],
  ['ot', '残業アラートの対象', '36協定の上限に近づいたら知らせる。管理監督者・役員は外す'],
];
export const FLAG_SHORT: Record<FlagKey, string> = { punch: '打刻', att: '勤怠', cost: '原価', ot: '残業' };
export const EXT_FLAGS: Flags = { punch: true, att: false, cost: true, ot: false };
const STAFF_EXT: Record<string, Partial<Worker>> = {
  E1: { kana: 'さとう けんいち', empNo: '1001', emp: '正社員', pay: '日給月給', rule: 'R1', approver: '川口（管理者）', hired: '2012-04-01', means: 'スマホ', flags: { punch: true, att: true, cost: true, ot: true }, lv: { base: '2026-04-01', grant: 20, used: 6 } },
  E2: { kana: 'すずき だいすけ', empNo: '1008', emp: '正社員', pay: '日給月給', rule: 'R1', approver: '佐藤 健一（職長）', hired: '2018-04-01', means: 'スマホ', flags: { punch: true, att: true, cost: true, ot: true }, lv: { base: '2026-04-01', grant: 16, used: 3 } },
  E3: { kana: 'たかはし しょう', empNo: '1015', emp: '正社員', pay: '日給月給', rule: 'R1', approver: '佐藤 健一（職長）', hired: '2023-10-01', means: '共用端末のみ', flags: { punch: true, att: true, cost: true, ot: true }, lv: { base: '2026-04-01', grant: 12, used: 1 } },
  E4: { kana: 'たなか まこと', empNo: '1003', emp: '正社員', pay: '日給月給', rule: 'R1', approver: '川口（管理者）', hired: '2014-04-01', means: 'スマホ', flags: { punch: true, att: true, cost: true, ot: true }, lv: { base: '2026-04-01', grant: 20, used: 8 } },
  E5: { kana: 'いとう りょう', empNo: '1011', emp: '契約社員', pay: '日給', rule: 'R1', approver: '田中 誠（職長）', hired: '2020-06-01', means: 'スマホ', flags: { punch: true, att: true, cost: true, ot: true }, lv: { base: '2026-06-01', grant: 15, used: 2 } },
  E6: { kana: 'もちづき さやか', empNo: '1020', emp: 'パート・アルバイト', pay: '時給', rule: 'R2', approver: '川口（管理者）', hired: '2024-04-01', means: '共用端末のみ', flags: { punch: true, att: true, cost: false, ot: true }, lv: { base: '2026-04-01', grant: 7, used: 4 } },
};
const EXT_EXT: Record<string, Partial<Worker>> = { X1: { means: 'スマホ' }, X2: { means: 'スマホ' }, X3: { means: '共用端末のみ' }, X4: { means: '共用端末のみ' }, X5: { means: 'スマホ' }, X6: { means: '代理入力のみ' } };
export const WORKERS: Worker[] = WORKERS_BASE.map(w => {
  const x: Worker = { ...w, ...(STAFF_EXT[w.id] || EXT_EXT[w.id] || {}) };
  if (x.kind !== '社員') x.flags = { ...EXT_FLAGS };
  return x;
});

export const VENDORS: Vendor[] = [
  { id: 'V1', name: '静岡配管資材（架空）', cat: '材料', invNo: 'T5678901234567', tel: '054-000-1001', close: '月末', pay: '翌月末', note: '' },
  { id: 'V2', name: '東海クレーン（架空）', cat: '重機・リース', invNo: 'T6789012345678', tel: '054-000-1002', close: '月末', pay: '翌月末', note: 'ラフター・回送' },
  { id: 'V3', name: '清水リース（架空）', cat: '重機・リース', invNo: 'T7890123456789', tel: '054-000-1003', close: '20日', pay: '翌月末', note: '' },
  { id: 'V4', name: '駿河産廃センター（架空）', cat: '産廃', invNo: 'T8901234567890', tel: '054-000-1004', close: '月末', pay: '翌月末', note: 'マニフェスト' },
  { id: 'V5', name: '富岳運輸（架空）', cat: '運搬', invNo: '', tel: '054-000-1005', close: '月末', pay: '翌月末', note: 'インボイス未登録（経過措置）' },
];
export const WORK_RULES: WorkRule[] = [
  { id: 'R1', name: '現場（日給月給・日給）', start: '08:00', end: '17:00', hours: 8, brk: '標準（10時15分・昼60分・15時15分）', system: '1年単位の変形労働時間制【要確認】', cal: '現場カレンダー', ot: '1日8時間超・週40時間超', late: '判定しない（朝礼基準）' },
  { id: 'R2', name: '事務（月給・時給）', start: '08:30', end: '17:30', hours: 8, brk: '昼60分', system: '通常', cal: '事務所カレンダー', ot: '1日8時間超・週40時間超', late: '判定する' },
];
export const COMPANY: Company = {
  close: '月末', costClose: '月末（勤怠と同じ）', lockAfter: '締めた月の打刻は変更不可（管理者が締めを解除したときだけ）',
  round: '丸めない（1分単位で集計）', night: '22:00〜5:00',
  ninkuH: 8, ninkuUnit: '0.25', split: '時間で按分',
  m45: 45, y360: 360, special: 'あり', spY: 720, spM: 100, spAvg: 80, alert1: 30, alert2: 40,
  lvBase: '入社日ごと', lvFirst: '入社6か月で10日', lv5: '基準日から9か月で5日未満なら知らせる',
  means: 'スマホ・共用端末・代理入力', gps: '出勤・退勤のときに記録', proxy: '職長・管理者は代理入力できる（理由必須）', approveBy: '翌日まで（過ぎたら一覧で警告）',
  internal: '原価に入れない【要確認】', payroll: '未定（Q15：給与ソフト名で決める）',
};
export const HOLIDAYS: Holiday[] = [
  { name: '毎週日曜', when: '毎週', kind: '法定休日', cal: 'すべて' },
  { name: '毎週土曜', when: '毎週（現場は第2・4のみ）【要確認】', kind: '所定休日', cal: 'すべて' },
  { name: '国民の祝日', when: '祝日', kind: '所定休日', cal: '事務所カレンダー' },
  { name: '夏季休暇', when: '2026/8/13〜8/16', kind: '所定休日', cal: 'すべて' },
  { name: '年末年始', when: '2026/12/29〜2027/1/3', kind: '所定休日', cal: 'すべて' },
];

/* 見積明細のつくり方（品番・数量・掛率の上書き） */
function L(group: string, code: string, qty: number, rate?: number): EstLine { return { type: 'item', group, code, qty, rate: rate ?? null }; }
function WEL(group: string, cost: number): EstLine { return { type: 'item', group, code: 'P-0301', qty: 1, rate: 1.0, cost }; }

/* 案件（与件〜完了）。見積は版ごとに明細を持つ。rate は store の初期化で得意先から入れる */
export const PROJECTS_INIT: Project[] = [
  { id: 'Y-2026-031', status: '与件', cust: null, custName: '清見製紙 第2工場', contact: { name: '望月 正', email: '', tel: '0545-00-3304' }, title: '第2工場 ボイラー給水配管 更新', reqDate: '2026-09-28', staff: '長谷川（営業）', estDue: '2026-10-16', expire: null, site: '清見製紙 第2工場 ボイラー棟',
    foreman: null, period: null, no: null, members: [], estimates: [], memos: 1, files: ['現地写真（9/28）.zip', '既設配管図.pdf'], summary: null },
  { id: 'Y-2026-033', status: '見積中', cust: null, custName: '富岳フーズ（仮） 富士宮工場', contact: { name: '大石 様（工務課）', email: 'oishi@example.com', tel: '0544-00-1234' }, title: 'CIP洗浄ライン 配管増設', reqDate: '2026-09-24', staff: '杉本（営業）', estDue: '2026-10-02', expire: '2026-10-31',
    site: '富岳フーズ 富士宮工場 第2ライン', foreman: 'E1', period: null, no: null, members: [], memos: 1, files: ['ライン配置図.pdf'], summary: { equip: '第2ライン CIP洗浄', work: 'SUS 25A 往き・還り 約40m 増設、チーズ分岐', period: '11月中旬（土日）', cond: '食品工場のため異物混入対策・入場教育あり', due: '10/2 提出', note: '新規のお客様（紹介）' },
    estimates: [{ no: 'M-2026-043', rate: 0, versions: [
      { v: 1, date: '2026-10-01', state: '提出済', lines: [L('配管工事', 'P-0101', 12), L('配管工事', 'P-0111', 24), L('配管工事', 'P-0115', 6), L('支持・吊り', 'P-0131', 30), L('配管工事', 'P-0201', 6, 1.20), WEL('配管工事', 22000)] }] }] },
  { id: 'Y-2026-020', status: '失注', cust: 'C2', custName: '大浜ケミカル', title: '倉庫棟 消火配管 改修', reqDate: '2026-08-03', staff: '杉本（営業）', estDue: '2026-08-21', expire: '2026-09-20', site: '大浜ケミカル 本社工場 倉庫棟',
    foreman: 'E4', period: null, no: null, members: [], memos: 1, files: ['消火設備 系統図.pdf'], lostReason: '価格（他社が約8%安い）', summary: null,
    estimates: [{ no: 'M-2026-034', rate: 0, versions: [
      { v: 1, date: '2026-08-21', state: '失注', lines: [L('配管工事', 'P-0101', 40, 1.30), L('配管工事', 'P-0111', 36), L('配管工事', 'P-0131', 50), L('配管工事', 'P-0201', 24, 1.20), WEL('配管工事', 48000)] }] }] },
  { id: 'Y-2026-026', status: '失注', cust: null, custName: '清見製紙', title: '排水ピット ポンプ配管 更新', reqDate: '2026-09-02', staff: '長谷川（営業）', estDue: '2026-09-15', expire: null, site: '清見製紙 第2工場',
    foreman: null, period: null, no: null, members: [], memos: 0, files: [], lostReason: '先方の計画延期（来期に再検討）', summary: null, estimates: [] },
  { id: 'Y-2026-029', status: '見積中', cust: null, custName: '東駿精機 第3工場 設備課', contact: { name: '内田 様', email: 'uchida@example.com', tel: '' }, title: '第3工場 冷却水配管 増設工事', reqDate: '2026-09-14', staff: '長谷川（営業）', estDue: '2026-09-25', expire: '2026-11-04', site: '東駿精機 第3工場 成形棟',
    foreman: 'E1', period: ['2026-11-09', '2026-12-04'], no: null, members: [], memos: 3, summary: { equip: '第3工場 成形機 #4〜#6 冷却水配管', work: '既設冷却水本管から分岐し、往き・還り 50A を増設（SUS 50A Sch10S 約90m）', period: '11/9〜12/4（停止は日曜のみ）', cond: '天井梁下 高さ4.2m、足場要', due: '9/25 提出', note: '架台10か所、フランジ接続、保温なし' }, files: ['打ち合わせメモ（9/14）.jpg', '冷却水系統図.pdf', '現地写真（9/18）.zip'],
    estimates: [{ no: 'M-2026-045', rate: 0, versions: [
      { v: 1, date: '2026-09-25', state: '提出済', lines: [
        L('配管工事', 'P-0102', 24), L('配管工事', 'P-0112', 16), L('配管工事', 'P-0121', 12), L('配管工事', 'P-0122', 12),
        L('支持・吊り', 'P-0132', 10), L('支持・吊り', 'P-0133', 40),
        L('配管工事', 'P-0201', 18, 1.20), L('配管工事', 'P-0203', 8, 1.20), WEL('配管工事', 92000),
        L('仮設・運搬', 'P-0401', 2), L('仮設・運搬', 'P-0404', 2), L('仮設・運搬', 'P-0405', 1)] },
      { v: 2, date: '2026-10-05', state: '作成中', lines: [
        L('配管工事', 'P-0102', 24), L('配管工事', 'P-0112', 16), L('配管工事', 'P-0121', 12), L('配管工事', 'P-0122', 12),
        L('支持・吊り', 'P-0132', 10), L('支持・吊り', 'P-0133', 40),
        L('配管工事', 'P-0201', 18, 1.20), L('配管工事', 'P-0203', 8, 1.20), WEL('配管工事', 92000),
        L('仮設・運搬', 'P-0401', 2), L('仮設・運搬', 'P-0404', 2), L('仮設・運搬', 'P-0405', 1)] },
    ] }] },
  { id: 'Y-2026-022', status: '受注', cust: 'C2', custName: '大浜ケミカル', title: '反応槽 搬入・据付工事', reqDate: '2026-08-20', staff: '杉本（営業）', estDue: '2026-09-05', expire: '2026-10-10', site: '大浜ケミカル 本社工場 第1プラント',
    foreman: 'E4', period: ['2026-10-19', '2026-10-30'], no: '2026-0118', members: ['E4', 'E3', 'X3', 'X4'], memos: 1, files: ['搬入計画書.pdf', '反応槽 外形図.pdf'], summary: null,
    estimates: [{ no: 'M-2026-038', rate: 0, versions: [
      { v: 1, date: '2026-09-10', state: '受注', lines: [
        L('搬入・据付', 'P-0202', 16, 1.25), L('搬入・据付', 'P-0204', 8, 1.25), L('搬入・据付', 'P-0402', 2), L('搬入・据付', 'P-0401', 1), WEL('搬入・据付', 62000),
        L('配管工事', 'P-0102', 6), L('配管工事', 'P-0121', 8), L('配管工事', 'P-0201', 4, 1.20)] }] }] },
  { id: 'Y-2026-015', status: '施工中', cust: 'C1', custName: '東駿精機工業', title: '本社工場 プレス機 入替工事', reqDate: '2026-06-22', staff: '長谷川（営業）', estDue: '2026-07-10', expire: '2026-08-20', site: '東駿精機 本社工場 プレス棟',
    foreman: 'E1', period: ['2026-08-24', '2026-10-23'], no: '2026-0112', members: ['E1', 'E2', 'E4', 'X1', 'X3', 'X4', 'X6'], memos: 4, files: ['据付図 rev.3.pdf', '工程表（9/25版）.xlsx', 'KY活動記録.pdf'], summary: null,
    pastLabor: { staffNinku: 52.5, staffCost: 1452000, extNinku: 31.0, extCost: 752000, note: '8/24〜9/6の承認済分（サンプルの集計値）' },
    branches: ['2026-0112-01'],
    estimates: [{ no: 'M-2026-027', rate: 0, versions: [
      { v: 1, date: '2026-07-08', state: '提出済', lines: [] },
      { v: 2, date: '2026-07-21', state: '受注', lines: [
        L('撤去・搬出', 'P-0202', 56, 1.25), L('撤去・搬出', 'P-0402', 3), L('撤去・搬出', 'P-0401', 2), L('撤去・搬出', 'P-0405', 3),
        L('搬入・据付', 'P-0202', 60, 1.25), L('搬入・据付', 'P-0204', 44, 1.25), L('搬入・据付', 'P-0402', 4), L('搬入・据付', 'P-0403', 12),
        L('配管工事', 'P-0101', 30), L('配管工事', 'P-0111', 40), L('配管工事', 'P-0115', 16), L('配管工事', 'P-0131', 60),
        L('配管工事', 'P-0201', 52, 1.20), L('配管工事', 'P-0203', 10, 1.20), WEL('搬入・据付', 560000)] }] },
    { no: 'M-2026-041', rate: 0, branchOf: '2026-0112', branchNo: '2026-0112-01', versions: [
      { v: 1, date: '2026-09-16', state: '受注', lines: [
        L('配管工事', 'P-0101', 12), L('配管工事', 'P-0111', 18), L('配管工事', 'P-0131', 20),
        L('配管工事', 'P-0201', 12, 1.20), L('配管工事', 'P-0141', 30), WEL('配管工事', 45000)] }] }] },
  { id: 'Y-2026-018', status: '施工中', cust: 'C3', custName: '清見製紙', title: '抄紙機 蒸気配管 改修工事', reqDate: '2026-07-10', staff: '杉本（営業）', estDue: '2026-08-05', expire: '2026-09-04', site: '清見製紙 本社工場 抄紙棟',
    foreman: 'E1', period: ['2026-09-07', '2026-10-30'], no: '2026-0115', members: ['E1', 'E2', 'E3', 'E5', 'X1', 'X2', 'X5'], memos: 2, files: ['蒸気系統図.pdf', '工程表（9/1版）.xlsx'], summary: null,
    estimates: [{ no: 'M-2026-032', rate: 0, versions: [
      { v: 1, date: '2026-08-05', state: '受注', lines: [
        L('配管工事', 'P-0102', 60), L('配管工事', 'P-0112', 48), L('配管工事', 'P-0121', 36), L('配管工事', 'P-0122', 36),
        L('支持・吊り', 'P-0132', 40), L('支持・吊り', 'P-0133', 120),
        L('保温工事', 'P-0141', 220),
        L('配管工事', 'P-0201', 120, 1.20), L('配管工事', 'P-0203', 46, 1.20), WEL('配管工事', 420000),
        L('仮設・運搬', 'P-0404', 4), L('仮設・運搬', 'P-0405', 2)] }] }] },
  { id: 'Y-2026-009', status: '完了', cust: 'C2', custName: '大浜ケミカル', title: '排水処理設備 配管更新工事', reqDate: '2026-05-12', staff: '杉本（営業）', estDue: '2026-06-01', expire: '2026-07-01', site: '大浜ケミカル 本社工場 排水処理棟',
    foreman: 'E4', period: ['2026-07-06', '2026-08-28'], no: '2026-0104', members: ['E4', 'E3', 'E5', 'X2', 'X5'], memos: 2, files: ['完成図.pdf', '試験成績書.pdf'], summary: null,
    pastLabor: { staffNinku: 80.0, staffCost: 2260000, extNinku: 52.0, extCost: 1212000, note: '7/6〜8/28の承認済分（サンプルの集計値）' },
    estimates: [{ no: 'M-2026-019', rate: 0, versions: [
      { v: 1, date: '2026-06-02', state: '受注', lines: [
        L('配管工事', 'P-0101', 80), L('配管工事', 'P-0111', 90), L('配管工事', 'P-0115', 30), L('配管工事', 'P-0131', 140),
        L('配管工事', 'P-0201', 110, 1.20), L('配管工事', 'P-0203', 30, 1.20), WEL('配管工事', 360000),
        L('仮設・運搬', 'P-0404', 3), L('仮設・運搬', 'P-0405', 4), L('仮設・運搬', 'P-0403', 10)] }] }] },
];

/* 原価実績（材料・外注・経費の手入力分） */
export const COSTS_INIT: Record<string, Cost[]> = {
  '2026-0112': [
    { date: '2026-08-26', group: '撤去・搬出', cat: '経費', vendor: '東海クレーン（架空）', memo: 'ラフター25t 撤去 3日・回送2回', amount: 294000 },
    { date: '2026-08-31', group: '撤去・搬出', cat: '経費', vendor: '駿河産廃センター（架空）', memo: '旧プレス機 解体材 処分', amount: 96000 },
    { date: '2026-09-04', group: '配管工事', cat: '材料費', vendor: '静岡配管資材（架空）', memo: 'SUS配管 25A・継手・Uボルト', amount: 318400, doc: '請求書_静岡配管資材_0904.pdf' },
    { date: '2026-09-14', group: '電気工事', cat: '外注費', vendor: '株式会社 駿東電設', vid: 'K3', memo: 'プレス機 電源切替・盤改造', amount: 420000, doc: '請求書_駿東電設_9月.pdf' },
    { date: '2026-09-16', group: '搬入・据付', cat: '経費', vendor: '東海クレーン（架空）', memo: 'ラフター25t 搬入 4日', amount: 272000 },
    { date: '2026-09-30', group: '搬入・据付', cat: '経費', vendor: '清水リース（架空）', memo: 'フォークリフト 3t 9月分', amount: 144000 },
    { date: '2026-10-02', group: '配管工事', cat: '材料費', vendor: '静岡配管資材（架空）', memo: '追加工事分 SUS配管・保温材', amount: 142600 },
  ],
  '2026-0115': [
    { date: '2026-09-08', group: '配管工事', cat: '材料費', vendor: '静岡配管資材（架空）', memo: 'SUS配管 50A・エルボ・フランジ 1回目', amount: 612000 },
    { date: '2026-09-25', group: '支持・吊り', cat: '材料費', vendor: '静岡配管資材（架空）', memo: '支持金物・吊りボルト', amount: 166000 },
    { date: '2026-09-30', group: '仮設・運搬', cat: '経費', vendor: '富岳運輸（架空）', memo: 'ユニック 運搬 2台', amount: 76000 },
    { date: '2026-09-30', group: '保温工事', cat: '外注費', vendor: '有限会社 山北設備', vid: 'K1', memo: '保温 請負（9月出来高）', amount: 180000, doc: '出来高請求書_山北設備_9月.pdf' },
    { date: '2026-10-05', group: '', cat: '材料費', vendor: '静岡配管資材（架空）', memo: '10月分 消耗品・雑材（複数の工種にまたがる）', amount: 38500, doc: '納品書_20261005.jpg' },
  ],
  '2026-0118': [],
  '2026-0104': [
    { date: '2026-07-07', group: '配管工事', cat: '材料費', vendor: '静岡配管資材（架空）', memo: 'SUS配管 25A・継手 一式', amount: 812000 },
    { date: '2026-07-20', group: '仮設・運搬', cat: '経費', vendor: '清水リース（架空）', memo: 'フォークリフト 3t', amount: 132000 },
    { date: '2026-08-10', group: '電気工事', cat: '外注費', vendor: '株式会社 駿東電設', vid: 'K3', memo: 'ポンプ電源 移設', amount: 180000 },
    { date: '2026-08-28', group: '仮設・運搬', cat: '経費', vendor: '駿河産廃センター（架空）', memo: '撤去配管 処分', amount: 128000 },
  ],
};

export function fmtDate(d: Date): string { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

/* 打刻の生成：9/7〜10/6（平日＋土曜2日）。区間＝[現場, 開始, 終了]、休憩＝[開始, 終了] */
export function genPunches(): Punch[] {
  const recs: Punch[] = []; let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const days: string[] = [];
  const d = new Date('2026-09-07T00:00:00');
  const end = new Date('2026-10-06T00:00:00');
  const holidays = ['2026-09-21', '2026-09-22', '2026-09-23'];
  const sats = ['2026-09-12', '2026-09-26'];
  while (d <= end) {
    const s = fmtDate(d), w = d.getDay();
    if (!holidays.includes(s) && ((w >= 1 && w <= 5) || sats.includes(s))) days.push(s);
    d.setDate(d.getDate() + 1);
  }
  const A = '2026-0112', B = '2026-0115', BR: [string, string][] = [['12:00', '13:00']];
  const ot = () => { const r = rnd(); return r < 0.6 ? '17:00' : r < 0.8 ? '18:00' : r < 0.95 ? '18:30' : '19:00'; };
  type SegT = [string, string, string];
  for (const day of days) {
    const sat = sats.includes(day);
    const add = (w: string, segs: SegT[], br: [string, string][] = BR) => recs.push({ id: '', date: day, worker: w, segs: segs.map(s => ({ site: s[0], start: s[1], end: s[2] })), breaks: br.map(b => ({ start: b[0], end: b[1] })), status: '承認', proxy: null });
    if (sat) { // 土曜は一部だけ
      add('E4', [[A, '08:00', '15:00']]); add('X3', [[A, '08:00', '15:00']]); add('E2', [[A, '08:00', '15:00']]);
      continue;
    }
    const r1 = rnd();
    // 佐藤（職長）：午前A→午後B、またはA終日
    if (r1 < 0.6) add('E1', [[A, '08:00', '11:00'], [B, '11:00', ot()]]); else add('E1', [[A, '08:00', ot()]]);
    // 鈴木：A中心、たまに午後B
    if (rnd() < 0.3) add('E2', [[A, '08:00', '13:00'], [B, '13:00', ot()]]); else add('E2', [[A, '08:00', ot()]]);
    // 高橋：B、たまに夕方社内作業（倉庫整理）
    if (rnd() < 0.3) add('E3', [[B, '08:00', '15:30'], [SITE_INTERNAL, '15:30', '17:00']]); else add('E3', [[B, '08:00', ot()]]);
    // 田中：A、残業多め
    add('E4', [[A, '08:00', rnd() < 0.5 ? '18:00' : '17:00']]);
    // 伊藤：朝に車両整備（社内）のあとB
    if (rnd() < 0.25) add('E5', [[SITE_INTERNAL, '08:00', '09:00'], [B, '09:00', '17:00']]); else add('E5', [[B, '08:00', ot()]]);
    // 協力会社・一人親方
    add('X1', [[rnd() < 0.5 ? A : B, '08:00', ot()]]);
    if (rnd() < 0.8) add('X2', [[B, '08:00', ot()]]);
    add('X3', [[A, '08:00', rnd() < 0.5 ? '18:00' : '17:00']]);
    if (rnd() < 0.6) add('X4', [[A, '08:00', '17:00']]);
    if (rnd() < 0.5) add('X5', [[B, '08:00', '17:00']]);
    if (rnd() < 0.35) add('X6', [[A, '08:00', '17:00']]);
  }
  // 外部は「確認」
  recs.forEach(r => { const w = WORKERS.find(x => x.id === r.worker); if (w && w.kind !== '社員') r.status = '確認'; });
  // 10/6（昨日）は未承認・警告を混ぜる
  recs.filter(r => r.date === '2026-10-06').forEach(r => {
    if (['E3', 'E4', 'X5', 'X2'].includes(r.worker)) r.status = '入力済';
    if (r.worker === 'E3') { r.segs = [{ site: B, start: '08:00', end: null }]; }               // 退勤の打ち忘れ
    if (r.worker === 'E4') { r.segs = [{ site: A, start: '07:30', end: '19:30' }]; }           // 長時間
  });
  if (!recs.find(r => r.date === '2026-10-06' && r.worker === 'X5')) recs.push({ id: '', date: '2026-10-06', worker: 'X5', segs: [{ site: B, start: '08:00', end: '17:00' }], breaks: [{ start: '12:00', end: '13:00' }], status: '入力済', proxy: null });
  // 吉田（一人親方）が割り当てていない現場（0118）に打刻
  const y = recs.find(r => r.date === '2026-10-06' && r.worker === 'X5'); if (y) y.segs = [{ site: '2026-0118', start: '08:00', end: '17:00' }];
  // 中村は代理入力（スマホなし）
  const n = recs.find(r => r.date === '2026-10-06' && r.worker === 'X2'); if (n) n.proxy = { by: 'E1', reason: '打ち忘れ' };
  // 10/7（今日）：鈴木・渡辺（スマホ）と田中・小林・加藤（共用端末）はデモで打刻するので空ける
  const today: [string, SegT[]][] = [
    ['E1', [[A, '08:00', '11:00'], [B, '11:00', '17:00']]], ['E3', [[B, '08:00', '17:00']]],
    ['E5', [[B, '08:00', '17:00']]], ['X2', [[B, '08:00', '17:00']]],
  ];
  today.forEach(([w, segs]) => recs.push({ id: '', date: TODAY, worker: w, segs: segs.map(s => ({ site: s[0], start: s[1], end: s[2] })), breaks: [{ start: '12:00', end: '13:00' }], status: '入力済', proxy: null }));
  recs.forEach((r, i) => r.id = 'R' + (i + 1));
  return recs;
}

/* 画面で使う固定の選択肢 */
export const DIVS = ['材料費', '労務費', '外注費', '経費'] as const;
export const CAT2DIV: Record<string, '材料費' | '労務費' | '外注費' | '経費'> = { '材料': '材料費', '労務': '労務費', '法定福利費': '経費', '経費': '経費' }; // 法定福利費→経費（10/6 橋本確認）
export const STAFFS = ['長谷川（営業）', '杉本（営業）', '佐藤 健一（施工管理）'];
export const PRE = ['与件', '見積中'];
export const NOGRP = '（工種なし）';
