import { NextRequest } from 'next/server';

/**
 * Valida un RUT chileno (con puntos y guion, o solo números y guion/DV).
 */
export function validarRut(rut: string): boolean {
  if (!rut || typeof rut !== 'string') return false;
  
  // Limpiar puntos y guion
  const limpio = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (limpio.length < 8) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  if (!/^\d+$/.test(cuerpo)) return false;

  // Calcular DV
  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const dvEsperado = 11 - (suma % 11);
  let dvCalc = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();

  return dv === dvCalc;
}

/**
 * Formatea un RUT a formato X.XXX.XXX-X
 */
export function formatearRut(rut: string): string {
  const limpio = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  let resultado = '';
  for (let i = cuerpo.length - 1, j = 1; i >= 0; i--, j++) {
    resultado = cuerpo[i] + resultado;
    if (j % 3 === 0 && i !== 0) resultado = '.' + resultado;
  }

  return `${resultado}-${dv}`;
}

/**
 * Obtiene la URL base de la aplicación de forma centralizada.
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
