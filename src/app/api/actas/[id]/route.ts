import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from '@/lib/audit';

// GET /api/actas/[id] — get full acta detail
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const acta = await prisma.acta.findUnique({
    where: { id: params.id },
    include: {
      club: { select: { nombre: true } },
      creador: { select: { id: true, nombre: true, email: true } },
      reunion: {
        select: { id: true, titulo: true, fechaHora: true, lugar: true },
      },
      asistencias: {
        include: {
          usuario: { select: { id: true, nombre: true, email: true, telefono: true } },
        },
      },
      acuerdos: {
        include: {
          responsable: { select: { id: true, nombre: true } },
        },
        orderBy: { orden: 'asc' },
      },
      comentarios: {
        include: {
          autor: { select: { id: true, nombre: true } },
          respuestas: {
            include: {
              autor: { select: { id: true, nombre: true } },
            },
          },
        },
        where: { parentId: null },
        orderBy: { creadoEn: 'desc' },
      },
      aprobaciones: {
        include: {
          usuario: { select: { id: true, nombre: true } },
        },
      },
      adjuntos: true,
      links: user!.rol !== 'MIEMBRO' ? true : false,
    },
  });

  if (!acta) {
    return NextResponse.json({ error: 'Acta no encontrada.' }, { status: 404 });
  }

  // Members can only see approved actas or actas they participated in
  if (user!.rol === 'MIEMBRO' && acta.estado !== 'APROBADA') {
    const isParticipant = acta.asistencias.some(a => a.usuarioId === user!.sub);
    if (!isParticipant) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }
  }

  return NextResponse.json(acta);
}

// PUT /api/actas/[id] — update acta
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
    const existing = await prisma.acta.findUnique({ where: { id: params.id } });

    if (!existing) {
      return NextResponse.json({ error: 'Acta no encontrada.' }, { status: 404 });
    }

    if (existing.estado === 'APROBADA') {
      return NextResponse.json(
        { error: 'No se puede editar un acta aprobada.' },
        { status: 400 }
      );
    }

    const {
      titulo, contenido, contenidoHtml, fechaReunion,
      lugarReunion, tipoReunion, proximaReunion,
      asistencias, acuerdos
    } = body;

    // Update acta
    const acta = await prisma.acta.update({
      where: { id: params.id },
      data: {
        ...(titulo && { titulo }),
        ...(contenido !== undefined && { contenido }),
        ...(contenidoHtml !== undefined && { contenidoHtml }),
        ...(fechaReunion && { fechaReunion: new Date(fechaReunion) }),
        ...(lugarReunion !== undefined && { lugarReunion }),
        ...(tipoReunion !== undefined && { tipoReunion }),
        ...(proximaReunion !== undefined && { proximaReunion }),
      },
    });

    // Update asistencias if provided
    if (asistencias && Array.isArray(asistencias)) {
      await prisma.asistencia.deleteMany({ where: { actaId: params.id } });
      if (asistencias.length > 0) {
        await prisma.asistencia.createMany({
          data: asistencias.map((a: { usuarioId: string; presente: boolean; nota?: string }) => ({
            actaId: params.id,
            usuarioId: a.usuarioId,
            presente: a.presente,
            nota: a.nota || null,
          })),
        });
      }
    }

    // Update acuerdos if provided
    if (acuerdos && Array.isArray(acuerdos)) {
      await prisma.acuerdo.deleteMany({ where: { actaId: params.id } });
      if (acuerdos.length > 0) {
        await prisma.acuerdo.createMany({
          data: acuerdos.map((ac: {
            titulo: string;
            descripcion?: string;
            responsableId?: string;
            fechaCompromiso?: string;
            estado?: string;
          }, idx: number) => ({
            actaId: params.id,
            titulo: ac.titulo,
            descripcion: ac.descripcion || null,
            responsableId: ac.responsableId || null,
            fechaCompromiso: ac.fechaCompromiso ? new Date(ac.fechaCompromiso) : null,
            estado: (ac.estado as 'PENDIENTE' | 'EN_CURSO' | 'HECHO') || 'PENDIENTE',
            orden: idx,
          })),
        });
      }
    }

    await registrarAuditoria({
      entidad: 'Acta',
      entidadId: acta.id,
      accion: 'EDITAR',
      usuarioId: user!.sub,
      datos: body,
    });

    return NextResponse.json(acta);
  } catch (error) {
    console.error('Update acta error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el acta.' },
      { status: 500 }
    );
  }
}
