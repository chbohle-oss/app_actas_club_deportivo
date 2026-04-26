import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from '@/lib/audit';
import { sendEmail, emailNuevaReunion } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET /api/reuniones — list meetings for the user's club
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const clubId = searchParams.get('clubId') || user!.clubId;
  const estado = searchParams.get('estado');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!clubId) {
    return NextResponse.json({ error: 'ClubId requerido.' }, { status: 400 });
  }

  const where: Record<string, unknown> = { clubId };
  if (estado) where.estado = estado;

  const [reuniones, total] = await Promise.all([
    prisma.reunion.findMany({
      where,
      include: {
        creador: { select: { id: true, nombre: true, email: true } },
        convocados: {
          include: {
            usuario: { select: { id: true, nombre: true, email: true } },
          },
        },
        _count: { select: { actas: true } },
      },
      orderBy: { fechaHora: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.reunion.count({ where }),
  ]);

  return NextResponse.json({
    data: reuniones,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/reuniones — create a meeting
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const roleError = requireRole(user!, ['ADMIN', 'SECRETARIO']);
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const { titulo, fechaHora, lugar, tipo, agenda, convocadosIds, clubId } = body;

    if (!titulo || !fechaHora || !lugar) {
      return NextResponse.json(
        { error: 'Título, fecha/hora y lugar son requeridos.' },
        { status: 400 }
      );
    }

    const targetClubId = clubId || user!.clubId;
    if (!targetClubId) {
      return NextResponse.json({ error: 'ClubId requerido.' }, { status: 400 });
    }

    const reunion = await prisma.reunion.create({
      data: {
        clubId: targetClubId,
        titulo,
        fechaHora: new Date(fechaHora),
        lugar,
        tipo: tipo || 'ordinaria',
        agenda: agenda || null,
        creadoPor: user!.sub,
        convocados: convocadosIds?.length
          ? {
              create: convocadosIds.map((uid: string) => ({
                usuarioId: uid,
                rsvpEstado: 'PENDIENTE',
              })),
            }
          : undefined,
      },
      include: {
        convocados: {
          include: {
            usuario: { select: { id: true, nombre: true, email: true } },
          },
        },
      },
    });

    await registrarAuditoria({
      entidad: 'Reunion',
      entidadId: reunion.id,
      accion: 'CREAR',
      usuarioId: user!.sub,
      datos: { titulo, fechaHora, lugar },
    });

    // --- ENVIAR CORREOS DE CITACIÓN ---
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const reunionUrl = `${appUrl}/reuniones/${reunion.id}`;

      // Si hay convocados específicos
      if (reunion.convocados?.length) {
        const emailPromises = reunion.convocados.map(convocado => {
          const emailOpts = emailNuevaReunion(
            convocado.usuario.nombre,
            { titulo, fechaHora, lugar },
            reunionUrl
          );
          emailOpts.to = convocado.usuario.email;
          return sendEmail(emailOpts);
        });
        Promise.all(emailPromises).catch(err => console.error('Error sending meeting invitation emails:', err));
      }
    } catch (emailErr) {
      console.error('Error in meeting email notification flow:', emailErr);
    }

    return NextResponse.json(reunion, { status: 201 });
  } catch (error) {
    console.error('Create meeting error:', error);
    return NextResponse.json(
      { error: 'Error al crear la reunión.' },
      { status: 500 }
    );
  }
}
