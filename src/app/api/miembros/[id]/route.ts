import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarAuditoria } from '@/lib/audit';

// PATCH /api/miembros/[id] — Update member/user data
export async function PATCH(
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
    const { nombre, email, telefono, rolClub, estado } = body;

    // 1. Buscar el miembro para obtener el usuarioId
    const miembro = await prisma.miembroClub.findUnique({
      where: { id: params.id },
      include: { usuario: true }
    });

    if (!miembro) {
      return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 });
    }

    // 2. Actualizar Usuario
    await prisma.usuario.update({
      where: { id: miembro.usuarioId },
      data: {
        nombre: nombre !== undefined ? nombre : undefined,
        email: email !== undefined ? email : undefined,
        telefono: telefono !== undefined ? telefono : undefined,
        rol: rolClub !== undefined ? rolClub : undefined, // El rol global se sincroniza con el del club para simplicidad en este modelo
      }
    });

    // 3. Actualizar MiembroClub
    const updatedMiembro = await prisma.miembroClub.update({
      where: { id: params.id },
      data: {
        rolClub: rolClub !== undefined ? rolClub : undefined,
        estado: estado !== undefined ? estado : undefined,
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true, telefono: true, rol: true }
        }
      }
    });

    // 4. Auditoría
    await registrarAuditoria({
      entidad: 'Usuario',
      entidadId: miembro.usuarioId,
      accion: 'ACTUALIZAR',
      usuarioId: user!.sub,
      datos: { 
        miembroId: params.id, 
        cambios: { nombre, email, telefono, rolClub, estado } 
      }
    });

    return NextResponse.json({ success: true, data: updatedMiembro });
  } catch (error: any) {
    console.error('Update miembro error:', error);
    
    // Manejar error de email duplicado
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ error: 'El correo electrónico ya está en uso por otro usuario.' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Error al actualizar el miembro.' }, { status: 500 });
  }
}

// DELETE /api/miembros/[id] — Deactivate member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  const roleError = requireRole(user!, ['ADMIN']);
  if (roleError) return roleError;

  try {
    await prisma.miembroClub.update({
      where: { id: params.id },
      data: { estado: 'INACTIVO' }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete miembro error:', error);
    return NextResponse.json({ error: 'Error al desactivar el miembro.' }, { status: 500 });
  }
}
