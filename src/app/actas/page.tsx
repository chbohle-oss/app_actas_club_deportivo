'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import styles from './actas.module.css';

interface Acta {
  id: string;
  numero: number;
  anio: number;
  titulo: string;
  estado: string;
  version: number;
  creadoEn: string;
  creador: { id: string; nombre: string };
  _count: { acuerdos: number; comentarios: number; aprobaciones: number; asistencias: number };
}

export default function ActasPage() {
  const { token, isAdmin, isSecretario } = useAuth();
  const [actas, setActas] = useState<Acta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    estado: '',
    anio: '',
    q: '',
  });

  const fetchActas = useCallback(async () => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filters.estado) params.set('estado', filters.estado);
    if (filters.anio) params.set('anio', filters.anio);
    if (filters.q) params.set('q', filters.q);

    try {
      const res = await fetch(`/api/actas?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActas(data.data || []);
      }
    } catch (err) {
      console.error('Error loading actas:', err);
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => { fetchActas(); }, [fetchActas]);

  const getEstadoBadge = (estado: string) => {
    const map: Record<string, { class: string; label: string }> = {
      BORRADOR: { class: 'badge-borrador', label: 'Borrador' },
      EN_REVISION: { class: 'badge-revision', label: 'En revisión' },
      APROBADA: { class: 'badge-aprobada', label: 'Aprobada' },
      RECHAZADA: { class: 'badge-rechazada', label: 'Rechazada' },
    };
    return map[estado] || { class: '', label: estado };
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <div className="section-header">
          <div>
            <h1 className="section-title">📋 Actas</h1>
            <p className="section-subtitle">Registro de actas de reuniones del club</p>
          </div>
          {(isAdmin || isSecretario) && (
            <a href="/actas/nueva" className="btn btn-primary" id="btn-nueva-acta">
              + Nueva acta
            </a>
          )}
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Buscar por título o acuerdo..."
              value={filters.q}
              onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
              id="input-buscar"
            />
          </div>
          <div className="form-group">
            <select
              className="form-input"
              value={filters.estado}
              onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}
              id="select-estado"
            >
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="EN_REVISION">En revisión</option>
              <option value="APROBADA">Aprobada</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
          </div>
          <div className="form-group">
            <select
              className="form-input"
              value={filters.anio}
              onChange={e => setFilters(f => ({ ...f, anio: e.target.value }))}
              id="select-anio"
            >
              <option value="">Todos los años</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : actas.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span className="empty-state-icon">📋</span>
              <p className="empty-state-title">Sin actas</p>
              <p className="empty-state-text">
                {filters.q || filters.estado || filters.anio
                  ? 'No se encontraron actas con los filtros seleccionados.'
                  : 'Crea la primera acta del club para comenzar.'}
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.list}>
            {actas.map(acta => {
              const badge = getEstadoBadge(acta.estado);
              return (
                <a key={acta.id} href={`/actas/${acta.id}`} className={`card card-interactive ${styles.actaCard}`}>
                  <div className={styles.actaHeader}>
                    <div className={styles.actaNumero}>
                      Acta Nº {acta.numero}/{acta.anio}
                    </div>
                    <span className={`badge ${badge.class}`}>{badge.label}</span>
                  </div>
                  <h3 className={styles.actaTitle}>{acta.titulo}</h3>
                  <div className={styles.actaMeta}>
                    <span>✍️ {acta.creador.nombre}</span>
                    <span>📅 {new Date(acta.creadoEn).toLocaleDateString('es-CL')}</span>
                    <span>v{acta.version}</span>
                  </div>
                  <div className={styles.actaStats}>
                    <span title="Acuerdos">📌 {acta._count.acuerdos}</span>
                    <span title="Comentarios">💬 {acta._count.comentarios}</span>
                    <span title="Aprobaciones">✅ {acta._count.aprobaciones}</span>
                    <span title="Asistentes">👥 {acta._count.asistencias}</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
