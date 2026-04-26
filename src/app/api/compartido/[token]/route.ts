import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/compartido/[token] — public acta view
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const link = await prisma.linkCompartido.findUnique({
      where: { token: params.token },
      include: {
        acta: {
          include: {
            club: { select: { nombre: true, logoUrl: true } },
            creador: { select: { nombre: true } },
            asistencias: {
              include: { usuario: { select: { nombre: true } } },
            },
            acuerdos: {
              include: { responsable: { select: { nombre: true } } },
              orderBy: { orden: 'asc' },
            },
            comentarios: {
              where: { parentId: null },
              include: {
                autor: { select: { nombre: true } },
                respuestas: {
                  include: { autor: { select: { nombre: true } } },
                },
              },
              orderBy: { creadoEn: 'desc' },
            },
            aprobaciones: {
              include: { usuario: { select: { nombre: true } } },
            },
          },
        },
      },
    });

    if (!link || !link.activo) {
      return NextResponse.json(
        { error: 'Enlace no válido o desactivado.' },
        { status: 404 }
      );
    }

    // Check expiration
    if (link.expiracion && new Date() > link.expiracion) {
      return NextResponse.json(
        { error: 'Este enlace ha expirado.' },
        { status: 410 }
      );
    }

    const permisos = link.permisos as Record<string, boolean>;

    return NextResponse.json({
      acta: link.acta,
      permisos: {
        lectura: permisos.lectura ?? true,
        comentar: permisos.comentar ?? false,
        aprobar: permisos.aprobar ?? false,
      },
    });
  } catch (error) {
    console.error('Public link error:', error);
    return NextResponse.json(
      { error: 'Error al acceder al acta.' },
      { status: 500 }
    );
  }
}
