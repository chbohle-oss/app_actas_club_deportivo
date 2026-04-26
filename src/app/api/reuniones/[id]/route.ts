import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from '@/lib/audit';

// GET /api/reuniones/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const reunion = await prisma.reunion.findUnique({
    where: { id: params.id },
    include: {
      creador: { select: { id: true, nombre: true, email: true } },
      convocados: {
        include: {
          usuario: { select: { id: true, nombre: true, email: true, telefono: true } },
        },
      },
      actas: {
        select: { id: true, numero: true, anio: true, estado: true },
      },
    },
  });

  if (!reunion) {
    return NextResponse.json({ error: 'Reunión no encontrada.' }, { status: 404 });
  }

  return NextResponse.json(reunion);
}

// PUT /api/reuniones/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const roleError = requireRole(user!, ['ADMIN', 'SECRETARIO']);
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const { titulo, fechaHora, lugar, tipo, agenda, estado } = body;

    const reunion = await prisma.reunion.update({
      where: { id: params.id },
      data: {
        ...(titulo && { titulo }),
        ...(fechaHora && { fechaHora: new Date(fechaHora) }),
        ...(lugar && { lugar }),
        ...(tipo && { tipo }),
        ...(agenda !== undefined && { agenda }),
        ...(estado && { estado }),
      },
    });

    await registrarAuditoria({
      entidad: 'Reunion',
      entidadId: reunion.id,
      accion: 'EDITAR',
      usuarioId: user!.sub,
      datos: body,
    });

    return NextResponse.json(reunion);
  } catch (error) {
    console.error('Update meeting error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la reunión.' },
      { status: 500 }
    );
  }
}

// DELETE /api/reuniones/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const roleError = requireRole(user!, ['ADMIN']);
  if (roleError) return roleError;

  try {
    await prisma.reunion.delete({ where: { id: params.id } });

    await registrarAuditoria({
      entidad: 'Reunion',
      entidadId: params.id,
      accion: 'ELIMINAR',
      usuarioId: user!.sub,
    });

    return NextResponse.json({ message: 'Reunión eliminada.' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la reunión.' },
      { status: 500 }
    );
  }
}
