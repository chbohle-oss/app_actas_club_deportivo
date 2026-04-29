'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { saveUserLocally, getLocalUser, clearLocalUser } from '@/db/dexie';

interface User {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: string;
  clubId?: string;
  rolClub?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isSecretario: boolean;
}

interface RegisterData {
  nombre: string;
  email: string;
  rut: string;
  password: string;
  telefono?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from IndexedDB on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const localUser = await getLocalUser();
        if (localUser) {
          setUser({
            id: localUser.id,
            nombre: localUser.nombre,
            email: localUser.email,
            telefono: localUser.telefono,
            rol: localUser.rol,
            clubId: localUser.clubId,
            rolClub: localUser.rolClub,
          });
          setToken(localUser.token);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Error al iniciar sesión.' };
      }

      setUser(data.user);
      setToken(data.accessToken);

      await saveUserLocally({
        ...data.user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
      });

      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión. Verifique su red.' };
    }
  }, []);

  const register = useCallback(async (regData: RegisterData) => {
    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Error al registrarse.' };
      }

      setUser(data.user);
      setToken(data.accessToken);

      await saveUserLocally({
        ...data.user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
      });

      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión.' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearLocalUser();
  }, []);

  const isAdmin = user?.rol === 'ADMIN' || user?.rolClub === 'ADMIN';
  const isSecretario = user?.rol === 'SECRETARIO' || user?.rolClub === 'SECRETARIO';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin, isSecretario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
