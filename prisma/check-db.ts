import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clubs = await prisma.club.findMany();
  console.log('Clubs:', clubs.length);
  
  const usuarios = await prisma.usuario.findMany();
  console.log('Usuarios:', usuarios.length);
  
  const miembros = await prisma.miembroClub.findMany({
    include: { usuario: true, club: true }
  });
  console.log('Membresías:', miembros.length);
  
  miembros.forEach(m => {
    console.log(`- Usuario: ${m.usuario.email} | Club: ${m.club.nombre} | Rol: ${m.rolClub}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
