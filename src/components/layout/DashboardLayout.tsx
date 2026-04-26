'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  useSyncQueue(); // Initialize background sync

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.wrapper}>
      {!isOnline && (
        <div className="offline-banner">
          ⚡ Modo sin conexión — Los cambios se sincronizarán automáticamente
        </div>
      )}
      <Sidebar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
