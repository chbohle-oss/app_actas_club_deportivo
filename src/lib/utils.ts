import { NextRequest } from 'next/server';

/**
 * Obtiene la URL base de la aplicación de forma centralizada.
 * Prioriza variables de entorno y luego el contexto de la petición actual.
 */
export function getAppBaseUrl(request?: NextRequest): string {
  // 1. Prioridad: Variables de entorno explícitas
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;

  // 2. Si hay una petición, derivar de los headers
  if (request) {
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    if (host) {
      return `${protocol}://${host}`;
    }
  }

  // 3. Fallback final (servidor local por defecto)
  return 'http://localhost:3000';
}
