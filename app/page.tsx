'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { homeOf } from '@/components/shell';

/* トップ：ログイン状態に応じて最初の画面へ */
export default function Home() {
  const router = useRouter();
  const { hydrated, user } = useStore();
  useEffect(() => { if (!hydrated) return; router.replace(user ? homeOf(user.role) : '/login/'); }, [hydrated, user, router]);
  return null;
}
