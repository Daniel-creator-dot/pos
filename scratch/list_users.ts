import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      role: true,
      store: true,
    }
  });
  console.log('Users in DB:', JSON.stringify(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role.name,
    storeId: u.storeId,
    storeName: u.store?.name,
    companyId: u.companyId,
  })), null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
