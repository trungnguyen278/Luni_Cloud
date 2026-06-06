'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ADMIN_SECTIONS, USER_SECTIONS } from '@/components/shell/nav';
import { luniToast } from '@/components/base/ui';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UserDashboard } from '@/components/user/UserDashboard';

export default function SectionPage({ params }: { params: { section: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const section = params.section;
  const role: 'user' | 'admin' = user?.role === 'admin' ? 'admin' : 'user';
  const allowed = role === 'admin' ? ADMIN_SECTIONS : USER_SECTIONS;
  const ok = allowed.includes(section);

  useEffect(() => {
    if (user && !ok) {
      luniToast(role === 'user' ? 'Tài khoản không có quyền quản trị' : 'Trang không khả dụng', 'amber', 'alert');
      router.replace('/console/overview');
    }
  }, [user, ok, role, router]);

  if (!user || !ok) return null;
  if (role === 'user') return <UserDashboard section={section} />;
  return <AdminDashboard section={section} />;
}
