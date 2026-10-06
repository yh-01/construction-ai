'use client';
/* 打刻の共通部品（M-02 / T-01） */
import React from 'react';

/** 打刻の状態チップ（モックの stateChip） */
export function StateChip({ s }: { s: string }) {
  return <span className={`pstate ${s === '作業中' ? 'on' : s === '退勤済' ? 'done' : ''}`}>{s}</span>;
}
