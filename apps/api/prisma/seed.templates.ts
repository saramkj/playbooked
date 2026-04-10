import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { templateSeedData } from "./templateSeedData";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the Prisma seed.");
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  for (const template of templateSeedData) {
    await prisma.template.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        templateType: template.templateType,
        version: template.version,
        checklistItemsJson: template.checklistItemsJson,
      },
      create: {
        id: template.id,
        name: template.name,
        templateType: template.templateType,
        version: template.version,
        checklistItemsJson: template.checklistItemsJson,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
