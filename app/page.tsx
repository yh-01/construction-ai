'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/* トップは与件一覧（S-12）へ */
export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace('/leads/'); }, [router]);
  return null;
}
