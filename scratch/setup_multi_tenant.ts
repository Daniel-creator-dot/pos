import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('>>> [SETUP] Starting multi-tenant initialization...');

  // 1. Ensure superadmin role exists
  let superadminRole = await prisma.role.findUnique({
    where: { name: RoleName.superadmin }
  });

  if (!superadminRole) {
    superadminRole = await prisma.role.create({
      data: {
        name: RoleName.superadmin,
        description: 'Global system administrator',
        permissions: JSON.stringify(['*']), // All permissions
      }
    });
    console.log('>>> [SETUP] Created superadmin role.');
  }

  // 2. Ensure admin role exists
  let adminRole = await prisma.role.findUnique({
    where: { name: RoleName.admin }
  });

  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: RoleName.admin,
        description: 'Company administrator',
        permissions: JSON.stringify(['manage_users', 'manage_products', 'manage_sales']),
      }
    });
    console.log('>>> [SETUP] Created admin role.');
  }

  // 3. Create Default Company
  let defaultCompany = await prisma.company.findFirst({
    where: { name: 'Default Company' }
  });

  if (!defaultCompany) {
    defaultCompany = await prisma.company.create({
      data: {
        name: 'Default Company',
        status: 'ACTIVE',
      }
    });
    console.log('>>> [SETUP] Created Default Company.');
  }

  // 4. Migrate existing data to Default Company
  console.log('>>> [SETUP] Migrating existing data...');

  await prisma.user.updateMany({
    where: { companyId: null },
    data: { companyId: defaultCompany.id }
  });

  await prisma.store.updateMany({
    where: { companyId: null },
    data: { companyId: defaultCompany.id }
  });

  await prisma.product.updateMany({
    where: { companyId: null },
    data: { companyId: defaultCompany.id }
  });

  await prisma.category.updateMany({
    where: { companyId: null },
    data: { companyId: defaultCompany.id }
  });

  await prisma.supplier.updateMany({
    where: { companyId: null },
    data: { companyId: defaultCompany.id }
  });

  await prisma.customer.updateMany({
    where: { companyId: null },
    data: { companyId: defaultCompany.id }
  });

  await prisma.sale.updateMany({
    where: { companyId: null },
    data: { companyId: defaultCompany.id }
  });

  await prisma.purchase.updateMany({
    where: { companyId: null },
    data: { companyId: defaultCompany.id }
  });

  await prisma.smsLog.updateMany({
    where: { companyId: null },
    data: { companyId: defaultCompany.id }
  });

  // 5. Create Superadmin User
  const superEmail = 'superadmin@pos.com';
  const existingSuper = await prisma.user.findUnique({
    where: { email: superEmail }
  });

  if (!existingSuper) {
    const hashedPassword = await bcrypt.hash('Super@123', 10);
    await prisma.user.create({
      data: {
        name: 'System Superadmin',
        email: superEmail,
        passwordHash: hashedPassword,
        roleId: superadminRole.id,
        // Superadmin doesn't necessarily belong to a company
      }
    });
    console.log('>>> [SETUP] Created Superadmin user: ' + superEmail);
  }

  console.log('>>> [SETUP] Initialization complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
