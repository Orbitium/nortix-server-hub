CREATE TYPE "VerificationScope" AS ENUM ('SERVER', 'PROXY_NETWORK', 'PROXY_CHILD');

ALTER TABLE "Server"
ADD COLUMN "verificationScope" "VerificationScope" NOT NULL DEFAULT 'SERVER',
ADD COLUMN "verificationParentId" TEXT;

CREATE INDEX "Server_verificationParentId_idx" ON "Server"("verificationParentId");

ALTER TABLE "Server"
ADD CONSTRAINT "Server_verificationParentId_fkey"
FOREIGN KEY ("verificationParentId") REFERENCES "Server"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
