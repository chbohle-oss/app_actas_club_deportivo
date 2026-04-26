import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendCitacion } from '@/lib/whatsapp';

// POST /api/reuniones/[id]/citar — Send WhatsApp invitations
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
    const reunion = await prisma.reunion.findUnique({
      where: { id: params.id },
      include: {
        convocados: {
          include: {
            usuario: { select: { id: true, nombre: true, telefono: true, email: true } },
          },
        },
      },
    });

    if (!reunion) {
      return NextResponse.json({ error: 'Reunión no encontrada.' }, { status: 404 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resultados: Array<{ usuario: string; enviado: boolean; error?: string }> = [];

    for (const conv of reunion.convocados) {
      const tel = conv.usuario.telefono;
      if (!tel) {
        resultados.push({ usuario: conv.usuario.nombre, enviado: false, error: 'Sin teléfono registrado.' });
        continue;
      }

      const fecha = new Date(reunion.fechaHora);
      const result = await sendCitacion(tel, {
        reunionTitulo: reunion.titulo,
        fecha: fecha.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        hora: fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        lugar: reunion.lugar,
        agenda: reunion.agenda || undefined,
        confirmacionUrl: `${baseUrl}/reuniones/${reunion.id}`,
      });

      // Log notification
      await prisma.notificacionLog.create({
        data: {
          tipo: 'citacion',
          canal: 'WHATSAPP',
          destinatarioId: conv.usuario.id,
          referencia: reunion.id,
          titulo: `Citación: ${reunion.titulo}`,
          estado: result.success ? 'ENTREGADA' : 'FALLIDA',
          error: result.error || null,
        },
      });

      resultados.push({
        usuario: conv.usuario.nombre,
        enviado: result.success,
        error: result.error,
      });
    }

    const enviados = resultados.filter(r => r.enviado).length;

    return NextResponse.json({
      message: `Citaciones enviadas: ${enviados}/${resultados.length}`,
      resultados,
    });
  } catch (error) {
    console.error('Citation error:', error);
    return NextResponse.json({ error: 'Error al enviar citaciones.' }, { status: 500 });
  }
}
