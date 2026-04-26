'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';

export default function NuevaReunionPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    titulo: '',
    fechaHora: '',
    lugar: '',
    tipo: 'ordinaria',
    agenda: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
        body: JSON.stringify(form),
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
      <div style={{ maxWidth: '640px' }}>
        <div className="section-header">
          <div>
            <h1 className="section-title">📅 Nueva Reunión</h1>
            <p className="section-subtitle">Programa una nueva reunión del club</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="form-group">
            <label className="form-label">Título de la reunión <span className="required">*</span></label>
            <input
              type="text" name="titulo" className="form-input" required
              value={form.titulo} onChange={handleChange}
              placeholder="Ej: Reunión de Directiva - Abril 2026"
              id="input-titulo"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Fecha y hora <span className="required">*</span></label>
              <input
                type="datetime-local" name="fechaHora" className="form-input" required
                value={form.fechaHora} onChange={handleChange}
                id="input-fecha"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select name="tipo" className="form-input" value={form.tipo} onChange={handleChange} id="select-tipo">
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
              id="input-lugar"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Agenda / Orden del día</label>
            <textarea
              name="agenda" className="form-input"
              value={form.agenda} onChange={handleChange}
              placeholder="1. Aprobación acta anterior&#10;2. Informe tesorería&#10;3. Planificación torneo&#10;4. Varios"
              rows={5}
              id="input-agenda"
            />
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="btn-crear-reunion">
              {loading ? <span className="spinner" /> : '📅 Crear reunión'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
