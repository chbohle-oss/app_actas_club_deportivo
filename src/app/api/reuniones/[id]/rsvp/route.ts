import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/reuniones/[id]/rsvp — Record RSVP response
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { rsvpEstado, nota } = body;

    if (!rsvpEstado || !['ACEPTO', 'RECHAZO', 'TAL_VEZ'].includes(rsvpEstado)) {
      return NextResponse.json(
        { error: 'Estado RSVP inválido. Use ACEPTO, RECHAZO o TAL_VEZ.' },
        { status: 400 }
      );
    }

    const convocado = await prisma.convocado.findFirst({
      where: { reunionId: params.id, usuarioId: user!.sub },
    });

    if (!convocado) {
      return NextResponse.json(
        { error: 'No fue convocado a esta reunión.' },
        { status: 403 }
      );
    }

    const updated = await prisma.convocado.update({
      where: { id: convocado.id },
      data: {
        rsvpEstado,
        rsvpFecha: new Date(),
        notaRsvp: nota || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('RSVP error:', error);
    return NextResponse.json({ error: 'Error al registrar RSVP.' }, { status: 500 });
  }
}
