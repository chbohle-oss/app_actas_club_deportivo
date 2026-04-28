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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ nombre: '', email: '', rolClub: 'MIEMBRO' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMiembro, setEditingMiembro] = useState<Miembro | null>(null);
  const [editData, setEditData] = useState({ nombre: '', email: '', telefono: '', rolClub: '', estado: '' });

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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/miembros', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(inviteData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: '¡Invitación enviada con éxito!' });
        setInviteData({ nombre: '', email: '', rolClub: 'MIEMBRO' });
        setTimeout(() => setShowInviteModal(false), 2000);
        fetchMiembros();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al enviar invitación.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (m: Miembro) => {
    setEditingMiembro(m);
    setEditData({
      nombre: m.usuario.nombre,
      email: m.usuario.email,
      telefono: m.usuario.telefono || '',
      rolClub: m.usuario.rol,
      estado: m.estado
    });
    setMessage(null);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingMiembro) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/miembros/${editingMiembro.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(editData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Miembro actualizado correctamente.' });
        setTimeout(() => {
          setShowEditModal(false);
          fetchMiembros();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al actualizar miembro.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 'var(--max-content-width)' }}>
        <div className="section-header">
          <div>
            <h1 className="section-title">👥 Miembros del Club</h1>
            <p className="section-subtitle">Gestión de usuarios y directiva</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
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
                    <th style={{ padding: 'var(--space-4)', fontWeight: '600', fontSize: 'var(--text-sm)', textAlign: 'right' }}>Acciones</th>
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
                      <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => openEditModal(m)}
                          title="Editar miembro"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de Invitación */}
        {showInviteModal && (
          <div className="modal-overlay">
            <div className="modal-content card" style={{ maxWidth: '500px', width: '90%' }}>
              <div className="modal-header">
                <h2 className="section-title">📩 Invitar nuevo miembro</h2>
                <button className="btn-icon" onClick={() => setShowInviteModal(false)}>✕</button>
              </div>
              <form onSubmit={handleInvite} className="form-group">
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="form-label">Nombre completo</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={inviteData.nombre}
                    onChange={e => setInviteData({...inviteData, nombre: e.target.value})}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="form-label">Correo electrónico</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    required 
                    value={inviteData.email}
                    onChange={e => setInviteData({...inviteData, email: e.target.value})}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="form-label">Rol en el Club</label>
                  <select 
                    className="form-input" 
                    value={inviteData.rolClub}
                    onChange={e => setInviteData({...inviteData, rolClub: e.target.value})}
                  >
                    <option value="MIEMBRO">Miembro</option>
                    <option value="SECRETARIO">Secretario</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                {message && (
                  <div className={`badge ${message.type === 'success' ? 'badge-aprobada' : 'badge-rechazada'}`} style={{ width: '100%', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                    {message.text}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Enviando...' : 'Enviar Invitación'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Edición */}
        {showEditModal && (
          <div className="modal-overlay">
            <div className="modal-content card" style={{ maxWidth: '500px', width: '90%' }}>
              <div className="modal-header">
                <h2 className="section-title">✏️ Editar miembro</h2>
                <button className="btn-icon" onClick={() => setShowEditModal(false)}>✕</button>
              </div>
              <form onSubmit={handleUpdate} className="form-group">
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="form-label">Nombre completo</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={editData.nombre}
                    onChange={e => setEditData({...editData, nombre: e.target.value})}
                  />
                </div>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="form-label">Correo electrónico</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    required 
                    value={editData.email}
                    onChange={e => setEditData({...editData, email: e.target.value})}
                  />
                </div>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="form-label">Teléfono</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editData.telefono}
                    onChange={e => setEditData({...editData, telefono: e.target.value})}
                    placeholder="+56 9 ..."
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <label className="form-label">Rol</label>
                    <select 
                      className="form-input" 
                      value={editData.rolClub}
                      onChange={e => setEditData({...editData, rolClub: e.target.value})}
                    >
                      <option value="MIEMBRO">Miembro</option>
                      <option value="SECRETARIO">Secretario</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Estado</label>
                    <select 
                      className="form-input" 
                      value={editData.estado}
                      onChange={e => setEditData({...editData, estado: e.target.value})}
                    >
                      <option value="ACTIVO">Activo</option>
                      <option value="INACTIVO">Inactivo</option>
                    </select>
                  </div>
                </div>

                {message && (
                  <div className={`badge ${message.type === 'success' ? 'badge-aprobada' : 'badge-rechazada'}`} style={{ width: '100%', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                    {message.text}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: var(--bg-card);
          padding: var(--space-6);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-6);
        }
        .btn-icon {
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          font-size: 1.5rem;
          cursor: pointer;
        }
      `}</style>
    </DashboardLayout>
  );
}
