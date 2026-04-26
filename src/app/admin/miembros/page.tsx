'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';

interface Miembro {
  id: string;
  estado: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    telefono: string | null;
    rol: string;
  };
}

export default function MiembrosPage() {
  const { token } = useAuth();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMiembros = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/miembros', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMiembros(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchMiembros(); }, [fetchMiembros]);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 'var(--max-content-width)' }}>
        <div className="section-header">
          <div>
            <h1 className="section-title">👥 Miembros del Club</h1>
            <p className="section-subtitle">Gestión de usuarios y directiva</p>
          </div>
          <button className="btn btn-primary" disabled>
            + Invitar Miembro
          </button>
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: 'var(--space-4)', fontWeight: '600', fontSize: 'var(--text-sm)' }}>Nombre</th>
                    <th style={{ padding: 'var(--space-4)', fontWeight: '600', fontSize: 'var(--text-sm)' }}>Contacto</th>
                    <th style={{ padding: 'var(--space-4)', fontWeight: '600', fontSize: 'var(--text-sm)' }}>Rol</th>
                    <th style={{ padding: 'var(--space-4)', fontWeight: '600', fontSize: 'var(--text-sm)' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {miembros.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <div style={{ 
                            width: '32px', height: '32px', borderRadius: '50%', 
                            background: 'var(--color-primary)', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' 
                          }}>
                            {m.usuario.nombre.charAt(0)}
                          </div>
                          <span style={{ fontWeight: '500' }}>{m.usuario.nombre}</span>
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 'var(--text-sm)' }}>✉️ {m.usuario.email}</span>
                          {m.usuario.telefono && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>📱 {m.usuario.telefono}</span>}
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-4)' }}>
                        <span className={`badge ${m.usuario.rol === 'ADMIN' ? 'badge-rechazada' : m.usuario.rol === 'SECRETARIO' ? 'badge-revision' : 'badge-borrador'}`}>
                          {m.usuario.rol}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-4)' }}>
                        <span style={{ color: m.estado === 'ACTIVO' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {m.estado === 'ACTIVO' ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
