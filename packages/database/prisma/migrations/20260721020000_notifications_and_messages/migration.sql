-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('CAMPAIGN', 'QUEST', 'SPARKS', 'SERVER', 'TEAM', 'SECURITY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AdminMessageAudience" AS ENUM ('ALL_USERS', 'PLAYERS', 'SERVER_OWNERS', 'LIMITED_ACCOUNTS', 'USER');

-- CreateEnum
CREATE TYPE "AdminMessageSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AdminMessageStatus" AS ENUM ('DRAFT', 'SENT');

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignActivity" BOOLEAN NOT NULL DEFAULT true,
    "questsAndStreaks" BOOLEAN NOT NULL DEFAULT true,
    "sparksActivity" BOOLEAN NOT NULL DEFAULT true,
    "serverOperations" BOOLEAN NOT NULL DEFAULT true,
    "teamActivity" BOOLEAN NOT NULL DEFAULT true,
    "productUpdates" BOOLEAN NOT NULL DEFAULT true,
    "emailProductUpdates" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionUrl" TEXT,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminMessage" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "targetUserId" TEXT,
    "audience" "AdminMessageAudience" NOT NULL,
    "severity" "AdminMessageSeverity" NOT NULL DEFAULT 'INFO',
    "status" "AdminMessageStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminMessageDelivery" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminMessageDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
CREATE UNIQUE INDEX "Notification_recipientId_dedupeKey_key" ON "Notification"("recipientId", "dedupeKey");
CREATE INDEX "Notification_recipientId_archivedAt_createdAt_idx" ON "Notification"("recipientId", "archivedAt", "createdAt");
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");
CREATE INDEX "AdminMessage_status_createdAt_idx" ON "AdminMessage"("status", "createdAt");
CREATE INDEX "AdminMessage_createdById_createdAt_idx" ON "AdminMessage"("createdById", "createdAt");
CREATE UNIQUE INDEX "AdminMessageDelivery_messageId_recipientId_key" ON "AdminMessageDelivery"("messageId", "recipientId");
CREATE INDEX "AdminMessageDelivery_recipientId_archivedAt_deliveredAt_idx" ON "AdminMessageDelivery"("recipientId", "archivedAt", "deliveredAt");
CREATE INDEX "AdminMessageDelivery_recipientId_readAt_deliveredAt_idx" ON "AdminMessageDelivery"("recipientId", "readAt", "deliveredAt");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminMessage" ADD CONSTRAINT "AdminMessage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminMessage" ADD CONSTRAINT "AdminMessage_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminMessageDelivery" ADD CONSTRAINT "AdminMessageDelivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AdminMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminMessageDelivery" ADD CONSTRAINT "AdminMessageDelivery_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
