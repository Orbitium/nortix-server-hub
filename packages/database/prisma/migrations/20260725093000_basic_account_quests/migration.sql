UPDATE "DailyQuest" SET "active" = false;

INSERT INTO "DailyQuest" ("id", "slug", "title", "description", "type", "target", "sparksReward", "active") VALUES
  ('quest-create-account', 'create-account', 'Create an account', 'Create a Nortix account to start earning Sparks.', 'ACCOUNT_CREATED', 1, 25, true),
  ('quest-link-minecraft-account', 'link-minecraft-account', 'Link a Minecraft account', 'Link either a premium Minecraft account or a cracked server account.', 'MINECRAFT_ACCOUNT_LINKED', 1, 20, true),
  ('quest-complete-campaign', 'complete-campaign', 'Complete a campaign', 'Complete the requirements of one Nortix campaign.', 'CAMPAIGN_COMPLETED', 1, 15, true),
  ('quest-vote-for-server', 'vote-for-server', 'Vote for a server', 'Cast your vote for a Minecraft server on Nortix.', 'SERVER_VOTED', 1, 10, true),
  ('quest-join-verified-server', 'join-verified-server', 'Join a Nortix-verified server', 'Join a campaign hosted by a Nortix-verified server.', 'VERIFIED_SERVER_JOINED', 1, 5, true),
  ('quest-join-nortix-discord', 'join-nortix-discord', 'Join the Nortix Discord', 'Join the official Nortix Discord community.', 'DISCORD_JOIN', 1, 15, true),
  ('quest-seven-day-login-streak', 'seven-day-login-streak', 'Maintain a 7-day login streak', 'Log in to Nortix on seven consecutive days.', 'LOGIN_STREAK', 7, 20, true),
  ('quest-purchase-sparks-shop-item', 'purchase-sparks-shop-item', 'Purchase an item from the Sparks Shop', 'Use Sparks to purchase an item from the Sparks Shop.', 'SPARKS_SHOP_PURCHASED', 1, 25, true),
  ('quest-invite-a-friend', 'invite-a-friend', 'Invite a friend', 'Invite a friend who registers and earns at least 200 Sparks.', 'FRIEND_REFERRAL', 1, 50, true),
  ('quest-write-server-review', 'write-server-review', 'Write a server review', 'Write a helpful review about a server you have played.', 'SERVER_REVIEW_WRITTEN', 1, 20, true);
