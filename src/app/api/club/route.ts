import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  if (!user!.clubId) {
    return NextResponse.json({ error: 'Usuario no asociado a un club.' }, { status: 400 });
  }

  try {
    const club = await prisma.club.findUnique({
      where: { id: user!.clubId }
    });

    return NextResponse.json({ data: club });
  } catch (error) {
    console.error('GET club error:', error);
    return NextResponse.json({ error: 'Error al obtener datos del club' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const roleError = requireRole(user!, ['ADMIN']);
  if (roleError) return roleError;

  if (!user!.clubId) {
    return NextResponse.json({ error: 'No se encontró club asociado.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { nombre, descripcion, configuracion } = body;

    const updatedClub = await prisma.club.update({
      where: { id: user!.clubId },
      data: {
        nombre,
        descripcion,
        configuracion: configuracion || undefined
      }
    });

    await registrarAuditoria({
      entidad: 'Club',
      entidadId: user!.clubId,
      accion: 'ACTUALIZAR_CONFIGURACION',
      usuarioId: user!.id,
      datos: { nombre, descripcion, configuracion }
    });

    return NextResponse.json({ data: updatedClub });
  } catch (error) {
    console.error('PATCH club error:', error);
    return NextResponse.json({ error: 'Error al actualizar el club' }, { status: 500 });
  }
}
