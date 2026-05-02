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

/**
 * Formatea un RUT chileno agregando puntos y guión.
 */
export function formatearRut(rut: string): string {
  if (!rut) return '';
  
  const cleanRut = rut.replace(/[^0-9Kk]/g, '').toUpperCase();
  if (cleanRut.length <= 1) return cleanRut;

  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);

  let formatBody = '';
  for (let i = body.length - 1, j = 1; i >= 0; i--, j++) {
    formatBody = body.charAt(i) + formatBody;
    if (j % 3 === 0 && i !== 0) {
      formatBody = '.' + formatBody;
    }
  }

  return `${formatBody}-${dv}`;
}

/**
 * Valida si un RUT chileno es correcto (Módulo 11).
 */
export function validarRut(rut: string): boolean {
  if (!rut) return false;
  
  const cleanRut = rut.replace(/[^0-9Kk]/g, '').toUpperCase();
  if (cleanRut.length < 2) return false;

  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);

  let rutBody = parseInt(body, 10);
  let s = 1;
  let m = 0;

  for (; rutBody; rutBody = Math.floor(rutBody / 10)) {
    s = (s + rutBody % 10 * (9 - m++ % 6)) % 11;
  }

  const dvEsperado = s ? (s - 1).toString() : 'K';
  return dv === dvEsperado;
}
