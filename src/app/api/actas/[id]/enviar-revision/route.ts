import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

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
    const link = await prisma.linkCompartido.create({
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

    return NextResponse.json({
      message: 'Enlace de revisión generado correctamente.',
      link: `/actas/${acta.id}/publica?token=${token}`,
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
  } catch (error) {
    console.error('Send to review error:', error);
    return NextResponse.json(
      { error: 'Error al enviar a revisión.' },
      { status: 500 }
    );
  }
}
