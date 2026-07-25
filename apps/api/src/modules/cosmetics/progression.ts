import type { Prisma } from "@nortix/database";

export const VERIFIED_MILESTONE_XP = 100;

export const testerExperienceForLevel = (level: number) => {
  const normalizedLevel = Math.max(1, Math.floor(level));
  return 500 * normalizedLevel * (normalizedLevel - 1);
};

export const testerLevelForExperience = (experience: number) => {
  const normalizedExperience = Math.max(0, Math.floor(experience));
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * normalizedExperience) / 1_000)) / 2));
};

export const addVerifiedTesterExperience = async (
  tx: Prisma.TransactionClient,
  userId: string,
  completionId: string,
) => {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { testerExperience: true, testerLevel: true },
  });
  const testerExperience = user.testerExperience + VERIFIED_MILESTONE_XP;
  const testerLevel = Math.max(user.testerLevel, testerLevelForExperience(testerExperience));
  await tx.user.update({
    where: { id: userId },
    data: { testerExperience, testerLevel },
  });
  if (testerLevel > user.testerLevel) {
    await tx.auditLog.create({
      data: {
        action: "PLAYER_LEVEL_INCREASED",
        entityType: "USER",
        entityId: userId,
        beforeSnapshot: {
          testerLevel: user.testerLevel,
          testerExperience: user.testerExperience,
        },
        afterSnapshot: { testerLevel, testerExperience },
        reason: `Verified milestone completion ${completionId}`,
      },
    });
  }
  return { testerExperience, testerLevel, leveledUp: testerLevel > user.testerLevel };
};
