import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos.' },
        { status: 400 }
      );
    }

    const result = await loginUser(email, password);

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    await registrarAuditoria({
      entidad: 'Usuario',
      entidadId: result.user.id,
      accion: 'LOGIN',
      usuarioId: result.user.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
