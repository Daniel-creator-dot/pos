import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating all stores with Intek SMS configurations...");
  const result = await prisma.store.updateMany({
    data: {
      smsEnabled: true,
      smsProvider: "intek",
      smsApiKey: "INTEK_274EC1.a16baf07f5a2aee65c81eb3db7e183eb669439071eaf3b0b",
      smsSenderId: "Swiftpos",
    }
  });
  console.log(`Updated ${result.count} stores in the database.`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
