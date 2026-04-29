import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from '@/lib/audit';
import { EstadoActa } from '@prisma/client';
import { sendEmail, emailActaAprobada } from '@/lib/email';
import { getAppBaseUrl } from '@/lib/utils';

// POST /api/actas/[id]/aprobaciones — approve or reject
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { decision, motivo } = body;

    if (!decision || !['APRUEBA', 'RECHAZA'].includes(decision)) {
      return NextResponse.json(
        { error: 'Decisión inválida. Use APRUEBA o RECHAZA.' },
        { status: 400 }
      );
    }

    if (decision === 'RECHAZA' && (!motivo || !motivo.trim())) {
      return NextResponse.json(
        { error: 'Debe proporcionar un motivo al rechazar.' },
        { status: 400 }
      );
    }

    const acta = await prisma.acta.findUnique({
      where: { id: params.id },
      include: {
        club: true,
        creador: true,
        asistencias: {
          include: { usuario: { select: { id: true, nombre: true, email: true } } },
        },
        aprobaciones: { where: { version: undefined } },
      },
    });

    if (!acta) {
      return NextResponse.json({ error: 'Acta no encontrada.' }, { status: 404 });
    }

    if (acta.estado !== 'EN_REVISION') {
      return NextResponse.json(
        { error: 'Solo se pueden aprobar/rechazar actas en revisión.' },
        { status: 400 }
      );
    }

    // Check if user is a participant
    const isParticipant = acta.asistencias.some(a => a.usuarioId === user!.sub);
    if (!isParticipant && user!.rol === 'MIEMBRO') {
      return NextResponse.json(
        { error: 'Solo los participantes pueden aprobar/rechazar.' },
        { status: 403 }
      );
    }

    // Check for existing approval on this version
    const existingApproval = await prisma.aprobacion.findFirst({
      where: { actaId: params.id, usuarioId: user!.sub, version: acta.version },
    });

    if (existingApproval) {
      return NextResponse.json(
        { error: 'Ya ha registrado su decisión para esta versión del acta.' },
        { status: 409 }
      );
    }

    // Create approval record
    const aprobacion = await prisma.aprobacion.create({
      data: {
        actaId: params.id,
        usuarioId: user!.sub,
        decision,
        motivo: motivo?.trim() || null,
        version: acta.version,
      },
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
    });

    // Check if threshold is met (simple majority of present attendees)
    const presentAttendees = acta.asistencias.filter(a => a.presente);
    const totalPresent = presentAttendees.length;
    
    const allApprovals = await prisma.aprobacion.findMany({
      where: { actaId: params.id, version: acta.version },
    });

    const approvalCount = allApprovals.filter(a => a.decision === 'APRUEBA').length;
    const rejectionCount = allApprovals.filter(a => a.decision === 'RECHAZA').length;
    const threshold = Math.ceil(totalPresent / 2);

    let newEstado: EstadoActa = acta.estado;

    // Check if secretary/admin rejects (auto-reject)
    if (decision === 'RECHAZA' && (user!.rol === 'ADMIN' || user!.rol === 'SECRETARIO')) {
      newEstado = 'RECHAZADA';
    } else if (approvalCount >= threshold && totalPresent > 0) {
      newEstado = 'APROBADA';
    } else if (rejectionCount > totalPresent - threshold) {
      newEstado = 'RECHAZADA';
    }

    if (newEstado !== acta.estado) {
      await prisma.acta.update({
        where: { id: params.id },
        data: { estado: newEstado },
      });

      // --- ENVIAR NOTIFICACIONES ---
      const baseUrl = getAppBaseUrl(request);
      const actaUrl = `${baseUrl}/actas/${acta.id}`;

      if (newEstado === 'APROBADA') {
        const recipients = acta.asistencias
          .filter(a => a.usuario.email)
          .map(a => ({ nombre: a.usuario.nombre, email: a.usuario.email! }));

        recipients.forEach(r => {
          sendEmail(emailActaAprobada(r.nombre, acta.titulo, actaUrl)).catch(console.error);
        });
      } else if (newEstado === 'RECHAZADA') {
        // Notify creator
        if (acta.creador.email) {
          sendEmail({
            to: acta.creador.email,
            subject: `❌ Acta rechazada: ${acta.titulo}`,
            html: `<p>Hola <strong>${acta.creador.nombre}</strong>,</p><p>El acta ha sido rechazada y requiere ajustes.</p><p><a href="${actaUrl}">Ver acta y motivos</a></p>`
          }).catch(console.error);
        }
      }
    }

    await registrarAuditoria({
      entidad: 'Aprobacion',
      entidadId: aprobacion.id,
      accion: decision === 'APRUEBA' ? 'APROBAR' : 'RECHAZAR',
      usuarioId: user!.sub,
      datos: { actaId: params.id, decision, motivo, newEstado },
    });

    return NextResponse.json({
      aprobacion,
      estadoActa: newEstado,
      resumen: {
        aprobaciones: approvalCount,
        rechazos: rejectionCount,
        totalPresentes: totalPresent,
        umbral: threshold,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la aprobación.' },
      { status: 500 }
    );
  }
}
