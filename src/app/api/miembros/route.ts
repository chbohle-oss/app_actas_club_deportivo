import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/miembros — List club members
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const roleError = requireRole(user!, ['ADMIN', 'SECRETARIO']);
  if (roleError) return roleError;

  try {
    const miembros = await prisma.miembroClub.findMany({
      where: { clubId: user!.clubId },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true, telefono: true, rol: true },
        },
      },
      orderBy: { usuario: { nombre: 'asc' } },
    });

    return NextResponse.json({ data: miembros });
  } catch (error) {
    console.error('Fetch miembros error:', error);
    return NextResponse.json({ error: 'Error al obtener miembros' }, { status: 500 });
  }
}
