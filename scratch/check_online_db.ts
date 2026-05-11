import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('>>> [CHECK] Investigating existing data in Supabase...');

  try {
    const userCount = await prisma.user.count();
    const storeCount = await prisma.store.count();
    const productCount = await prisma.product.count();
    const saleCount = await prisma.sale.count();
    const roleCount = await prisma.role.count();

    console.log(`- Users: ${userCount}`);
    console.log(`- Stores: ${storeCount}`);
    console.log(`- Products: ${productCount}`);
    console.log(`- Sales: ${saleCount}`);
    console.log(`- Roles: ${roleCount}`);

    if (userCount > 0) {
      const sampleUsers = await prisma.user.findMany({ 
        take: 3,
        include: { role: true } 
      });
      console.log('\nSample Users:', JSON.stringify(sampleUsers, null, 2));
    }

    if (storeCount > 0) {
      const sampleStores = await prisma.store.findMany({ take: 3 });
      console.log('\nSample Stores:', JSON.stringify(sampleStores, null, 2));
    }

    if (roleCount > 0) {
        const roles = await prisma.role.findMany();
        console.log('\nExisting Roles:', JSON.stringify(roles, null, 2));
    }

  } catch (err: any) {
    console.error('!!! [CHECK] Error reading database:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
