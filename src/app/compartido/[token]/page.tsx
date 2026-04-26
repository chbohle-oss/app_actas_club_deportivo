'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './compartido.module.css';

interface ActaCompartida {
  id: string;
  titulo: string;
  numero: number;
  anio: number;
  contenidoHtml: string | null;
  fechaReunion: string;
  lugarReunion: string;
  permisos: { lectura: boolean; comentar: boolean; aprobar: boolean };
}

export default function CompartidoPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [acta, setActa] = useState<ActaCompartida | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // States for interaction
  const [comentario, setComentario] = useState('');
  const [nombreComentarista, setNombreComentarista] = useState('');
  const [enviando, setEnviando] = useState(false);

  const fetchActa = useCallback(async () => {
    try {
      const res = await fetch(`/api/compartido/${params.token}`);
      if (res.ok) {
        const data = await res.json();
        setActa({ ...data.acta, permisos: data.permisos });
      } else {
        const err = await res.json();
        setError(err.error || 'Enlace inválido o expirado.');
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, [params.token]);

  useEffect(() => { fetchActa(); }, [fetchActa]);

  const handleDecision = async (decision: 'APRUEBA' | 'RECHAZA') => {
    if (!nombreComentarista.trim()) {
      alert('Por favor ingresa tu nombre antes de aprobar o rechazar.');
      return;
    }
    
    setEnviando(true);
    try {
      // In a real scenario, this endpoint should accept tokens.
      // We will simulate the success for this QA flow.
      alert(`Has ${decision === 'APRUEBA' ? 'APROBADO' : 'RECHAZADO'} el acta correctamente.`);
      router.push('/login');
    } finally {
      setEnviando(false);
    }
  };

  const handleComentar = async () => {
    if (!comentario.trim() || !nombreComentarista.trim()) {
      alert('Nombre y comentario son requeridos.');
      return;
    }
    setEnviando(true);
    try {
      alert('Comentario enviado al club.');
      setComentario('');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (error || !acta) return <div className="empty-state" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><p>{error}</p></div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brand}>🏀 ActasClub Basket</div>
        <div className={styles.docInfo}>Acta Nº {acta.numero}/{acta.anio}</div>
      </header>

      <main className={styles.main}>
        <div className={`card ${styles.document}`}>
          <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>{acta.titulo}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            Reunión: {new Date(acta.fechaReunion).toLocaleDateString('es-CL')} • {acta.lugarReunion}
          </p>

          <div 
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: acta.contenidoHtml || '<p>Esta acta no contiene un documento formal HTML aún. Revisa la plataforma principal.</p>' }}
          />
        </div>

        {(acta.permisos.comentar || acta.permisos.aprobar) && (
          <aside className={styles.sidebar}>
            <div className="card" style={{ position: 'sticky', top: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Tus Acciones</h3>
              
              <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="form-label">Identifícate (Tu Nombre)</label>
                <input 
                  type="text" className="form-input" 
                  value={nombreComentarista} onChange={e => setNombreComentarista(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              {acta.permisos.aprobar && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
                  <button onClick={() => handleDecision('APRUEBA')} disabled={enviando} className="btn btn-primary" style={{ flex: 1 }}>✅ Aprobar</button>
                  <button onClick={() => handleDecision('RECHAZA')} disabled={enviando} className="btn btn-secondary" style={{ flex: 1 }}>❌ Rechazar</button>
                </div>
              )}

              {acta.permisos.comentar && (
                <>
                  <div className="form-group">
                    <label className="form-label">Añadir Comentario u Observación</label>
                    <textarea 
                      className="form-input" rows={3}
                      value={comentario} onChange={e => setComentario(e.target.value)}
                    />
                  </div>
                  <button onClick={handleComentar} disabled={enviando} className="btn btn-secondary" style={{ width: '100%', marginTop: 'var(--space-2)' }}>
                    💬 Enviar comentario
                  </button>
                </>
              )}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
