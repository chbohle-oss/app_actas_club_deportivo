import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from '@/lib/audit';

// GET /api/actas/[id]/comentarios — list comments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const comentarios = await prisma.comentario.findMany({
    where: { actaId: params.id, parentId: null },
    include: {
      autor: { select: { id: true, nombre: true, avatarUrl: true } },
      respuestas: {
        include: {
          autor: { select: { id: true, nombre: true, avatarUrl: true } },
        },
        orderBy: { creadoEn: 'asc' },
      },
    },
    orderBy: { creadoEn: 'desc' },
  });

  return NextResponse.json(comentarios);
}

// POST /api/actas/[id]/comentarios — add comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { texto, seccion, parentId } = body;

    if (!texto || !texto.trim()) {
      return NextResponse.json(
        { error: 'El texto del comentario es requerido.' },
        { status: 400 }
      );
    }

    const comentario = await prisma.comentario.create({
      data: {
        actaId: params.id,
        texto: texto.trim(),
        seccion: seccion || 'general',
        autorId: user!.sub,
        parentId: parentId || null,
      },
      include: {
        autor: { select: { id: true, nombre: true, avatarUrl: true } },
      },
    });

    await registrarAuditoria({
      entidad: 'Comentario',
      entidadId: comentario.id,
      accion: 'CREAR',
      usuarioId: user!.sub,
      datos: { actaId: params.id, seccion },
    });

    // TODO: Notify secretary and mentioned users

    return NextResponse.json(comentario, { status: 201 });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json(
      { error: 'Error al agregar comentario.' },
      { status: 500 }
    );
  }
}
