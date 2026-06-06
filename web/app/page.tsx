'use client';

import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/landing/LandingPage';
import { ToastHost } from '@/components/base/ui';

export default function Page() {
  const router = useRouter();
  return (
    <>
      <LandingPage onLogin={() => router.push('/login')} />
      <ToastHost />
    </>
  );
}
