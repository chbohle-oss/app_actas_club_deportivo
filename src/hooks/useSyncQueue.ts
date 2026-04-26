'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useOnlineStatus } from './useOnlineStatus';
import { getPendingOperations, markOperationSynced, markOperationConflict, clearSyncedOperations } from '@/db/dexie';

export function useSyncQueue() {
  const { token } = useAuth();
  const isOnline = useOnlineStatus();
  const syncingRef = useRef(false);

  const syncPending = useCallback(async () => {
    if (!token || syncingRef.current) return;
    syncingRef.current = true;

    try {
      const pending = await getPendingOperations();
      if (pending.length === 0) {
        syncingRef.current = false;
        return;
      }

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          operaciones: pending.map(op => ({
            idLocal: op.idLocal,
            tipo: op.tipo,
            payload: op.payload,
          })),
        }),
      });

      if (!res.ok) {
        console.error('Sync failed with status:', res.status);
        syncingRef.current = false;
        return;
      }

      const data = await res.json();

      // Update local operation statuses
      for (const resultado of data.resultados) {
        const localOp = pending.find(p => p.idLocal === resultado.idLocal);
        if (!localOp?.id) continue;

        if (resultado.estado === 'sincronizado') {
          await markOperationSynced(localOp.id);
        } else if (resultado.estado === 'conflicto') {
          await markOperationConflict(localOp.id, resultado.error || 'Conflicto');
        }
      }

      // Clean up synced operations
      await clearSyncedOperations();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      syncingRef.current = false;
    }
  }, [token]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && token) {
      syncPending();
    }
  }, [isOnline, token, syncPending]);

  // Periodic sync every 30 seconds when online
  useEffect(() => {
    if (!isOnline || !token) return;

    const interval = setInterval(syncPending, 30000);
    return () => clearInterval(interval);
  }, [isOnline, token, syncPending]);

  return { syncPending, isOnline };
}
