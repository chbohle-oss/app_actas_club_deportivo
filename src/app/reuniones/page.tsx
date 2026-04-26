'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import styles from './reuniones.module.css';

interface Reunion {
  id: string;
  titulo: string;
  fechaHora: string;
  lugar: string;
  tipo: string;
  estado: string;
  agenda?: string;
  creador: { id: string; nombre: string };
  convocados: Array<{
    usuario: { id: string; nombre: string };
    rsvpEstado: string;
  }>;
  _count: { actas: number };
}

export default function ReunionesPage() {
  const { token, isAdmin, isSecretario } = useAuth();
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReuniones = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/reuniones', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReuniones(data.data || []);
      }
    } catch (err) {
      console.error('Error loading meetings:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchReuniones(); }, [fetchReuniones]);

  const getEstadoBadge = (estado: string) => {
    const map: Record<string, { class: string; label: string }> = {
      PROGRAMADA: { class: 'badge-pendiente', label: 'Programada' },
      EN_CURSO: { class: 'badge-en-curso', label: 'En curso' },
      FINALIZADA: { class: 'badge-hecho', label: 'Finalizada' },
      CANCELADA: { class: 'badge-rechazada', label: 'Cancelada' },
    };
    return map[estado] || { class: '', label: estado };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <div className="section-header">
          <div>
            <h1 className="section-title">📅 Reuniones</h1>
            <p className="section-subtitle">Gestión de reuniones del club</p>
          </div>
          {(isAdmin || isSecretario) && (
            <a href="/reuniones/nueva" className="btn btn-primary" id="btn-nueva-reunion">
              + Nueva reunión
            </a>
          )}
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : reuniones.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span className="empty-state-icon">📅</span>
              <p className="empty-state-title">Sin reuniones</p>
              <p className="empty-state-text">Crea la primera reunión del club para comenzar.</p>
            </div>
          </div>
        ) : (
          <div className={styles.list}>
            {reuniones.map(r => {
              const badge = getEstadoBadge(r.estado);
              return (
                <a key={r.id} href={`/reuniones/${r.id}`} className={`card card-interactive ${styles.reunionCard}`}>
                  <div className={styles.reunionHeader}>
                    <h3 className={styles.reunionTitle}>{r.titulo}</h3>
                    <span className={`badge ${badge.class}`}>{badge.label}</span>
                  </div>
                  <div className={styles.reunionMeta}>
                    <span>📆 {formatDate(r.fechaHora)}</span>
                    <span>📍 {r.lugar}</span>
                    <span>👥 {r.convocados.length} convocados</span>
                    {r._count.actas > 0 && <span>📋 {r._count.actas} acta(s)</span>}
                  </div>
                  {r.convocados.length > 0 && (
                    <div className={styles.rsvpSummary}>
                      <span className={styles.rsvpItem} style={{ color: 'var(--color-success)' }}>
                        ✓ {r.convocados.filter(c => c.rsvpEstado === 'ACEPTO').length}
                      </span>
                      <span className={styles.rsvpItem} style={{ color: 'var(--color-danger)' }}>
                        ✗ {r.convocados.filter(c => c.rsvpEstado === 'RECHAZO').length}
                      </span>
                      <span className={styles.rsvpItem} style={{ color: 'var(--color-warning)' }}>
                        ? {r.convocados.filter(c => c.rsvpEstado === 'PENDIENTE' || c.rsvpEstado === 'TAL_VEZ').length}
                      </span>
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
