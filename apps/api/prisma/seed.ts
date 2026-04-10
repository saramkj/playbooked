import { PrismaPg } from "@prisma/adapter-pg";
import {
  EventStatus,
  EventType,
  PrismaClient,
  UserRole,
} from "@prisma/client";
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

const ids = {
  adminUser: "11111111-1111-1111-1111-111111111111",
  investorUser: "22222222-2222-2222-2222-222222222222",
  watchlistItem: "55555555-5555-5555-5555-555555555555",
  event: "66666666-6666-6666-6666-666666666666",
};

async function main() {
  await prisma.user.upsert({
    where: { id: ids.adminUser },
    update: {
      email: "admin@playbooked.dev",
      role: UserRole.ADMIN,
      learningGoal: "Seeded admin account for template management in local development.",
    },
    create: {
      id: ids.adminUser,
      email: "admin@playbooked.dev",
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=1$seeded$adminplaceholderhash",
      role: UserRole.ADMIN,
      learningGoal: "Seeded admin account for template management in local development.",
    },
  });

  await prisma.user.upsert({
    where: { id: ids.investorUser },
    update: {
      email: "investor@playbooked.dev",
      role: UserRole.INVESTOR,
      learningGoal: "Build discipline around event-driven paper trades.",
      defaultMaxLossPercent: "2.00",
    },
    create: {
      id: ids.investorUser,
      email: "investor@playbooked.dev",
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=1$seeded$investorplaceholderhash",
      role: UserRole.INVESTOR,
      learningGoal: "Build discipline around event-driven paper trades.",
      defaultMaxLossPercent: "2.00",
    },
  });

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

  await prisma.watchlistItem.upsert({
    where: { id: ids.watchlistItem },
    update: {
      userId: ids.investorUser,
      ticker: "AAPL",
      tagsJson: ["tech", "earnings"],
    },
    create: {
      id: ids.watchlistItem,
      userId: ids.investorUser,
      ticker: "AAPL",
      tagsJson: ["tech", "earnings"],
    },
  });

  await prisma.event.upsert({
    where: { id: ids.event },
    update: {
      userId: ids.investorUser,
      watchlistItemId: ids.watchlistItem,
      eventType: EventType.EARNINGS,
      status: EventStatus.UPCOMING,
      eventDatetimeAt: new Date("2026-04-30T20:00:00.000Z"),
      notes: "Seeded sample event for local development.",
    },
    create: {
      id: ids.event,
      userId: ids.investorUser,
      watchlistItemId: ids.watchlistItem,
      eventType: EventType.EARNINGS,
      status: EventStatus.UPCOMING,
      eventDatetimeAt: new Date("2026-04-30T20:00:00.000Z"),
      notes: "Seeded sample event for local development.",
    },
  });
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
