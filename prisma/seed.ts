import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Club
  const club = await prisma.club.create({
    data: {
      nombre: 'Club Deportivo Cóndores Basket',
      descripcion: 'Club de baloncesto comunitario',
      configuracion: {
        umbralAprobacion: 'mayoria_simple',
        plantillaActa: 'standard',
        notificacionesEmail: true,
        notificacionesWhatsApp: false,
      },
    },
  });

  console.log('✅ Club created:', club.nombre);

  // Create Users
  const passwordHash = await bcrypt.hash('123456', 12);

  const admin = await prisma.usuario.create({
    data: {
      nombre: 'Carlos Administrador',
      email: 'admin@actasclub.com',
      telefono: '+56912345678',
      passwordHash,
      rol: 'ADMIN',
    },
  });

  const secretario = await prisma.usuario.create({
    data: {
      nombre: 'María Secretaria',
      email: 'secretaria@actasclub.com',
      telefono: '+56987654321',
      passwordHash,
      rol: 'SECRETARIO',
    },
  });

  const miembro1 = await prisma.usuario.create({
    data: {
      nombre: 'Juan Jugador',
      email: 'juan@actasclub.com',
      telefono: '+56911111111',
      passwordHash,
      rol: 'MIEMBRO',
    },
  });

  const miembro2 = await prisma.usuario.create({
    data: {
      nombre: 'Ana Suplente',
      email: 'ana@actasclub.com',
      telefono: '+56922222222',
      passwordHash,
      rol: 'MIEMBRO',
    },
  });

  const miembro3 = await prisma.usuario.create({
    data: {
      nombre: 'Pedro Entrenador',
      email: 'pedro@actasclub.com',
      telefono: '+56933333333',
      passwordHash,
      rol: 'MIEMBRO',
    },
  });

  console.log('✅ Users created: admin, secretaria, 3 miembros');

  // Associate to club
  const members = [admin, secretario, miembro1, miembro2, miembro3];
  for (const member of members) {
    await prisma.miembroClub.create({
      data: {
        clubId: club.id,
        usuarioId: member.id,
        rolClub: member.rol,
      },
    });
  }

  console.log('✅ Members associated to club');

  // Create a sample meeting
  const reunion = await prisma.reunion.create({
    data: {
      clubId: club.id,
      titulo: 'Reunión de Directiva - Abril 2026',
      fechaHora: new Date('2026-04-28T18:00:00'),
      lugar: 'Sede del club - Sala principal',
      tipo: 'ordinaria',
      agenda: '1. Aprobación acta anterior\n2. Informe de tesorería\n3. Planificación torneo de verano\n4. Inscripción de nuevos jugadores\n5. Varios',
      creadoPor: secretario.id,
      convocados: {
        create: members.map(m => ({
          usuarioId: m.id,
          rsvpEstado: m.id === admin.id ? 'ACEPTO' : m.id === miembro2.id ? 'RECHAZO' : 'PENDIENTE',
        })),
      },
    },
  });

  console.log('✅ Sample meeting created:', reunion.titulo);

  // Create a sample acta
  const acta = await prisma.acta.create({
    data: {
      clubId: club.id,
      reunionId: reunion.id,
      numero: 1,
      anio: 2026,
      titulo: 'Acta de Reunión de Directiva - Abril 2026',
      estado: 'BORRADOR',
      contenido: {
        temas: [
          'Aprobación del acta de la reunión anterior',
          'Informe de tesorería del mes de marzo',
          'Planificación del torneo inter-clubes de verano',
          'Inscripción de 3 nuevos jugadores juveniles',
        ],
      },
      fechaReunion: new Date('2026-04-28T18:00:00'),
      lugarReunion: 'Sede del club - Sala principal',
      tipoReunion: 'ordinaria',
      proximaReunion: 'Viernes 15 de mayo, 18:00 hrs - Sede del club',
      creadoPor: secretario.id,
    },
  });

  // Add attendance
  await prisma.asistencia.createMany({
    data: [
      { actaId: acta.id, usuarioId: admin.id, presente: true },
      { actaId: acta.id, usuarioId: secretario.id, presente: true },
      { actaId: acta.id, usuarioId: miembro1.id, presente: true },
      { actaId: acta.id, usuarioId: miembro2.id, presente: false, nota: 'Justificado - viaje de trabajo' },
      { actaId: acta.id, usuarioId: miembro3.id, presente: true },
    ],
  });

  // Add agreements
  await prisma.acuerdo.createMany({
    data: [
      {
        actaId: acta.id,
        titulo: 'Aprobar presupuesto para torneo de verano',
        descripcion: 'Se aprueba un presupuesto de $500.000 CLP para inscripción, transporte y alimentación del equipo.',
        responsableId: admin.id,
        fechaCompromiso: new Date('2026-05-15'),
        estado: 'PENDIENTE',
        orden: 0,
      },
      {
        actaId: acta.id,
        titulo: 'Inscribir nuevos jugadores juveniles',
        descripcion: 'Completar la documentación e inscripción de Diego, Matías y Sofía en la federación.',
        responsableId: secretario.id,
        fechaCompromiso: new Date('2026-05-10'),
        estado: 'EN_CURSO',
        orden: 1,
      },
      {
        actaId: acta.id,
        titulo: 'Organizar rifa benéfica para financiamiento',
        descripcion: 'Coordinar con el equipo de padres para organizar una rifa que ayude al financiamiento del torneo.',
        responsableId: miembro1.id,
        fechaCompromiso: new Date('2026-05-20'),
        estado: 'PENDIENTE',
        orden: 2,
      },
    ],
  });

  console.log('✅ Sample acta created with attendance and agreements');

  console.log('\n🎯 Seed completed! Use these credentials to log in:');
  console.log('  Admin:      admin@actasclub.com / 123456');
  console.log('  Secretaria: secretaria@actasclub.com / 123456');
  console.log('  Miembro:    juan@actasclub.com / 123456');
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
