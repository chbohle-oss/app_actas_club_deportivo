import { prisma } from './prisma';

interface AuditData {
  entidad: string;
  entidadId: string;
  accion: string;
  usuarioId?: string;
  datos?: Record<string, unknown>;
  ip?: string;
}

export async function registrarAuditoria(data: AuditData) {
  try {
    await prisma.auditoriaLog.create({
      data: {
        entidad: data.entidad,
        entidadId: data.entidadId,
        accion: data.accion,
        usuarioId: data.usuarioId || null,
        datos: data.datos || null,
        ip: data.ip || null,
      },
    });
  } catch (error) {
    console.error('Error registering audit log:', error);
    // Don't throw - audit failures shouldn't break operations
  }
}
