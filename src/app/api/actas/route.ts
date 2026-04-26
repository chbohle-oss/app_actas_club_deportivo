import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/actas — list actas with filters
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const clubId = searchParams.get('clubId') || user!.clubId;
  const estado = searchParams.get('estado');
  const anio = searchParams.get('anio');
  const busqueda = searchParams.get('q');
  const responsableId = searchParams.get('responsable');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!clubId) {
    return NextResponse.json({ error: 'ClubId requerido.' }, { status: 400 });
  }

  const where: Record<string, unknown> = { clubId };

  // Role-based visibility
  if (user!.rol === 'MIEMBRO') {
    where.OR = [
      { estado: 'APROBADA' },
      { asistencias: { some: { usuarioId: user!.sub } } },
    ];
  }

  if (estado) where.estado = estado;
  if (anio) where.anio = parseInt(anio);
  if (busqueda) {
    where.OR = [
      { titulo: { contains: busqueda, mode: 'insensitive' } },
      { acuerdos: { some: { titulo: { contains: busqueda, mode: 'insensitive' } } } },
    ];
  }
  if (responsableId) {
    where.acuerdos = { some: { responsableId } };
  }

  const [actas, total] = await Promise.all([
    prisma.acta.findMany({
      where,
      include: {
        creador: { select: { id: true, nombre: true } },
        _count: {
          select: { acuerdos: true, comentarios: true, aprobaciones: true, asistencias: true },
        },
      },
      orderBy: [{ anio: 'desc' }, { numero: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.acta.count({ where }),
  ]);

  return NextResponse.json({
    data: actas,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/actas — create draft acta
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const roleError = requireRole(user!, ['ADMIN', 'SECRETARIO']);
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const { clubId: bodyClubId, reunionId, titulo, contenido, fechaReunion, lugarReunion, tipoReunion } = body;

    const targetClubId = bodyClubId || user!.clubId;
    if (!targetClubId) {
      return NextResponse.json({ error: 'ClubId requerido.' }, { status: 400 });
    }

    if (!titulo) {
      return NextResponse.json({ error: 'Título requerido.' }, { status: 400 });
    }

    // Get next acta number for the current year
    const currentYear = new Date().getFullYear();
    const lastActa = await prisma.acta.findFirst({
      where: { clubId: targetClubId, anio: currentYear },
      orderBy: { numero: 'desc' },
    });
    const nextNumber = (lastActa?.numero || 0) + 1;

    const acta = await prisma.acta.create({
      data: {
        clubId: targetClubId,
        reunionId: reunionId || null,
        numero: nextNumber,
        anio: currentYear,
        titulo,
        contenido: contenido || null,
        fechaReunion: fechaReunion ? new Date(fechaReunion) : null,
        lugarReunion: lugarReunion || null,
        tipoReunion: tipoReunion || null,
        creadoPor: user!.sub,
      },
      include: {
        creador: { select: { id: true, nombre: true } },
      },
    });

    await registrarAuditoria({
      entidad: 'Acta',
      entidadId: acta.id,
      accion: 'CREAR',
      usuarioId: user!.sub,
      datos: { numero: nextNumber, anio: currentYear, titulo },
    });

    return NextResponse.json(acta, { status: 201 });
  } catch (error) {
    console.error('Create acta error:', error);
    return NextResponse.json(
      { error: 'Error al crear el acta.' },
      { status: 500 }
    );
  }
}
