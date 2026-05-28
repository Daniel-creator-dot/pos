import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching recent SMS logs...");
  const logs = await prisma.smsLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("Recent SMS logs:", JSON.stringify(logs, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
