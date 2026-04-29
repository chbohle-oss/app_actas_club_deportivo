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

// POST /api/compartido/[token] — record approval or comment from public link
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { action, nombre, decision, motivo, texto } = body;

    const link = await prisma.linkCompartido.findUnique({
      where: { token: params.token },
      include: {
        acta: {
          include: {
            club: true,
            asistencias: true,
          }
        }
      }
    });

    if (!link || !link.activo) {
      return NextResponse.json({ error: 'Enlace no válido.' }, { status: 404 });
    }

    const permisos = link.permisos as any;

    // --- CASE: APPROVAL/SIGNATURE ---
    if (action === 'APROBAR') {
      if (!permisos.aprobar) {
        return NextResponse.json({ error: 'No tienes permisos para firmar esta acta.' }, { status: 403 });
      }

      if (!nombre || !decision) {
        return NextResponse.json({ error: 'Nombre y decisión son requeridos.' }, { status: 400 });
      }

      // Find user by name in this club (case-insensitive)
      // First, get all users in the club to compare names
      const members = await prisma.miembroClub.findMany({
        where: { clubId: link.acta.clubId },
        include: { usuario: true }
      });

      const matchedMember = members.find(m => 
        m.usuario.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
      );

      if (!matchedMember) {
        return NextResponse.json({ 
          error: `No se encontró al socio "${nombre}" en el club. Por favor usa tu nombre oficial.` 
        }, { status: 404 });
      }

      const usuarioId = matchedMember.usuarioId;

      // Check if already approved this version
      const existing = await prisma.aprobacion.findFirst({
        where: { actaId: link.actaId, usuarioId, version: link.acta.version }
      });

      if (existing) {
        return NextResponse.json({ error: 'Ya has registrado tu firma para esta versión del acta.' }, { status: 409 });
      }

      // Record approval
      const aprobacion = await prisma.aprobacion.create({
        data: {
          actaId: link.actaId,
          usuarioId,
          decision,
          motivo: motivo || null,
          version: link.acta.version,
        }
      });

      // Recalculate status (simplified logic from the main approvals route)
      const presentAttendees = link.acta.asistencias.filter(a => a.presente);
      const totalPresent = presentAttendees.length || 1; // avoid division by zero
      
      const allApprovals = await prisma.aprobacion.findMany({
        where: { actaId: link.actaId, version: link.acta.version },
      });

      const approvalCount = allApprovals.filter(a => a.decision === 'APRUEBA').length;
      const threshold = Math.ceil(totalPresent / 2);

      if (approvalCount >= threshold && link.acta.estado === 'EN_REVISION') {
        await prisma.acta.update({
          where: { id: link.actaId },
          data: { estado: 'APROBADA' }
        });
      }

      return NextResponse.json({ success: true, message: 'Firma registrada con éxito.' });
    }

    // --- CASE: COMMENT ---
    if (action === 'COMENTAR') {
      if (!permisos.comentar) {
        return NextResponse.json({ error: 'No tienes permisos para comentar.' }, { status: 403 });
      }

      if (!nombre || !texto) {
        return NextResponse.json({ error: 'Nombre y texto son requeridos.' }, { status: 400 });
      }

      // For comments, we can be more lenient, but let's try to link it if possible
      const members = await prisma.miembroClub.findMany({
        where: { clubId: link.acta.clubId },
        include: { usuario: true }
      });

      const matchedMember = members.find(m => 
        m.usuario.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
      );

      // If no match, we use the link creator as a proxy or just fail?
      // Better to require a valid member name for official comments.
      if (!matchedMember) {
        return NextResponse.json({ error: 'Debes usar tu nombre de socio registrado para comentar.' }, { status: 404 });
      }

      await prisma.comentario.create({
        data: {
          actaId: link.actaId,
          texto: `[Público] ${texto}`,
          autorId: matchedMember.usuarioId,
        }
      });

      return NextResponse.json({ success: true, message: 'Comentario enviado.' });
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });

  } catch (error) {
    console.error('Public POST error:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 });
  }
}
