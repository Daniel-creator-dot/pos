export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { execSync } = await import('child_process');
    console.log('--- Checking database schema ---');
    try {
      // 1. Ensure schema is up to date
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      
      // 2. Check if seeding is needed (e.g., if no users exist)
      // We use a simple script to check user count to avoid loading the whole Prisma client here if possible
      const userCountStr = execSync('npx tsx -e "import { PrismaClient } from \'@prisma/client\'; const p = new PrismaClient(); p.user.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log(0); process.exit(0); })"', { encoding: 'utf8' }).trim();
      const userCount = parseInt(userCountStr) || 0;

      if (userCount === 0) {
        console.log('--- Database is empty, seeding... ---');
        execSync('npm run prisma:seed', { stdio: 'inherit' });
      }

      console.log('--- Database is ready ---');
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }
}
