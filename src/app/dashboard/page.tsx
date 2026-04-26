'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { user, isAdmin, isSecretario, token } = useAuth();
  const router = useRouter();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const stats = [
    { label: 'Actas del mes', value: data?.stats?.actasDelMes ?? '—', icon: '📋', color: 'var(--color-primary)' },
    { label: 'En revisión', value: data?.stats?.actasEnRevision ?? '—', icon: '⏳', color: 'var(--color-warning)' },
    { label: 'Aprobadas', value: data?.stats?.actasAprobadas ?? '—', icon: '✅', color: 'var(--color-success)' },
    { label: 'Reuniones programadas', value: data?.stats?.reunionesProgramadas ?? '—', icon: '📅', color: 'var(--color-secondary)' },
  ];

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <div className={styles.welcome}>
          <h1 className={styles.welcomeTitle}>
            ¡Hola, <span className={styles.highlight}>{user?.nombre?.split(' ')[0]}</span>! 👋
          </h1>
          <p className={styles.welcomeText}>
            Bienvenido a ActasClub Basket. Aquí tienes un resumen de la actividad del club.
          </p>
        </div>

        <div className={styles.statsGrid}>
          {stats.map((stat, i) => (
            <div key={i} className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: `${stat.color}15` }}>
                <span>{stat.icon}</span>
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.grid}>
          {/* Actas Recientes */}
          <section className={`card ${styles.section}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>📋 Actas recientes</h2>
              <button onClick={() => router.push('/actas')} className="btn btn-ghost btn-sm">Ver todas →</button>
            </div>
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> : 
             (!data?.actasRecientes?.length ? (
              <div className="empty-state">
                <span className="empty-state-icon">📝</span>
                <p className="empty-state-title">Sin actas aún</p>
                <p className="empty-state-text">Crea una reunión y luego genera el acta correspondiente.</p>
                {(isAdmin || isSecretario) && (
                  <button onClick={() => router.push('/reuniones/nueva')} className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
                    + Nueva reunión
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {data.actasRecientes.map((acta: any) => (
                  <div key={acta.id} onClick={() => router.push(`/actas/${acta.id}`)} style={{ padding: 'var(--space-3)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{acta.titulo}</strong>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>Nº {acta.numero}/{acta.anio} • {new Date(acta.fechaReunion).toLocaleDateString('es-CL')}</div>
                    </div>
                    <span className={`badge badge-${acta.estado.toLowerCase().replace('_', '-')}`}>{acta.estado}</span>
                  </div>
                ))}
              </div>
            ))}
          </section>

          {/* Próximas Reuniones */}
          <section className={`card ${styles.section}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>📅 Próximas reuniones</h2>
              <button onClick={() => router.push('/reuniones')} className="btn btn-ghost btn-sm">Ver todas →</button>
            </div>
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> : 
             (!data?.proximasReuniones?.length ? (
              <div className="empty-state">
                <span className="empty-state-icon">🗓️</span>
                <p className="empty-state-title">Sin reuniones programadas</p>
                <p className="empty-state-text">Las próximas reuniones del club aparecerán aquí.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {data.proximasReuniones.map((reu: any) => (
                  <div key={reu.id} onClick={() => router.push(`/reuniones/${reu.id}`)} style={{ padding: 'var(--space-3)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                    <strong>{reu.titulo}</strong>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      📅 {new Date(reu.fechaHora).toLocaleDateString('es-CL')} 🕐 {new Date(reu.fechaHora).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>

          {/* Acuerdos Pendientes */}
          <section className={`card ${styles.section}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>⚡ Acuerdos pendientes</h2>
            </div>
            {loading ? <div className="loading-overlay"><div className="spinner" /></div> : 
             (!data?.acuerdosPendientes?.length ? (
              <div className="empty-state">
                <span className="empty-state-icon">✨</span>
                <p className="empty-state-title">Todo al día</p>
                <p className="empty-state-text">No hay acuerdos pendientes asignados a ti.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {data.acuerdosPendientes.map((ac: any) => (
                  <div key={ac.id} style={{ padding: 'var(--space-3)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-warning)' }}>
                    <strong>{ac.titulo}</strong>
                    {ac.fechaCompromiso && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>Para: {new Date(ac.fechaCompromiso).toLocaleDateString('es-CL')}</div>}
                  </div>
                ))}
              </div>
            ))}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
