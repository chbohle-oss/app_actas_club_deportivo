'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import styles from './Sidebar.module.css';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠' },
  { href: '/reuniones', label: 'Reuniones', icon: '📅' },
  { href: '/actas', label: 'Actas', icon: '📋' },
  { href: '/admin/miembros', label: 'Miembros', icon: '👥', roles: ['ADMIN', 'SECRETARIO'] },
  { href: '/admin/configuracion', label: 'Configuración', icon: '⚙️', roles: ['ADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin, isSecretario } = useAuth();
  const isOnline = useOnlineStatus();

  const visibleItems = navItems.filter(item => {
    if (!item.roles) return true;
    if (isAdmin) return true;
    if (isSecretario && item.roles.includes('SECRETARIO')) return true;
    return false;
  });

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.brandIcon}>🏀</span>
          <div>
            <h2 className={styles.brandTitle}>ActasClub</h2>
            <span className={styles.brandSub}>Basket</span>
          </div>
        </Link>
      </div>

      <nav className={styles.nav}>
        {visibleItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href || pathname?.startsWith(item.href + '/') ? styles.navItemActive : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.status}>
          <span className={`${styles.statusDot} ${isOnline ? styles.online : styles.offline}`} />
          <span className={styles.statusText}>{isOnline ? 'En línea' : 'Sin conexión'}</span>
        </div>

        {user && (
          <div className={styles.userSection}>
            <div className={styles.userAvatar}>
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.nombre}</span>
              <span className={styles.userRole}>{user.rol}</span>
            </div>
            <button onClick={logout} className={styles.logoutBtn} title="Cerrar sesión" id="btn-logout">
              🚪
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
