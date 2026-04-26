import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, createToken, createRefreshToken, TokenPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, email, password, telefono } = body;

    if (!nombre || !email || !password) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña son requeridos.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    // Check existing user
    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese email.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.usuario.create({
      data: {
        nombre,
        email,
        telefono: telefono || null,
        passwordHash,
        rol: 'MIEMBRO',
      },
    });

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    };

    const accessToken = await createToken(tokenPayload);
    const refreshToken = await createRefreshToken({ sub: user.id });

    await registrarAuditoria({
      entidad: 'Usuario',
      entidadId: user.id,
      accion: 'REGISTRO',
      usuarioId: user.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        rol: user.rol,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
