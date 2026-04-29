'use client';

import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { addOfflineOperation, db } from '@/db/dexie';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from 'react';
import styles from './nueva-acta.module.css';

interface Acuerdo {
  id: string;
  titulo: string;
  descripcion: string;
  responsableId: string;
  fechaCompromiso: string;
  estado: string;
}

export default function NuevaActaPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    titulo: '',
    fechaReunion: '',
    lugarReunion: '',
    tipoReunion: 'ordinaria',
    proximaReunion: '',
  });

  const [temas, setTemas] = useState('');
  const [acuerdos, setAcuerdos] = useState<Acuerdo[]>([]);
  const [miembros, setMiembros] = useState<any[]>([]);
  const [reuniones, setReuniones] = useState<any[]>([]);
  const [reunionId, setReunionId] = useState('');
  const [asistencias, setAsistencias] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mRes, rRes] = await Promise.all([
          fetch('/api/miembros', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/reuniones?estado=PROGRAMADA', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (mRes.ok) {
          const mData = await mRes.json();
          setMiembros(mData.miembros || []);
          const initial: Record<string, boolean> = {};
          (mData.miembros || []).forEach((m: any) => {
            initial[m.usuarioId] = false;
          });
          setAsistencias(initial);
        }

        if (rRes.ok) {
          const rData = await rRes.json();
          setReuniones(rData.data || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    if (token) fetchData();
  }, [token]);

  const handleSelectReunion = (id: string) => {
    setReunionId(id);
    if (!id) return;

    const r = reuniones.find(x => x.id === id);
    if (r) {
      setForm(prev => ({
        ...prev,
        titulo: `Acta: ${r.titulo}`,
        fechaReunion: r.fechaHora ? new Date(r.fechaHora).toISOString().slice(0, 16) : '',
        lugarReunion: r.lugar || '',
        tipoReunion: r.tipo || 'ordinaria'
      }));

      // Marcar como presentes a los convocados
      if (r.convocados) {
        const prefill: Record<string, boolean> = { ...asistencias };
        r.convocados.forEach((c: any) => {
          prefill[c.usuarioId] = true;
        });
        setAsistencias(prefill);
      }
    }
  };

  const toggleAsistencia = (usuarioId: string) => {
    setAsistencias(prev => ({ ...prev, [usuarioId]: !prev[usuarioId] }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addAcuerdo = () => {
    setAcuerdos(prev => [...prev, {
      id: uuidv4(),
      titulo: '',
      descripcion: '',
      responsableId: '',
      fechaCompromiso: '',
      estado: 'PENDIENTE',
    }]);
  };

  const updateAcuerdo = (id: string, field: string, value: string) => {
    setAcuerdos(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const removeAcuerdo = (id: string) => {
    setAcuerdos(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!form.titulo) {
      setError('El título es requerido.');
      setLoading(false);
      return;
    }

    const payload = {
      ...form,
      reunionId,
      contenido: { temas: temas.split('\n').filter(Boolean) },
      acuerdos: acuerdos.filter(a => a.titulo),
      asistencias: Object.entries(asistencias).map(([usuarioId, presente]) => ({
        usuarioId,
        presente
      })),
    };

    if (isOnline) {
      try {
        const res = await fetch('/api/actas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Error al crear el acta.');
          setLoading(false);
          return;
        }

        const acta = await res.json();

        // Save acuerdos separately if any
        if (acuerdos.length > 0) {
          await fetch(`/api/actas/${acta.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ acuerdos: acuerdos.filter(a => a.titulo) }),
          });
        }

        router.push(`/actas/${acta.id}`);
      } catch {
        setError('Error de conexión.');
      }
    } else {
      // Save offline
      const localId = uuidv4();
      await db.actas.put({
        id: localId,
        clubId: user?.clubId || '',
        titulo: form.titulo,
        version: 1,
        estado: 'BORRADOR',
        contenido: { temas: temas.split('\n').filter(Boolean) },
        fechaReunion: form.fechaReunion,
        lugarReunion: form.lugarReunion,
        tipoReunion: form.tipoReunion,
        creadoPor: user?.id || '',
        sincronizado: false,
        actualizadoEn: new Date().toISOString(),
      });

      await addOfflineOperation('CREAR_ACTA', localId, payload);
      router.push('/actas');
    }

    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <div className="section-header">
          <div>
            <h1 className="section-title">📋 Nueva Acta</h1>
            <p className="section-subtitle">
              Crea un borrador de acta de reunión
              {!isOnline && <span className={styles.offlineTag}> (modo offline)</span>}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Meeting Selection */}
          <section className="card">
            <h2 className={styles.sectionTitle}>📅 Vincular con Reunión</h2>
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Seleccionar reunión programada (opcional)</label>
              <select 
                className="form-input" 
                value={reunionId} 
                onChange={e => handleSelectReunion(e.target.value)}
                id="select-reunion"
              >
                <option value="">-- No vincular o crear libre --</option>
                {reuniones.map(r => (
                  <option key={r.id} value={r.id}>
                    {new Date(r.fechaHora).toLocaleDateString()} - {r.titulo}
                  </option>
                ))}
              </select>
              <span className="form-helper">Al elegir una reunión, se completarán los datos automáticamente.</span>
            </div>
          </section>

          {/* Basic info */}
          <section className="card">
            <h2 className={styles.sectionTitle}>📝 Información general</h2>
            
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Título del acta <span className="required">*</span></label>
              <input
                type="text" name="titulo" className="form-input" required
                value={form.titulo} onChange={handleChange}
                placeholder="Ej: Acta de reunión de Directiva - Abril 2026"
                id="input-titulo-acta"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Fecha de la reunión</label>
                <input
                  type="datetime-local" name="fechaReunion" className="form-input"
                  value={form.fechaReunion} onChange={handleChange}
                  id="input-fecha-acta"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select name="tipoReunion" className="form-input" value={form.tipoReunion} onChange={handleChange}>
                  <option value="ordinaria">Ordinaria</option>
                  <option value="extraordinaria">Extraordinaria</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Lugar</label>
              <input
                type="text" name="lugarReunion" className="form-input"
                value={form.lugarReunion} onChange={handleChange}
                placeholder="Sede del club, Zoom, etc."
              />
            </div>
          </section>

          {/* Topics */}
          <section className="card">
            <h2 className={styles.sectionTitle}>📌 Temas tratados</h2>
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <textarea
                className="form-input"
                value={temas} onChange={e => setTemas(e.target.value)}
                placeholder="Un tema por línea:&#10;1. Aprobación del acta anterior&#10;2. Informe de tesorería&#10;3. Planificación del torneo de verano"
                rows={6}
                id="input-temas"
              />
              <span className="form-helper">Ingrese un tema por línea</span>
            </div>
          </section>

          {/* Attendance */}
          <section className="card">
            <h2 className={styles.sectionTitle}>👥 Asistencia</h2>
            <p className="form-helper" style={{ marginBottom: 'var(--space-3)' }}>Marque los socios que estuvieron presentes en la reunión.</p>
            <div className={styles.miembrosGrid}>
              {miembros.map((m) => (
                <div 
                  key={m.id} 
                  className={`${styles.miembroItem} ${asistencias[m.usuarioId] ? styles.presente : ''}`}
                  onClick={() => toggleAsistencia(m.usuarioId)}
                >
                  <div className={styles.checkbox}>
                    {asistencias[m.usuarioId] ? '✅' : '⬜'}
                  </div>
                  <div className={styles.miembroInfo}>
                    <span className={styles.miembroNombre}>{m.usuario.nombre}</span>
                    <span className={styles.miembroRol}>{m.rolClub}</span>
                  </div>
                </div>
              ))}
              {miembros.length === 0 && <p className="form-helper">Cargando socios...</p>}
            </div>
          </section>

          {/* Agreements */}
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className={styles.sectionTitle}>🤝 Acuerdos</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addAcuerdo} id="btn-agregar-acuerdo">
                + Agregar acuerdo
              </button>
            </div>

            {acuerdos.length === 0 && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-4)' }}>
                Aún no hay acuerdos. Haga clic en &ldquo;+ Agregar acuerdo&rdquo; para añadir uno.
              </p>
            )}

            <div className={styles.acuerdosList}>
              {acuerdos.map((acuerdo, index) => (
                <div key={acuerdo.id} className={styles.acuerdoCard}>
                  <div className={styles.acuerdoHeader}>
                    <span className={styles.acuerdoNum}>Acuerdo #{index + 1}</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeAcuerdo(acuerdo.id)} style={{ color: 'var(--color-danger)' }}>
                      ✕
                    </button>
                  </div>
                  <div className="form-group">
                    <input
                      type="text" className="form-input"
                      value={acuerdo.titulo}
                      onChange={e => updateAcuerdo(acuerdo.id, 'titulo', e.target.value)}
                      placeholder="Título del acuerdo"
                    />
                  </div>
                  <div className="form-group">
                    <textarea
                      className="form-input"
                      value={acuerdo.descripcion}
                      onChange={e => updateAcuerdo(acuerdo.id, 'descripcion', e.target.value)}
                      placeholder="Descripción (opcional)"
                      rows={2}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                    <div className="form-group">
                      <label className="form-label">Fecha compromiso</label>
                      <input
                        type="date" className="form-input"
                        value={acuerdo.fechaCompromiso}
                        onChange={e => updateAcuerdo(acuerdo.id, 'fechaCompromiso', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estado</label>
                      <select
                        className="form-input"
                        value={acuerdo.estado}
                        onChange={e => updateAcuerdo(acuerdo.id, 'estado', e.target.value)}
                      >
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_CURSO">En curso</option>
                        <option value="HECHO">Hecho</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Next meeting */}
          <section className="card">
            <h2 className={styles.sectionTitle}>📆 Próxima reunión</h2>
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <input
                type="text" name="proximaReunion" className="form-input"
                value={form.proximaReunion} onChange={handleChange}
                placeholder="Ej: Viernes 15 de mayo, 18:00 hrs - Sede del club"
              />
            </div>
          </section>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} id="btn-guardar-acta">
              {loading ? <span className="spinner" /> : '💾 Guardar borrador'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
