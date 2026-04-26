'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let result;
    if (isRegister) {
      result = await register(form);
    } else {
      result = await login(form.email, form.password);
    }

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Error desconocido.');
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.bgOrbs}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
      </div>

      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🏀</span>
          <h1 className={styles.title}>ActasClub</h1>
          <p className={styles.subtitle}>Gestión de Actas • Basket</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${!isRegister ? styles.tabActive : ''}`}
              onClick={() => { setIsRegister(false); setError(''); }}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              className={`${styles.tab} ${isRegister ? styles.tabActive : ''}`}
              onClick={() => { setIsRegister(true); setError(''); }}
            >
              Registrarse
            </button>
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Nombre completo <span className="required">*</span></label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className="form-input"
                placeholder="Juan Pérez"
                required
                id="input-nombre"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Correo electrónico <span className="required">*</span></label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="form-input"
              placeholder="tu@email.com"
              required
              id="input-email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña <span className="required">*</span></label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
              id="input-password"
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Teléfono (WhatsApp)</label>
              <input
                type="tel"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                className="form-input"
                placeholder="+56 9 1234 5678"
                id="input-telefono"
              />
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={`btn btn-primary btn-lg ${styles.submitBtn}`}
            disabled={loading}
            id="btn-submit"
          >
            {loading ? (
              <span className="spinner" />
            ) : isRegister ? (
              'Crear cuenta'
            ) : (
              'Ingresar'
            )}
          </button>
        </form>

        <p className={styles.footer}>
          Gestión segura de actas para tu club de baloncesto
        </p>
      </div>
    </div>
  );
}
