CREATE TABLE "ReferralInvite" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "inviteeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "qualifiedAt" TIMESTAMP(3),

  CONSTRAINT "ReferralInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralInvite_code_key" ON "ReferralInvite"("code");
CREATE UNIQUE INDEX "ReferralInvite_inviteeId_key" ON "ReferralInvite"("inviteeId");
CREATE INDEX "ReferralInvite_inviterId_createdAt_idx" ON "ReferralInvite"("inviterId", "createdAt");
CREATE INDEX "ReferralInvite_inviteeId_qualifiedAt_idx" ON "ReferralInvite"("inviteeId", "qualifiedAt");

ALTER TABLE "ReferralInvite"
ADD CONSTRAINT "ReferralInvite_inviterId_fkey"
FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralInvite"
ADD CONSTRAINT "ReferralInvite_inviteeId_fkey"
FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReferralInvite"
ADD CONSTRAINT "ReferralInvite_claim_state_check"
CHECK (
  ("inviteeId" IS NULL AND "claimedAt" IS NULL AND "qualifiedAt" IS NULL)
  OR ("inviteeId" IS NOT NULL AND "claimedAt" IS NOT NULL)
);

ALTER TABLE "ReferralInvite"
ADD CONSTRAINT "ReferralInvite_qualification_state_check"
CHECK ("qualifiedAt" IS NULL OR "claimedAt" IS NOT NULL);
