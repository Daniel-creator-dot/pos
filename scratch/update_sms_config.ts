import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating all stores with Intek SMS configurations...");
  const result = await prisma.store.updateMany({
    data: {
      smsEnabled: true,
      smsProvider: "intek",
      smsApiKey: "INTEK_7C48EA.d4a1425f4c8df82048d0bcef598e8e6965d0d73df5ce6562",
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
