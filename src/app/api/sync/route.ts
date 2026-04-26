import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/sync — batch sync offline operations
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { operaciones } = body;

    if (!operaciones || !Array.isArray(operaciones)) {
      return NextResponse.json(
        { error: 'Se requiere un array de operaciones.' },
        { status: 400 }
      );
    }

    const resultados: Array<{
      idLocal: string;
      tipo: string;
      estado: 'sincronizado' | 'conflicto' | 'error';
      idRemoto?: string;
      error?: string;
      versionRemota?: number;
    }> = [];

    for (const op of operaciones) {
      try {
        switch (op.tipo) {
          case 'CREAR_ACTA': {
            const currentYear = new Date().getFullYear();
            const lastActa = await prisma.acta.findFirst({
              where: { clubId: op.payload.clubId, anio: currentYear },
              orderBy: { numero: 'desc' },
            });
            const nextNumber = (lastActa?.numero || 0) + 1;

            const acta = await prisma.acta.create({
              data: {
                clubId: op.payload.clubId,
                titulo: op.payload.titulo,
                numero: nextNumber,
                anio: currentYear,
                contenido: op.payload.contenido || null,
                creadoPor: user!.sub,
              },
            });

            resultados.push({
              idLocal: op.idLocal,
              tipo: op.tipo,
              estado: 'sincronizado',
              idRemoto: acta.id,
            });
            break;
          }

          case 'EDITAR_ACTA': {
            const existing = await prisma.acta.findUnique({
              where: { id: op.payload.id },
            });

            if (!existing) {
              resultados.push({
                idLocal: op.idLocal,
                tipo: op.tipo,
                estado: 'error',
                error: 'Acta no encontrada.',
              });
              break;
            }

            // Optimistic concurrency check
            if (op.payload.version && existing.version !== op.payload.version) {
              resultados.push({
                idLocal: op.idLocal,
                tipo: op.tipo,
                estado: 'conflicto',
                versionRemota: existing.version,
                error: 'Conflicto de versión. El acta fue modificada remotamente.',
              });
              break;
            }

            await prisma.acta.update({
              where: { id: op.payload.id },
              data: {
                titulo: op.payload.titulo,
                contenido: op.payload.contenido,
              },
            });

            resultados.push({
              idLocal: op.idLocal,
              tipo: op.tipo,
              estado: 'sincronizado',
              idRemoto: op.payload.id,
            });
            break;
          }

          case 'AGREGAR_COMENTARIO': {
            const comentario = await prisma.comentario.create({
              data: {
                actaId: op.payload.actaId,
                texto: op.payload.texto,
                seccion: op.payload.seccion || 'general',
                autorId: user!.sub,
              },
            });

            resultados.push({
              idLocal: op.idLocal,
              tipo: op.tipo,
              estado: 'sincronizado',
              idRemoto: comentario.id,
            });
            break;
          }

          case 'APROBAR_ACTA': {
            const acta = await prisma.acta.findUnique({
              where: { id: op.payload.actaId },
            });

            if (!acta || acta.estado !== 'EN_REVISION') {
              resultados.push({
                idLocal: op.idLocal,
                tipo: op.tipo,
                estado: 'error',
                error: 'Acta no está en revisión.',
              });
              break;
            }

            await prisma.aprobacion.create({
              data: {
                actaId: op.payload.actaId,
                usuarioId: user!.sub,
                decision: op.payload.decision,
                motivo: op.payload.motivo || null,
                version: acta.version,
              },
            });

            resultados.push({
              idLocal: op.idLocal,
              tipo: op.tipo,
              estado: 'sincronizado',
            });
            break;
          }

          default:
            resultados.push({
              idLocal: op.idLocal,
              tipo: op.tipo,
              estado: 'error',
              error: `Tipo de operación desconocido: ${op.tipo}`,
            });
        }
      } catch (error) {
        resultados.push({
          idLocal: op.idLocal,
          tipo: op.tipo,
          estado: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido.',
        });
      }
    }

    const syncedCount = resultados.filter(r => r.estado === 'sincronizado').length;
    const conflictCount = resultados.filter(r => r.estado === 'conflicto').length;
    const errorCount = resultados.filter(r => r.estado === 'error').length;

    return NextResponse.json({
      resultados,
      resumen: {
        total: resultados.length,
        sincronizados: syncedCount,
        conflictos: conflictCount,
        errores: errorCount,
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Error en la sincronización.' },
      { status: 500 }
    );
  }
}
