'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import styles from './configuracion.module.css';

interface ClubConfig {
  umbralAprobacion: string;
  plantillaActa: string;
  notificacionesEmail: boolean;
  notificacionesWhatsApp: boolean;
}

interface ClubData {
  id: string;
  nombre: string;
  descripcion: string;
  configuracion: ClubConfig;
}

export default function ConfiguracionPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [club, setClub] = useState<ClubData | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      if (!token) return;
      try {
        const res = await fetch('/api/club', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const { data } = await res.json();
          setClub(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !club) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/club', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(club),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '¡Configuración guardada con éxito!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Error al guardar los cambios.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="loading-overlay"><div className="spinner" /></div>
    </DashboardLayout>
  );

  if (!club) return (
    <DashboardLayout>
      <div className="card">No se pudieron cargar los datos del club.</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className="section-header">
          <div>
            <h1 className="section-title">⚙️ Configuración del Club</h1>
            <p className="section-subtitle">Ajustes generales y personalización del sistema</p>
          </div>
        </div>

        <form onSubmit={handleSave} className={styles.grid}>
          <div className={styles.mainCol}>
            <div className="card">
              <h3 className={styles.settingTitle} style={{ marginBottom: 'var(--space-4)' }}>Información General</h3>
              <div className="form-group">
                <label className="form-label">Nombre del Club</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={club.nombre}
                  onChange={e => setClub({...club, nombre: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                <label className="form-label">Descripción</label>
                <textarea 
                  className="form-input" 
                  rows={4}
                  value={club.descripcion || ''}
                  onChange={e => setClub({...club, descripcion: e.target.value})}
                  placeholder="Una breve descripción sobre el club..."
                />
              </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-6)' }}>
              <h3 className={styles.settingTitle} style={{ marginBottom: 'var(--space-4)' }}>Reglas de Negocio</h3>
              
              <div className={styles.settingGroup}>
                <div className={styles.settingHeader}>
                  <label className={styles.settingTitle}>Umbral de Aprobación</label>
                  <select 
                    className="form-input" 
                    style={{ width: '220px' }}
                    value={club.configuracion.umbralAprobacion}
                    onChange={e => setClub({
                      ...club, 
                      configuracion: {...club.configuracion, umbralAprobacion: e.target.value}
                    })}
                  >
                    <option value="mayoria_simple">Mayoría Simple (50% + 1)</option>
                    <option value="dos_tercios">Dos Tercios (66.6%)</option>
                    <option value="unanimidad">Unanimidad (100%)</option>
                  </select>
                </div>
                <p className={styles.settingDescription}>
                  Determina el porcentaje de aprobación necesario para que un acta pase de "En Revisión" a "Aprobada".
                </p>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingHeader}>
                  <label className={styles.settingTitle}>Plantilla de Actas</label>
                  <select 
                    className="form-input" 
                    style={{ width: '220px' }}
                    value={club.configuracion.plantillaActa}
                    onChange={e => setClub({
                      ...club, 
                      configuracion: {...club.configuracion, plantillaActa: e.target.value}
                    })}
                  >
                    <option value="standard">Estándar Basket</option>
                    <option value="minimal">Minimalista</option>
                    <option value="formal">Oficial / Legal</option>
                  </select>
                </div>
                <p className={styles.settingDescription}>
                  El diseño visual y estructura que se aplicará al generar el documento PDF final.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.sideCol}>
            <div className="card">
              <h3 className={styles.settingTitle} style={{ marginBottom: 'var(--space-4)' }}>Notificaciones</h3>
              
              <div className={styles.settingGroup}>
                <div className={styles.settingHeader}>
                  <span className={styles.settingTitle}>✉️ Email</span>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={club.configuracion.notificacionesEmail}
                      onChange={e => setClub({
                        ...club, 
                        configuracion: {...club.configuracion, notificacionesEmail: e.target.checked}
                      })}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                <p className={styles.settingDescription}>Notificar por correo electrónico sobre nuevas actas pendientes.</p>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingHeader}>
                  <span className={styles.settingTitle}>📱 WhatsApp</span>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={club.configuracion.notificacionesWhatsApp}
                      onChange={e => setClub({
                        ...club, 
                        configuracion: {...club.configuracion, notificacionesWhatsApp: e.target.checked}
                      })}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                <p className={styles.settingDescription}>Enviar alertas directamente al WhatsApp de los socios.</p>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-6)' }}>
              {message && (
                <div className={`badge ${message.type === 'success' ? 'badge-aprobada' : 'badge-rechazada'}`} style={{ width: '100%', marginBottom: 'var(--space-4)', textAlign: 'center', padding: 'var(--space-3)' }}>
                  {message.text}
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 'var(--space-4)', fontWeight: 'bold' }} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
