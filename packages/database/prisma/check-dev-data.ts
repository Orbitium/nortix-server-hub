import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const [users, servers, campaigns, quests, activitySamples, seedMarker] = await prisma.$transaction([
    prisma.user.count(),
    prisma.server.count(),
    prisma.campaign.count(),
    prisma.dailyQuest.count(),
    prisma.serverActivitySample.count(),
    prisma.auditLog.count({ where: { action: "SEED_ENVIRONMENT_CREATED" } }),
  ]);

  if (
    (users === 0 && servers === 0 && campaigns === 0 && quests === 0) ||
    (seedMarker > 0 && activitySamples === 0)
  ) {
    console.info("[dev:full] Database schema is empty; seed data is required.");
    process.exitCode = 10;
  } else {
    console.info(
      `[dev:full] Database ready: ${users} users, ${servers} servers, ${campaigns} campaigns, ${quests} quests, ${activitySamples} activity samples.`,
    );
  }
} finally {
  await prisma.$disconnect();
}
