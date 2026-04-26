'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';

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
    usuario: { id: string; nombre: string; telefono?: string };
    rsvpEstado: string;
  }>;
}

export default function ReunionDetailPage({ params }: { params: { id: string } }) {
  const { token, user, isAdmin, isSecretario } = useAuth();
  const router = useRouter();
  const [reunion, setReunion] = useState<Reunion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingCitations, setSendingCitations] = useState(false);

  const fetchReunion = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/reuniones/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReunion(data);
      } else {
        setError('Reunión no encontrada.');
      }
    } catch (err) {
      setError('Error al cargar la reunión.');
    } finally {
      setLoading(false);
    }
  }, [token, params.id]);

  useEffect(() => { fetchReunion(); }, [fetchReunion]);

  const openWhatsAppGroup = () => {
    let baseUrl = window.location.origin;
    if (baseUrl.includes('localhost')) {
      baseUrl = baseUrl.replace('localhost', '127.0.0.1');
    }
    const urlConf = `${baseUrl}/reuniones/${reunion?.id}`;
    
    let msg = `🏀 *CONVOCATORIA - ActasClub Basket*\n\n`;
    msg += `📋 *${reunion?.titulo}*\n`;
    msg += `📅 Fecha: ${new Date(reunion!.fechaHora).toLocaleDateString('es-CL')}\n`;
    msg += `🕐 Hora: ${new Date(reunion!.fechaHora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}\n`;
    msg += `📍 Lugar: ${reunion?.lugar}\n`;
    if (reunion?.agenda) msg += `\n📌 *Agenda:*\n${reunion.agenda}\n`;
    msg += `\n👉 Confirma tu asistencia aquí:\n${urlConf}\n`;
    msg += `\n_Responde: ✅ Acepto / ❌ No puedo / 🤔 Tal vez_`;

    const encodedMsg = encodeURIComponent(msg);
    // By omitting the 'phone' parameter, WhatsApp Web asks to select a contact or group!
    window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, '_blank');
  };

  const handleRsvp = async (estado: string) => {
    try {
      const res = await fetch(`/api/reuniones/${params.id}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rsvpEstado: estado })
      });
      if (res.ok) {
        fetchReunion(); // recargar
      }
    } catch (err) {
      console.error('Error RSVP:', err);
    }
  };

  if (loading) return <DashboardLayout><div className="loading-overlay"><div className="spinner" /></div></DashboardLayout>;
  if (error || !reunion) return <DashboardLayout><div className="empty-state"><p>{error}</p></div></DashboardLayout>;

  const date = new Date(reunion.fechaHora).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const myRsvp = reunion.convocados.find(c => c.usuario.id === user?.id)?.rsvpEstado;

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <button onClick={() => router.push('/reuniones')} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-2)' }}>
              ← Volver
            </button>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold' }}>{reunion.titulo}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Creada por {reunion.creador.nombre}</p>
          </div>
          {(isAdmin || isSecretario) && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button 
                onClick={openWhatsAppGroup} 
                className="btn btn-primary"
              >
                📱 Compartir en Grupo (Gratis)
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Información General</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Fecha y Hora</p>
              <p style={{ fontWeight: '500' }}>{date}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Lugar</p>
              <p style={{ fontWeight: '500' }}>{reunion.lugar}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Tipo</p>
              <p style={{ fontWeight: '500', textTransform: 'capitalize' }}>{reunion.tipo}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Estado</p>
              <span className="badge badge-en-curso">{reunion.estado}</span>
            </div>
          </div>

          {reunion.agenda && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>Agenda / Orden del día</p>
              <div style={{ background: 'var(--bg-input)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap' }}>
                {reunion.agenda}
              </div>
            </div>
          )}
        </div>

        {myRsvp && (
          <div className="card" style={{ background: 'var(--color-primary-glow)', borderColor: 'var(--color-primary)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>¿Asistirás a esta reunión?</h2>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button 
                className={`btn ${myRsvp === 'ACEPTO' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleRsvp('ACEPTO')}
              >
                ✅ Sí, asistiré
              </button>
              <button 
                className={`btn ${myRsvp === 'RECHAZO' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleRsvp('RECHAZO')}
              >
                ❌ No podré
              </button>
              <button 
                className={`btn ${myRsvp === 'TAL_VEZ' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleRsvp('TAL_VEZ')}
              >
                🤔 Tal vez
              </button>
            </div>
          </div>
        )}

        <div className="card">
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>
            Convocados ({reunion.convocados.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {reunion.convocados.map(c => (
              <div key={c.usuario.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: '500' }}>
                  {c.usuario.nombre}
                </span>
                <span style={{ 
                  color: c.rsvpEstado === 'ACEPTO' ? 'var(--color-success)' : 
                         c.rsvpEstado === 'RECHAZO' ? 'var(--color-danger)' : 
                         'var(--color-warning)' 
                }}>
                  {c.rsvpEstado}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
