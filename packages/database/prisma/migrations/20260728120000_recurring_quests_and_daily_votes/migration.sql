ALTER TABLE "ServerVote" ADD COLUMN "voteDate" TIMESTAMP(3);

UPDATE "ServerVote"
SET "voteDate" = date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

ALTER TABLE "ServerVote" ALTER COLUMN "voteDate" SET NOT NULL;
DROP INDEX "ServerVote_serverId_playerId_key";
CREATE UNIQUE INDEX "ServerVote_serverId_playerId_voteDate_key"
  ON "ServerVote"("serverId", "playerId", "voteDate");
CREATE INDEX "ServerVote_playerId_voteDate_idx" ON "ServerVote"("playerId", "voteDate");

ALTER TABLE "DailyQuest" ADD COLUMN "cadence" TEXT NOT NULL DEFAULT 'ONCE';
ALTER TABLE "UserDailyActivity"
  ADD COLUMN "verifiedServerJoined" BOOLEAN NOT NULL DEFAULT false;

UPDATE "DailyQuest"
SET
  "cadence" = 'DAILY',
  "sparksReward" = 5,
  "description" = CASE "type"
    WHEN 'CAMPAIGN_COMPLETED' THEN 'Complete one Nortix campaign today. Backend verification is required.'
    WHEN 'SERVER_VOTED' THEN 'Vote for one eligible Nortix-verified server today.'
    WHEN 'VERIFIED_SERVER_JOINED' THEN 'Log in to a Nortix-verified server with its connected plugin running.'
    ELSE "description"
  END
WHERE "type" IN ('CAMPAIGN_COMPLETED', 'SERVER_VOTED', 'VERIFIED_SERVER_JOINED');

INSERT INTO "CosmeticItem"
  ("id", "slug", "name", "description", "type", "unlockMethod", "requiredLevel", "sparksPrice", "rarity", "preview", "sortOrder", "available", "createdAt")
VALUES
  ('cosmetic-avatar-sprout', 'sprout-avatar', 'Sprout Scout', 'A cheerful pixel sprout avatar.', 'AVATAR', 'SPARKS', NULL, 25, 'COMMON', '{"primary":"#173b2a","accent":"#8df06d","icon":"sprout","pattern":"plain"}', 30, true, CURRENT_TIMESTAMP),
  ('cosmetic-avatar-slime', 'slime-avatar', 'Nortix Slime', 'A bouncy cube-shaped profile companion.', 'AVATAR', 'SPARKS', NULL, 40, 'UNCOMMON', '{"primary":"#143e3a","accent":"#42e8bd","icon":"slime","pattern":"grid"}', 40, true, CURRENT_TIMESTAMP),
  ('cosmetic-banner-sunrise', 'block-sunrise-banner', 'Block Sunrise', 'A warm block-built horizon.', 'BANNER', 'SPARKS', NULL, 35, 'COMMON', '{"primary":"#3b2347","accent":"#ffb45f","icon":"sunrise","pattern":"mountains"}', 40, true, CURRENT_TIMESTAMP),
  ('cosmetic-banner-river', 'pixel-river-banner', 'Pixel River', 'A cool winding river scene.', 'BANNER', 'SPARKS', NULL, 50, 'UNCOMMON', '{"primary":"#15344f","accent":"#61d8ff","icon":"river","pattern":"waves"}', 50, true, CURRENT_TIMESTAMP),
  ('cosmetic-badge-pickaxe', 'pickaxe-badge', 'Trail Miner', 'A small crossed-pickaxe badge.', 'BADGE', 'SPARKS', NULL, 25, 'COMMON', '{"primary":"#352b24","accent":"#e6b86a","icon":"pickaxe","pattern":"plain"}', 50, true, CURRENT_TIMESTAMP),
  ('cosmetic-badge-heart', 'pixel-heart-badge', 'Good Heart', 'A bright pixel heart for helpful testers.', 'BADGE', 'SPARKS', NULL, 45, 'UNCOMMON', '{"primary":"#421f32","accent":"#ff719a","icon":"pixel-heart","pattern":"plain"}', 60, true, CURRENT_TIMESTAMP),
  ('cosmetic-title-builder', 'block-builder-title', 'Block Builder', 'A practical title for creative players.', 'TITLE', 'SPARKS', NULL, 30, 'COMMON', '{"primary":"#2e3324","accent":"#bad86b","icon":"block","pattern":"plain"}', 30, true, CURRENT_TIMESTAMP),
  ('cosmetic-title-voyager', 'nether-voyager-title', 'Nether Voyager', 'A fiery title for fearless explorers.', 'TITLE', 'SPARKS', NULL, 60, 'RARE', '{"primary":"#431e1e","accent":"#ff8159","icon":"portal","pattern":"plain"}', 40, true, CURRENT_TIMESTAMP),
  ('cosmetic-theme-meadow', 'meadow-theme', 'Meadow', 'A soft grass-and-sky profile palette.', 'THEME', 'SPARKS', NULL, 50, 'UNCOMMON', '{"primary":"#17382e","accent":"#98e66e","icon":"meadow","pattern":"aurora"}', 20, true, CURRENT_TIMESTAMP),
  ('cosmetic-theme-redstone', 'redstone-theme', 'Redstone Lab', 'A dark technical theme with redstone signals.', 'THEME', 'SPARKS', NULL, 75, 'RARE', '{"primary":"#2f2025","accent":"#ff5b61","icon":"redstone","pattern":"grid"}', 30, true, CURRENT_TIMESTAMP);
