/* 型定義（HTMLモック v0.1.5 のデータ構造をそのまま型にしたもの） */

export type Role = '管理者' | '経理' | '職長' | '社員職人' | '協力会社';

export type Koshu = { code: string; name: string; desc: string; stopped?: boolean };

export type Contact = { id?: string; name: string; dept: string; email: string; tel: string };

export type Customer = {
  id: string; name: string; short: string; zip: string; addr: string; tel: string;
  rate: number; note: string; contacts: Contact[]; stopped?: boolean;
};

export type ProductCat = '材料' | '労務' | '法定福利費' | '経費';
export type Product = {
  code: string; name: string; alias: string; spec: string; unit: string; cost: number;
  cat: ProductCat; kind: string; stopped?: boolean;
};

export type RateHist = { from: string; v: number };

export type PartnerType = '法人' | '個人（一人親方）';
export type Partner = {
  id: string; name: string; type: PartnerType; rate: number | null; close: string; pay: string; invoice: boolean;
  addr?: string; tel?: string; person?: string; invNo?: string; license?: string; contract?: string;
  rateHist?: RateHist[]; half?: number | null; ot?: string; fee?: string; safety?: number; other?: string;
  wht?: string; checker?: string; stopped?: boolean;
};

export type WorkerKind = '社員' | '協力会社' | '一人親方';
export type Flags = { punch: boolean; att: boolean; cost: boolean; ot: boolean };
export type FlagKey = keyof Flags;
export type Leave = { base: string; grant: number; used: number };
export type Worker = {
  id: string; name: string; kind: WorkerKind; org: string; job: string;
  rates?: RateHist[];
  kana?: string; empNo?: string; emp?: string; pay?: string; rule?: string; approver?: string; hired?: string; left?: string;
  means?: string; flags?: Flags; lv?: Leave; stopped?: boolean;
};

export type Vendor = {
  id: string; name: string; cat: string; invNo: string; tel: string; close: string; pay: string; note: string; stopped?: boolean;
};

export type WorkRule = {
  id: string; name: string; start: string; end: string; hours: number; brk: string; system: string;
  cal: string; ot: string; late: string; stopped?: boolean;
};

export type Company = {
  close: string; costClose: string; lockAfter: string; round: string; night: string;
  ninkuH: number; ninkuUnit: string; split: string;
  m45: number; y360: number; special: string; spY: number; spM: number; spAvg: number; alert1: number; alert2: number;
  lvBase: string; lvFirst: string; lv5: string;
  means: string; gps: string; proxy: string; approveBy: string;
  internal: string; payroll: string;
};
export type CompanyKey = keyof Company;

export type Holiday = { name: string; when: string; kind: '法定休日' | '所定休日' | string; cal: string };

/* 見積 */
export type EstLineType = 'item' | 'misc' | 'disc';
export type EstLine = {
  type: EstLineType; group: string; code?: string; qty: number; rate: number | null; cost?: number;
  name?: string; amount?: number;
};
export type EstState = '作成中' | '提出済' | '受注' | '失注';
export type EstSent = { at: string; method: 'mail' | 'manual'; to: string };
export type EstVersion = { v: number; date: string; state: EstState; lines: EstLine[]; sent?: EstSent; groups?: string[] };
export type Estimate = { no: string; versions: EstVersion[]; rate: number; branchOf?: string; branchNo?: string };

/* 案件（与件〜完了） */
export type ProjectStatus = '与件' | '見積中' | '失注' | '受注' | '施工中' | '完了' | '中止';
export type Summary = { equip?: string; work?: string; period?: string; cond?: string; due?: string; note?: string; ocr?: boolean };
export type LeadContact = { name: string; email: string; tel: string };
export type PastLabor = { staffNinku: number; staffCost: number; extNinku: number; extCost: number; note: string };
export type Div = '材料費' | '労務費' | '外注費' | '経費';
export type ContractRow = { no: string; label: string; amount: number };
export type BudgetRow = { div: Div; group: string; init: number; change: number; est?: number };

export type Project = {
  id: string; status: ProjectStatus; cust: string | null; custName?: string;
  contact?: LeadContact; contactId?: string | null;
  title: string; reqDate: string; staff: string; estDue: string | null; expire: string | null; site: string;
  foreman: string | null; period: [string, string] | null; no: string | null; members: string[];
  estimates: Estimate[]; memos: number; files: string[]; summary: Summary | null;
  lostReason?: string; pastLabor?: PastLabor; branches?: string[];
  contract?: ContractRow[]; budget?: BudgetRow[];
  ocrDone?: boolean; stopDate?: string; stopReason?: string;
};

/* 原価実績（材料・外注・経費の手入力分） */
export type Cost = {
  date: string; group: string; cat: Div; vendor: string; vid?: string; sid?: string; memo: string; amount: number; doc?: string;
};

/* 打刻 */
export type Seg = { site: string; start: string; end: string | null };
export type Brk = { start: string; end: string | null };
export type PunchStatus = '入力済' | '承認' | '確認' | '差戻し' | '中止';
export type Proxy = { by: string; reason: string };
export type FixRequest = { reason: string; at: string };
export type Punch = {
  id: string; date: string; worker: string; segs: Seg[]; breaks: Brk[]; status: PunchStatus; proxy: Proxy | null;
  src?: string; brk?: string; fix?: FixRequest;
};

/* ログインするユーザー（役割は画面設計§6。作業員と紐づく人は workerId を持つ） */
export type User = { id: string; name: string; loginId: string; role: Role; workerId: string | null; stopped?: boolean };

export type Schedule = { ver: number; date: string; name: string };
export type BudgetLog = { date: string; who: string; reason: string; amount: number };
export type BudState = { state: '下書き' | '確定'; at?: string; by?: string };
export type PayAdj = { contract: number; deduct: number };

/* アプリ全体の状態（将来DBに置き換える部分） */
export type AppState = {
  customers: Customer[];
  projects: Project[];
  costs: Record<string, Cost[]>;
  punches: Punch[];
  nextSeq: number;
  schedules: Record<string, Schedule[]>;
  blog: Record<string, BudgetLog[]>;
  koshu: Koshu[];
  company: Company;
  holidays: Holiday[];
  budState: Record<string, BudState>;
  payAdj: Record<string, PayAdj>;
  products: Product[];
  workers: Worker[];
  partners: Partner[];
  vendors: Vendor[];
  workRules: WorkRule[];
  users: User[];
};

export type MasterName = '品目' | '工種' | '得意先' | '作業員' | '協力会社' | '取引先' | '就業ルール' | '会社設定';
