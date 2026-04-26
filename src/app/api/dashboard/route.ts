import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  const authError = requireAuth(user);
  if (authError) return authError;

  try {
    const clubId = user!.clubId;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      actasDelMes,
      actasEnRevision,
      actasAprobadas,
      reunionesProgramadas,
      actasRecientes,
      proximasReuniones,
      acuerdosPendientes
    ] = await Promise.all([
      prisma.acta.count({
        where: { clubId, creadoEn: { gte: firstDayOfMonth } }
      }),
      prisma.acta.count({
        where: { clubId, estado: 'EN_REVISION' }
      }),
      prisma.acta.count({
        where: { clubId, estado: 'APROBADA' }
      }),
      prisma.reunion.count({
        where: { clubId, fechaHora: { gte: now } }
      }),
      prisma.acta.findMany({
        where: { clubId },
        orderBy: { creadoEn: 'desc' },
        take: 3,
        select: { id: true, titulo: true, numero: true, anio: true, estado: true, fechaReunion: true }
      }),
      prisma.reunion.findMany({
        where: { clubId, fechaHora: { gte: now } },
        orderBy: { fechaHora: 'asc' },
        take: 3,
        select: { id: true, titulo: true, fechaHora: true, lugar: true }
      }),
      prisma.acuerdo.findMany({
        where: { 
          acta: { clubId }, 
          responsableId: user!.sub, 
          estado: { not: 'HECHO' } 
        },
        orderBy: { fechaCompromiso: 'asc' },
        take: 5,
        select: { id: true, titulo: true, fechaCompromiso: true, estado: true }
      })
    ]);

    return NextResponse.json({
      stats: {
        actasDelMes,
        actasEnRevision,
        actasAprobadas,
        reunionesProgramadas
      },
      actasRecientes,
      proximasReuniones,
      acuerdosPendientes
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Error al obtener datos del dashboard' }, { status: 500 });
  }
}
