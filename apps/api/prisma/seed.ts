import { PrismaPg } from "@prisma/adapter-pg";
import {
  EventStatus,
  EventType,
  PrismaClient,
  UserRole,
} from "@prisma/client";

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
  earningsTemplate: "33333333-3333-3333-3333-333333333333",
  macroTemplate: "44444444-4444-4444-4444-444444444444",
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

  await prisma.template.upsert({
    where: { id: ids.earningsTemplate },
    update: {
      name: "Earnings Event Review",
      templateType: "earnings",
      version: 1,
      checklistItemsJson: [
        {
          id: "guidance-path",
          label: "Document the likely guidance path.",
          help_text: "Capture the expected management tone and the scenario that would invalidate it.",
        },
        {
          id: "risk-line",
          label: "Write the invalidation line before the event.",
          help_text: "State what would make the setup wrong instead of reacting after the print.",
        },
        {
          id: "position-plan",
          label: "Size risk before planning the trade.",
          help_text: "Use max loss to constrain the plan instead of letting sizing drift.",
        },
      ],
    },
    create: {
      id: ids.earningsTemplate,
      name: "Earnings Event Review",
      templateType: "earnings",
      version: 1,
      checklistItemsJson: [
        {
          id: "guidance-path",
          label: "Document the likely guidance path.",
          help_text: "Capture the expected management tone and the scenario that would invalidate it.",
        },
        {
          id: "risk-line",
          label: "Write the invalidation line before the event.",
          help_text: "State what would make the setup wrong instead of reacting after the print.",
        },
        {
          id: "position-plan",
          label: "Size risk before planning the trade.",
          help_text: "Use max loss to constrain the plan instead of letting sizing drift.",
        },
      ],
    },
  });

  await prisma.template.upsert({
    where: { id: ids.macroTemplate },
    update: {
      name: "Macro Catalyst Checklist",
      templateType: "macro",
      version: 1,
      checklistItemsJson: [
        {
          id: "consensus-range",
          label: "Record the consensus range.",
          help_text: "Write the market expectation and the surprise threshold that matters.",
        },
        {
          id: "linked-ticker",
          label: "Tie the catalyst to the watched ticker.",
          help_text: "Explain why this macro release matters to the instrument you want to study.",
        },
        {
          id: "fallback-plan",
          label: "Write the no-trade fallback.",
          help_text: "State the conditions under which you will not plan a paper trade at all.",
        },
      ],
    },
    create: {
      id: ids.macroTemplate,
      name: "Macro Catalyst Checklist",
      templateType: "macro",
      version: 1,
      checklistItemsJson: [
        {
          id: "consensus-range",
          label: "Record the consensus range.",
          help_text: "Write the market expectation and the surprise threshold that matters.",
        },
        {
          id: "linked-ticker",
          label: "Tie the catalyst to the watched ticker.",
          help_text: "Explain why this macro release matters to the instrument you want to study.",
        },
        {
          id: "fallback-plan",
          label: "Write the no-trade fallback.",
          help_text: "State the conditions under which you will not plan a paper trade at all.",
        },
      ],
    },
  });

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
