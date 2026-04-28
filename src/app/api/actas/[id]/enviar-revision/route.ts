import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail, emailActaRevision } from '@/lib/email';

// POST /api/actas/[id]/enviar-revision — Send acta to review
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const roleError = requireRole(user!, ['ADMIN', 'SECRETARIO']);
  if (roleError) return roleError;

  try {
    const acta = await prisma.acta.findUnique({
      where: { id: params.id },
      include: {
        asistencias: {
          include: { usuario: { select: { id: true, nombre: true, email: true, telefono: true } } },
        },
      },
    });

    if (!acta) {
      return NextResponse.json({ error: 'Acta no encontrada.' }, { status: 404 });
    }

    if (acta.estado !== 'BORRADOR' && acta.estado !== 'RECHAZADA') {
      return NextResponse.json(
        { error: 'Solo se pueden enviar a revisión actas en borrador o rechazadas.' },
        { status: 400 }
      );
    }

    // Create shared link with approval permissions
    const token = uuidv4();
    await prisma.linkCompartido.create({
      data: {
        actaId: acta.id,
        token,
        permisos: { lectura: true, comentar: true, aprobar: true },
        creadoPor: user!.sub,
      },
    });

    // Update acta status and increment version if re-sending
    const newVersion = acta.estado === 'RECHAZADA' ? acta.version + 1 : acta.version;
    await prisma.acta.update({
      where: { id: params.id },
      data: {
        estado: 'EN_REVISION',
        version: newVersion,
      },
    });

    // Clear previous approvals if re-sending
    if (acta.estado === 'RECHAZADA') {
      await prisma.aprobacion.deleteMany({
        where: { actaId: params.id, version: { lt: newVersion } },
      });
    }

    await registrarAuditoria({
      entidad: 'Acta',
      entidadId: acta.id,
      accion: 'ENVIAR_REVISION',
      usuarioId: user!.sub,
      datos: { version: newVersion, token },
    });

    // --- ENVIAR CORREOS ---
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const appUrl = `${protocol}://${host}`;
    const publicLink = `${appUrl}/actas/${acta.id}/publica?token=${token}`;

    let recipients: { nombre: string; email: string }[] = [];

    if (acta.asistencias.length > 0) {
      // Usar asistentes si existen
      recipients = acta.asistencias
        .filter(a => a.usuario?.email)
        .map(a => ({ nombre: a.usuario!.nombre, email: a.usuario!.email! }));
    } else {
      // Si no hay asistentes, enviar a todos los miembros del club
      const clubMembers = await prisma.miembroClub.findMany({
        where: { clubId: acta.clubId, estado: 'ACTIVO' },
        include: { usuario: true }
      });
      recipients = clubMembers
        .filter(m => m.usuario?.email)
        .map(m => ({ nombre: m.usuario.nombre, email: m.usuario.email }));
    }

    const emailPromises = recipients.map(recipient => {
      const emailOpts = emailActaRevision(
        recipient.nombre,
        acta.titulo,
        publicLink
      );
      emailOpts.to = recipient.email;
      return sendEmail(emailOpts);
    });

    // No bloqueamos el response, pero lanzamos los envíos
    await Promise.all(emailPromises);

    return NextResponse.json({
      message: recipients.length > 0 
        ? `Acta enviada a revisión. Se notificó a ${recipients.length} personas.`
        : 'Acta enviada a revisión (sin destinatarios para notificar).',
      link: publicLink,
      token,
      version: newVersion,
    });
  } catch (error) {
    console.error('Send to review error:', error);
    return NextResponse.json(
      { error: 'Error al enviar a revisión.' },
      { status: 500 }
    );
  }
}
