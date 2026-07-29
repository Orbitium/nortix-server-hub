import { prisma } from "@nortix/database";
import {
  ADMIN_ENROLLMENT_TOKEN_TTL_MS,
  generateAdminEnrollmentToken,
  hashAdminEnrollmentToken,
} from "../modules/admin-enrollment/token.js";

const run = async () => {
  const token = generateAdminEnrollmentToken();
  const expiresAt = new Date(Date.now() + ADMIN_ENROLLMENT_TOKEN_TTL_MS);

  await prisma.$transaction(async (tx) => {
    const record = await tx.adminEnrollmentToken.create({
      data: {
        tokenHash: hashAdminEnrollmentToken(token),
        expiresAt,
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: {
        action: "admin.enrollment_token_created",
        entityType: "AdminEnrollmentToken",
        entityId: record.id,
        reason: "Generated from the API container operator command.",
        afterSnapshot: { expiresAt: expiresAt.toISOString() },
      },
    });
  });

  process.stdout.write(
    [
      "Nortix admin enrollment token (shown once):",
      token,
      `Expires: ${expiresAt.toISOString()}`,
      "The recipient must sign in normally, then redeem it at /admin/enroll.",
      "",
    ].join("\n"),
  );
};

try {
  await run();
} catch (error) {
  process.stderr.write(
    `Could not create an admin enrollment token: ${
      error instanceof Error ? error.message : "unknown error"
    }\n`,
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
