-- Repair older installations where the persisted activity migration was only partially applied.
-- Every statement is idempotent so this remains safe when the original migrations succeeded.
CREATE TABLE IF NOT EXISTS "UserDailyActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "webOpened" BOOLEAN NOT NULL DEFAULT false,
    "campaignPlayed" BOOLEAN NOT NULL DEFAULT false,
    "verifiedServerJoined" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserDailyActivity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserDailyActivity"
  ADD COLUMN IF NOT EXISTS "webOpened" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "campaignPlayed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verifiedServerJoined" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "UserDailyActivity_userId_activityDate_key"
  ON "UserDailyActivity"("userId", "activityDate");
CREATE INDEX IF NOT EXISTS "UserDailyActivity_userId_activityDate_idx"
  ON "UserDailyActivity"("userId", "activityDate");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserDailyActivity_userId_fkey'
  ) THEN
    ALTER TABLE "UserDailyActivity"
      ADD CONSTRAINT "UserDailyActivity_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
