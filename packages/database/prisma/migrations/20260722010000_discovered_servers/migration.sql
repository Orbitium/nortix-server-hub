CREATE TABLE "DiscoveredServer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "edition" "ServerEdition" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "playerCount" INTEGER,
    "maxPlayers" INTEGER,
    "version" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "lastOnlineAt" TIMESTAMP(3),
    "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveredServer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscoveredServer_slug_key" ON "DiscoveredServer"("slug");
CREATE UNIQUE INDEX "DiscoveredServer_edition_hostname_port_key"
ON "DiscoveredServer"("edition", "hostname", "port");
CREATE INDEX "DiscoveredServer_enabled_nextCheckAt_idx"
ON "DiscoveredServer"("enabled", "nextCheckAt");
CREATE INDEX "DiscoveredServer_online_playerCount_idx"
ON "DiscoveredServer"("online", "playerCount");

WITH seed("ordinal", "slug", "displayName", "hostname", "port", "edition") AS (
  VALUES
    (0, 'public-lilacmc', 'LilacMC', 'epic.lilacmc.net', 25565, 'JAVA'::"ServerEdition"),
    (1, 'public-hypixel', 'Hypixel', 'mc.hypixel.net', 25565, 'JAVA'::"ServerEdition"),
    (2, 'public-donutsmp', 'DonutSMP', 'play.donutsmp.net', 25565, 'JAVA'::"ServerEdition"),
    (3, 'public-minehut', 'Minehut', 'play.minehut.com', 25565, 'JAVA'::"ServerEdition"),
    (4, 'public-pikanetwork', 'PikaNetwork', 'mc.pika-network.net', 25565, 'JAVA'::"ServerEdition"),
    (5, 'public-craftrise', 'CraftRise', 'play.craftrise.com', 25565, 'JAVA'::"ServerEdition"),
    (6, 'public-cubecraft-java', 'CubeCraft Java', 'play.cubecraft.net', 25565, 'JAVA'::"ServerEdition"),
    (7, 'public-talonmc', 'TalonMC', 'play.talonmc.net', 25565, 'JAVA'::"ServerEdition"),
    (8, 'public-gommehd', 'GommeHD', 'play.gommehd.net', 25565, 'JAVA'::"ServerEdition"),
    (9, 'public-jartexnetwork', 'JartexNetwork', 'play.jartexnetwork.com', 25565, 'JAVA'::"ServerEdition"),
    (10, 'public-2b2t', '2b2t', '2b2t.org', 25565, 'JAVA'::"ServerEdition"),
    (11, 'public-purple-prison', 'Purple Prison', 'play.purpleprison.net', 25565, 'JAVA'::"ServerEdition"),
    (12, 'public-cobblemon', 'Cobblemon', 'play.cobblemon.gg', 25565, 'JAVA'::"ServerEdition"),
    (13, 'public-mineplex', 'Mineplex', 'play.mineplex.com', 25565, 'JAVA'::"ServerEdition"),
    (14, 'public-blossomcraft', 'BlossomCraft', 'play.blossomcraft.org', 25565, 'JAVA'::"ServerEdition"),
    (15, 'public-mc4fun', 'MC4FUN', 'play.mc4fun.net', 25565, 'JAVA'::"ServerEdition"),
    (16, 'public-applemc', 'AppleMC', 'play.applemc.net', 25565, 'JAVA'::"ServerEdition"),
    (17, 'public-mineland', 'Mineland', 'play.mineland.net', 25565, 'JAVA'::"ServerEdition"),
    (18, 'public-6b6t', '6b6t', 'join.6b6t.org', 25565, 'JAVA'::"ServerEdition"),
    (19, 'public-twenture', 'Twenture', 'msl.twenture.net', 25565, 'JAVA'::"ServerEdition"),
    (20, 'public-trappedmc', 'TrappedMC', 'neo.trappedmc.com', 25565, 'JAVA'::"ServerEdition"),
    (21, 'public-forgottensmp', 'ForgottenSMP', 'play.forgottensmp.net', 25565, 'JAVA'::"ServerEdition"),
    (22, 'public-pixelmon-legends', 'Pixelmon Legends', 'mc.pixelmon-legends.com', 25565, 'JAVA'::"ServerEdition"),
    (23, 'public-foxcraft', 'Foxcraft', 'mc.foxcraft.net', 25565, 'JAVA'::"ServerEdition"),
    (24, 'public-invadedlands', 'InvadedLands', 'play.invadedlands.net', 25565, 'JAVA'::"ServerEdition"),
    (25, 'public-anchor-mc', 'AnchorMC', 'play.theanchormc.net', 25565, 'JAVA'::"ServerEdition"),
    (26, 'public-noorlandmc', 'NoorlandMC', 'play.noorlandmc.com', 25565, 'JAVA'::"ServerEdition"),
    (27, 'public-woodeycraft', 'WoodeyCraft', 'mc.woodey79.com', 25565, 'JAVA'::"ServerEdition"),
    (28, 'public-lyramc', 'LyraMC', 'top.lyramc.net', 25565, 'JAVA'::"ServerEdition"),
    (29, 'public-pixelmon-cosmos', 'Pixelmon Cosmos', 'cosmos.mobcraft.org', 25565, 'JAVA'::"ServerEdition"),
    (30, 'public-swiftservers', 'SwiftServers', 'play.swiftservers.org', 25565, 'JAVA'::"ServerEdition"),
    (31, 'public-oriamc', 'OriaMC', 'play.oriamc.com', 25565, 'JAVA'::"ServerEdition"),
    (32, 'public-boredommc', 'BoredomMC', 'play.boredommc.com', 25565, 'JAVA'::"ServerEdition"),
    (33, 'public-minelanders', 'Minelanders', 'mc.minelanders.com', 25565, 'JAVA'::"ServerEdition"),
    (34, 'public-rezzcraft', 'RezzCraft', 'mc.rezzcraft.us', 25565, 'JAVA'::"ServerEdition"),
    (35, 'public-zenpvp', 'ZenPvP', 'play.zenpvp.net', 25565, 'JAVA'::"ServerEdition"),
    (36, 'public-mythicmc', 'MythicMC', 'play.mythicmc.net', 25565, 'JAVA'::"ServerEdition"),
    (37, 'public-aspiriamc', 'AspiriaMC', 'play.aspiriamc.com', 25565, 'JAVA'::"ServerEdition"),
    (38, 'public-purity-vanilla', 'Purity Vanilla', 'mc.purityvanilla.com', 25565, 'JAVA'::"ServerEdition"),
    (39, 'public-cozymc', 'CozyMC', 'mc.cozymc.com', 25565, 'JAVA'::"ServerEdition"),
    (40, 'public-raid-farms', 'Raid Farms', 'mc.raidfarms.com', 25565, 'JAVA'::"ServerEdition"),
    (41, 'public-hill-smp', 'Hill SMP', 'mcsl.hillsmp.fun', 25565, 'JAVA'::"ServerEdition"),
    (42, 'public-kabucraft', 'KabuCraft', 'mc.kabucraft.net', 25565, 'JAVA'::"ServerEdition"),
    (43, 'public-atlasmc', 'AtlasMC', 'play.theatlasmc.net', 25565, 'JAVA'::"ServerEdition"),
    (44, 'public-prismacraft', 'PrismaCraft', 'play.prismacraft.net', 25565, 'JAVA'::"ServerEdition"),
    (45, 'public-hive-bedrock', 'The Hive Bedrock', 'geo.hivebedrock.network', 19132, 'BEDROCK'::"ServerEdition"),
    (46, 'public-nethergames-bedrock', 'NetherGames Bedrock', 'play.nethergames.org', 19132, 'BEDROCK'::"ServerEdition"),
    (47, 'public-galaxite-bedrock', 'Galaxite Bedrock', 'play.galaxite.net', 19132, 'BEDROCK'::"ServerEdition"),
    (48, 'public-lifeboat-bedrock', 'Lifeboat Bedrock', 'mco.lbsg.net', 19132, 'BEDROCK'::"ServerEdition"),
    (49, 'public-cubecraft-bedrock', 'CubeCraft Bedrock', 'play.cubecraft.net', 19132, 'BEDROCK'::"ServerEdition")
)
INSERT INTO "DiscoveredServer" (
  "id", "slug", "displayName", "hostname", "port", "edition",
  "enabled", "nextCheckAt", "createdAt", "updatedAt"
)
SELECT
  'discovery-' || "slug",
  "slug",
  "displayName",
  "hostname",
  "port",
  "edition",
  true,
  CURRENT_TIMESTAMP + ("ordinal" * INTERVAL '12 seconds'),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM seed
ON CONFLICT ("edition", "hostname", "port") DO NOTHING;
