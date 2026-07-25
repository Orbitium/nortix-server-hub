CREATE TABLE "UserDailyActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "webOpened" BOOLEAN NOT NULL DEFAULT false,
    "campaignPlayed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserDailyActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserDailyActivity_userId_activityDate_key" ON "UserDailyActivity"("userId", "activityDate");
CREATE INDEX "UserDailyActivity_userId_activityDate_idx" ON "UserDailyActivity"("userId", "activityDate");
ALTER TABLE "UserDailyActivity" ADD CONSTRAINT "UserDailyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
