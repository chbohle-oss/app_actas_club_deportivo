import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, requireRole, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, emailInvitacionClub } from '@/lib/email';
import { registrarAuditoria } from '@/lib/audit';

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

// POST /api/miembros — Invite/Add a new member
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  // Solo ADMIN o SECRETARIO pueden invitar
  const roleError = requireRole(user!, ['ADMIN', 'SECRETARIO']);
  if (roleError) return roleError;

  if (!user!.clubId) {
    return NextResponse.json({ error: 'Usuario no asociado a un club.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { nombre, email, rolClub } = body;

    if (!nombre || !email) {
      return NextResponse.json({ error: 'Nombre y email son requeridos.' }, { status: 400 });
    }

    // 1. Obtener información del club para el email
    const club = await prisma.club.findUnique({
      where: { id: user!.clubId }
    });

    // 2. Verificar si el usuario ya existe
    let targetUser = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!targetUser) {
      // Crear usuario nuevo con password temporal (luego el usuario debería resetearlo o entrar por link)
      // Usamos un password aleatorio largo por seguridad inicial
      const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
      const passwordHash = await hashPassword(tempPassword);
      
      targetUser = await prisma.usuario.create({
        data: {
          nombre,
          email,
          passwordHash,
          rol: rolClub || 'MIEMBRO',
        }
      });
    }

    // 3. Verificar si ya es miembro de ESTE club
    const existingMembership = await prisma.miembroClub.findUnique({
      where: {
        clubId_usuarioId: {
          clubId: user!.clubId,
          usuarioId: targetUser.id
        }
      }
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'El usuario ya es miembro de este club.' }, { status: 409 });
    }

    // 4. Crear membresía
    const membership = await prisma.miembroClub.create({
      data: {
        clubId: user!.clubId,
        usuarioId: targetUser.id,
        rolClub: rolClub || 'MIEMBRO',
        estado: 'ACTIVO'
      },
      include: {
        usuario: true
      }
    });

    // 5. Registrar auditoría
    await registrarAuditoria({
      entidad: 'Club',
      entidadId: user!.clubId,
      accion: 'INVITAR_MIEMBRO',
      usuarioId: user!.sub,
      datos: { invitadoId: targetUser.id, email: targetUser.email }
    });

    // 6. Enviar email de invitación
    try {
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host');
      const appUrl = `${protocol}://${host}`;
      const emailOptions = emailInvitacionClub(
        targetUser.nombre, 
        club?.nombre || 'Club Deportivo', 
        `${appUrl}/login`
      );
      emailOptions.to = targetUser.email;
      await sendEmail(emailOptions);
    } catch (emailErr) {
      console.error('Error sending invitation email:', emailErr);
      // No fallamos el request si el email falla, pero lo logueamos
    }

    return NextResponse.json({ 
      success: true, 
      data: membership 
    }, { status: 201 });

  } catch (error) {
    console.error('Invite member error:', error);
    return NextResponse.json({ error: 'Error al invitar al miembro.' }, { status: 500 });
  }
}
