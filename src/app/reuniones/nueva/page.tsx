'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';

interface Miembro {
  id: string;
  usuario: {
    id: string;
    nombre: string;
    rol: string;
  };
}

export default function NuevaReunionPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [convocadosIds, setConvocadosIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    titulo: '',
    fechaHora: '',
    lugar: '',
    tipo: 'ordinaria',
    agenda: '',
  });

  useEffect(() => {
    async function fetchMiembros() {
      if (!token) return;
      try {
        const res = await fetch('/api/miembros', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMiembros(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching miembros:', err);
      }
    }
    fetchMiembros();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleToggleMember = (userId: string) => {
    setConvocadosIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleToggleAll = () => {
    if (convocadosIds.length === miembros.length) {
      setConvocadosIds([]);
    } else {
      setConvocadosIds(miembros.map(m => m.usuario.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reuniones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          convocadosIds
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al crear la reunión.');
        setLoading(false);
        return;
      }

      const reunion = await res.json();
      router.push(`/reuniones/${reunion.id}`);
    } catch {
      setError('Error de conexión.');
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="section-header">
          <div>
            <h1 className="section-title">📅 Nueva Reunión</h1>
            <p className="section-subtitle">Programa una nueva reunión del club</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)', alignItems: 'start' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div className="form-group">
              <label className="form-label">Título de la reunión <span className="required">*</span></label>
              <input
                type="text" name="titulo" className="form-input" required
                value={form.titulo} onChange={handleChange}
                placeholder="Ej: Reunión de Directiva - Abril 2026"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Fecha y hora <span className="required">*</span></label>
                <input
                  type="datetime-local" name="fechaHora" className="form-input" required
                  value={form.fechaHora} onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select name="tipo" className="form-input" value={form.tipo} onChange={handleChange}>
                  <option value="ordinaria">Ordinaria</option>
                  <option value="extraordinaria">Extraordinaria</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Lugar <span className="required">*</span></label>
              <input
                type="text" name="lugar" className="form-input" required
                value={form.lugar} onChange={handleChange}
                placeholder="Ej: Sede del club / Zoom"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Agenda / Orden del día</label>
              <textarea
                name="agenda" className="form-input"
                value={form.agenda} onChange={handleChange}
                placeholder="1. Aprobación acta anterior&#10;2. Informe tesorería..."
                rows={5}
              />
            </div>

            {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : '📅 Crear reunión'}
              </button>
            </div>
          </div>

          <div className="card" style={{ maxHeight: '600px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '600' }}>Citados ({convocadosIds.length})</h3>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm" 
                onClick={handleToggleAll}
                style={{ color: 'var(--color-primary)', padding: '0', fontSize: 'var(--text-xs)' }}
              >
                {convocadosIds.length === miembros.length && miembros.length > 0 ? 'Desmarcar todos' : 'Seleccionar todos'}
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', margin: '0 -var(--space-2)', padding: '0 var(--space-2)' }}>
              {miembros.map(m => (
                <label 
                  key={m.id} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2)', 
                    borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    background: convocadosIds.includes(m.usuario.id) ? 'var(--bg-input)' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={convocadosIds.includes(m.usuario.id)}
                    onChange={() => handleToggleMember(m.usuario.id)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: '500' }}>{m.usuario.nombre}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{m.usuario.rol}</span>
                  </div>
                </label>
              ))}
              {miembros.length === 0 && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-4)' }}>
                  No se encontraron miembros.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
