CREATE TABLE "AdminEnrollmentToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "consumedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminEnrollmentToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminEnrollmentToken_tokenHash_key"
ON "AdminEnrollmentToken"("tokenHash");

CREATE INDEX "AdminEnrollmentToken_expiresAt_consumedAt_idx"
ON "AdminEnrollmentToken"("expiresAt", "consumedAt");

CREATE INDEX "AdminEnrollmentToken_consumedById_idx"
ON "AdminEnrollmentToken"("consumedById");

ALTER TABLE "AdminEnrollmentToken"
ADD CONSTRAINT "AdminEnrollmentToken_consumedById_fkey"
FOREIGN KEY ("consumedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
