CREATE TYPE "ServerTeamRole" AS ENUM ('ADMIN', 'MANAGER', 'OPERATOR', 'ANALYST');
CREATE TYPE "TeamInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

CREATE TABLE "ServerTeamMember" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ServerTeamRole" NOT NULL,
  "invitedById" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServerTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServerTeamInvite" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "inviteeId" TEXT NOT NULL,
  "role" "ServerTeamRole" NOT NULL,
  "status" "TeamInviteStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServerTeamInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServerTeamMember_serverId_userId_key" ON "ServerTeamMember"("serverId", "userId");
CREATE INDEX "ServerTeamMember_userId_idx" ON "ServerTeamMember"("userId");
CREATE INDEX "ServerTeamInvite_inviteeId_status_createdAt_idx" ON "ServerTeamInvite"("inviteeId", "status", "createdAt");
CREATE INDEX "ServerTeamInvite_serverId_status_idx" ON "ServerTeamInvite"("serverId", "status");

ALTER TABLE "ServerTeamMember" ADD CONSTRAINT "ServerTeamMember_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServerTeamMember" ADD CONSTRAINT "ServerTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServerTeamMember" ADD CONSTRAINT "ServerTeamMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerTeamInvite" ADD CONSTRAINT "ServerTeamInvite_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServerTeamInvite" ADD CONSTRAINT "ServerTeamInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerTeamInvite" ADD CONSTRAINT "ServerTeamInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
