import {
  AnalyticsSource,
  CampaignStatus,
  CompletionStatus,
  CosmeticType,
  CosmeticUnlockMethod,
  EarningsTransactionType,
  LedgerDirection,
  ModerationStatus,
  ParticipationStatus,
  PrismaClient,
  ServerEdition,
  SparksTransactionType,
  UserRole,
  type User,
  VerificationStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const serverBlueprints = [
  [
    "Skyblock X",
    "skyblock-x",
    "Build a floating empire with evolving islands, co-op challenges, and a friendly economy.",
    "JAVA",
    ["1.20.4", "1.21"],
    ["Skyblock", "Economy"],
    1842,
  ],
  [
    "PrisonCraft",
    "prisoncraft",
    "A progression-first prison experience with fair ranks, deep mines, and team events.",
    "JAVA",
    ["1.20.4"],
    ["Prison", "Economy"],
    934,
  ],
  [
    "Lifesteal SMP",
    "lifesteal-smp",
    "A seasonal survival world where every alliance and encounter changes your story.",
    "JAVA",
    ["1.21"],
    ["SMP", "PvP"],
    1260,
  ],
  [
    "Factions Legacy",
    "factions-legacy",
    "Classic factions strategy rebuilt with modern combat, seasons, and transparent rules.",
    "JAVA",
    ["1.20.4"],
    ["Factions", "PvP"],
    719,
  ],
  [
    "Arcane Realms",
    "arcane-realms",
    "A handcrafted fantasy RPG server with spell schools, quest lines, and raid bosses.",
    "JAVA",
    ["1.20.1"],
    ["RPG", "Adventure"],
    581,
  ],
  [
    "Bedwars Classic",
    "bedwars-classic",
    "Fast, competitive Bedwars with readable upgrades, balanced maps, and ranked queues.",
    "JAVA",
    ["1.8.9", "1.21"],
    ["Minigames", "PvP"],
    2150,
  ],
  [
    "OneBlock Journey",
    "oneblock-journey",
    "Grow one block into a thriving world through guided chapters and weekly co-op goals.",
    "BEDROCK",
    ["1.21"],
    ["OneBlock", "Co-op"],
    443,
  ],
  [
    "Vanilla Frontier",
    "vanilla-frontier",
    "Community-focused vanilla survival with land claims, expeditions, and no pay-to-win.",
    "JAVA",
    ["1.21"],
    ["Survival", "Vanilla"],
    1084,
  ],
  [
    "Copper Kingdoms",
    "copper-kingdoms",
    "Build a kingdom, negotiate trade routes, and defend your borders in a persistent world.",
    "JAVA",
    ["1.20.4"],
    ["Towny", "Strategy"],
    322,
  ],
  [
    "Redstone Labs",
    "redstone-labs",
    "A collaborative technical server for ambitious farms, contraptions, and engineering.",
    "JAVA",
    ["1.21"],
    ["Technical", "Creative"],
    206,
  ],
  [
    "Ember Isles",
    "ember-isles",
    "Explore volcanic islands, discover relics, and master compact dungeon encounters.",
    "BEDROCK",
    ["1.21"],
    ["Adventure", "Dungeons"],
    378,
  ],
  [
    "CozyCraft",
    "cozycraft",
    "A calm social survival server centered on building, collecting, and community events.",
    "JAVA",
    ["1.20.4", "1.21"],
    ["Survival", "Community"],
    662,
  ],
] as const;

const milestoneTemplates = [
  ["JOIN_SERVER", "Join server", 5, 25, 100, 15, false, ["MANUAL", "SERVER_PLUGIN", "CLIENT_MOD"]],
  [
    "ACTIVE_DURATION",
    "Remain actively connected",
    30,
    50,
    500,
    45,
    false,
    ["SERVER_PLUGIN", "CLIENT_MOD"],
  ],
  ["COMPLETE_TUTORIAL", "Complete tutorial", 20, 50, 400, 25, false, ["MANUAL", "SERVER_PLUGIN"]],
  ["REACH_LEVEL", "Reach configured level", 60, 100, 1000, 40, false, ["SERVER_PLUGIN", "MANUAL"]],
  ["REACH_REGION", "Reach configured region", 25, 50, 300, 30, false, ["SERVER_PLUGIN", "MANUAL"]],
  [
    "EARN_ACHIEVEMENT",
    "Earn configured achievement",
    45,
    75,
    750,
    35,
    false,
    ["SERVER_PLUGIN", "MANUAL"],
  ],
  ["DEFEAT_BOSS", "Defeat configured boss", 90, 150, 1500, 45, false, ["SERVER_PLUGIN", "MANUAL"]],
  [
    "COMPLETE_QUEST",
    "Complete configured quest",
    60,
    100,
    1000,
    35,
    false,
    ["SERVER_PLUGIN", "MANUAL"],
  ],
  [
    "RETURN_ANOTHER_DAY",
    "Return on another day",
    10,
    100,
    500,
    30,
    false,
    ["SERVER_PLUGIN", "MANUAL"],
  ],
  ["SUBMIT_FEEDBACK", "Submit structured feedback", 10, 50, 400, 20, true, ["WEB_EVENT"]],
  ["SUBMIT_BUG_REPORT", "Submit bug report", 15, 50, 500, 35, true, ["WEB_EVENT"]],
  ["JOIN_COMMUNITY", "Join optional community channel", 5, 0, 100, 55, true, ["MANUAL", "API"]],
  ["CUSTOM_MANUAL", "Custom manually reviewed milestone", 30, 0, 1000, 80, true, ["MANUAL"]],
] as const;

async function main() {
  await prisma.$transaction([
    prisma.adminMessageDelivery.deleteMany(),
    prisma.adminMessage.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.badgeAward.deleteMany(),
    prisma.badge.deleteMany(),
    prisma.userQuest.deleteMany(),
    prisma.dailyQuest.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.moderationCase.deleteMany(),
    prisma.fraudFlag.deleteMany(),
    prisma.paymentEvent.deleteMany(),
    prisma.integrationApiKey.deleteMany(),
    prisma.analyticsEvent.deleteMany(),
    prisma.equippedCosmetic.deleteMany(),
    prisma.cosmeticPurchase.deleteMany(),
    prisma.cosmeticItem.deleteMany(),
    prisma.feedbackResponse.deleteMany(),
    prisma.milestoneCompletion.deleteMany(),
    prisma.campaignParticipation.deleteMany(),
    prisma.campaignMilestone.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.milestoneTemplate.deleteMany(),
    prisma.review.deleteMany(),
    prisma.serverVerification.deleteMany(),
    prisma.server.deleteMany(),
    prisma.minecraftIdentity.deleteMany(),
    prisma.withdrawalRequest.deleteMany(),
    prisma.earningsLedgerEntry.deleteMany(),
    prisma.sparksLedgerEntry.deleteMany(),
    prisma.campaignCreditLedgerEntry.deleteMany(),
    prisma.featureFlag.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const users: User[] = [];
  for (let index = 0; index < 20; index += 1) {
    const number = index + 1;
    const isOwner = index < 4;
    const isModerator = index === 17 || index === 18;
    const isAdmin = index === 19;
    const roles: UserRole[] = [
      UserRole.PLAYER,
      ...(isOwner ? [UserRole.SERVER_OWNER] : []),
      ...(isModerator ? [UserRole.MODERATOR] : []),
      ...(isAdmin ? [UserRole.ADMIN] : []),
    ];
    users.push(
      await prisma.user.create({
        data: {
          firebaseUid: `seed-firebase-${number}`,
          username: isAdmin
            ? "nortixadmin"
            : isModerator
              ? `moderator${number - 17}`
              : isOwner
                ? `owner${number}`
                : `tester${number}`,
          displayName: isAdmin
            ? "Nortix Admin"
            : isModerator
              ? `Moderator ${number - 17}`
              : isOwner
                ? `Server Owner ${number}`
                : `Tester ${number}`,
          email: `user${number}@example.test`,
          roles,
          countryCode: ["US", "GB", "DE", "TR", "CA"][index % 5]!,
          reputationScore: Math.max(12, 940 - index * 37),
          reputationTier:
            index < 3
              ? "Elite Tester"
              : index < 8
                ? "Veteran Tester"
                : index < 14
                  ? "Trusted Tester"
                  : "Verified Tester",
          testerLevel: Math.max(2, 24 - index),
          testerExperience: 500 * Math.max(2, 24 - index) * (Math.max(2, 24 - index) - 1),
          sparksBalanceCache: 12430 - index * 310,
          earningsBalanceCache: Math.max(0, 4820 - index * 175),
          pendingEarningsCache: 460,
          publicProfile: {
            showBadges: true,
            showCampaignHistory: index % 3 !== 0,
            theme: "obsidian",
          },
        },
      }),
    );
  }

  await prisma.notificationPreference.createMany({
    data: users.map((user) => ({ userId: user.id })),
  });
  await prisma.notification.createMany({
    data: [
      {
        recipientId: users[4]!.id,
        category: "CAMPAIGN",
        title: "A campaign matches your profile",
        body: "Skyblock X has a new first-session playtest with automatic milestone verification.",
        actionUrl: "/campaigns",
        dedupeKey: "seed:campaign-match",
        createdAt: new Date(Date.now() - 25 * 60_000),
      },
      {
        recipientId: users[4]!.id,
        category: "QUEST",
        title: "Daily quest progress updated",
        body: "Your persisted quest progress is ready to review.",
        actionUrl: "/dashboard/quests",
        dedupeKey: "seed:quest-progress",
        readAt: new Date(Date.now() - 50 * 60_000),
        createdAt: new Date(Date.now() - 2 * 60 * 60_000),
      },
      {
        recipientId: users[0]!.id,
        category: "SERVER",
        title: "Plugin connection is healthy",
        body: "Skyblock X reported its latest activity sample successfully.",
        actionUrl: "/owner/integrations",
        dedupeKey: "seed:plugin-health",
      },
    ],
  });
  await prisma.adminMessage.create({
    data: {
      createdById: users[19]!.id,
      audience: "ALL_USERS",
      severity: "INFO",
      status: "SENT",
      title: "Welcome to the Nortix inbox",
      body: "Important platform updates and account-specific notices now appear here with persistent read status.",
      actionUrl: "/dashboard/inbox",
      sentAt: new Date(Date.now() - 4 * 60 * 60_000),
      deliveries: {
        create: users.map((user, index) => ({
          recipientId: user.id,
          readAt: index < 4 ? new Date(Date.now() - 3 * 60 * 60_000) : null,
        })),
      },
    },
  });

  await prisma.milestoneTemplate.createMany({
    data: milestoneTemplates.map(([type, title, duration, min, max, risk, manual, methods]) => ({
      type,
      title,
      description: `Moderated ${title.toLowerCase()} milestone with transparent player instructions.`,
      verificationMethods: [...methods],
      requiredConfiguration: {
        fields: ["instructions"],
        constraints: "Template-specific validation applies.",
      },
      expectedDurationMinutes: duration,
      minimumRewardCents: min,
      maximumRewardCents: max,
      abuseRisk: risk,
      manualReviewRequired: manual,
    })),
  });

  const servers = [];
  for (let index = 0; index < serverBlueprints.length; index += 1) {
    const [name, slug, description, edition, versions, categories, players] =
      serverBlueprints[index]!;
    const server = await prisma.server.create({
      data: {
        ownerId: users[index % 4]!.id,
        name,
        slug,
        description,
        hostname: `play.${slug}.example`,
        port: edition === "BEDROCK" ? 19132 : 25565,
        versions: [...versions],
        edition: edition === "JAVA" ? ServerEdition.JAVA : ServerEdition.BEDROCK,
        categories: [...categories],
        tags: ["Friendly", "Active staff", index % 2 === 0 ? "Seasonal" : "Long-term"],
        logoUrl: `/server-art/${slug}.webp`,
        bannerUrl: `/server-art/${slug}-banner.webp`,
        screenshotUrls: [],
        discordUrl: `https://discord.gg/${slug}`,
        websiteUrl: `https://${slug}.example`,
        verificationStatus: VerificationStatus.VERIFIED,
        moderationStatus: ModerationStatus.APPROVED,
        claimed: true,
        online: index !== 8,
        publicListing: true,
        playerCount: players,
        maxPlayers: 5000,
        verifications: {
          create: {
            provider: "MANUAL_REVIEW",
            challenge: { type: "console_screenshot" },
            evidence: { redacted: true, reviewed: true },
            status: VerificationStatus.VERIFIED,
            reviewNote: "Ownership evidence verified during seed setup.",
          },
        },
      },
    });
    servers.push(server);
  }

  await prisma.serverActivitySample.createMany({
    data: servers.flatMap((server, serverIndex) =>
      Array.from({ length: 24 }, (_, sampleIndex) => {
        const baseline = Number(serverBlueprints[serverIndex]![6]);
        const onlinePlayers = Math.max(0, baseline + ((sampleIndex % 7) - 3) * 4);
        return {
          id: `seed-presence-${serverIndex + 1}-${sampleIndex + 1}`,
          serverId: server.id,
          observedAt: new Date(Date.now() - sampleIndex * 15 * 60_000),
          onlinePlayers,
          maxPlayers: 5_000,
          platform: server.verificationScope === "PROXY_NETWORK" ? "VELOCITY" : "PAPER",
          pluginVersion: "0.4.0-seed",
          serverVersion: server.versions[0],
          backendCounts: { default: onlinePlayers },
          playerHashes: [],
        };
      }),
    ),
  });

  const campaigns = [];
  for (let index = 0; index < 8; index += 1) {
    const server = servers[index]!;
    const maximumSparksReward = Math.max(65, 100 - index * 5);
    const campaignBudgetCredits = 5_000 + index * 500;
    const maxParticipants = 100 + index * 25;
    const campaign = await prisma.campaign.create({
      data: {
        serverId: server.id,
        ownerId: server.ownerId,
        title: [
          "First island experience",
          "Prison onboarding polish",
          "Season launch survival test",
          "Faction tutorial expedition",
          "Arcane academy playtest",
          "Ranked Bedwars queue test",
          "OneBlock chapter one",
          "New frontier expedition",
        ][index]!,
        description: `Help ${server.name} test its first-session experience. Complete clear milestones, share useful feedback, and receive rewards after verification.`,
        status: CampaignStatus.ACTIVE,
        category: ["Onboarding", "Retention", "Gameplay", "Tutorial"][index % 4]!,
        internalBudgetCents: 35_000 + index * 3_000,
        campaignBudgetCredits,
        creditCostPerParticipant: Math.ceil(campaignBudgetCredits / maxParticipants),
        publicRewardCents: 300 + index * 40,
        minimumSparksReward: Math.max(25, 50 - index * 3),
        maximumSparksReward,
        potentialExposureMin: 100 + index * 20,
        potentialExposureMax: 400 + index * 75,
        automaticVerification: true,
        startsAt: new Date(Date.now() - 4 * 86_400_000),
        endsAt: new Date(Date.now() + (18 + index) * 86_400_000),
        maxParticipants,
        completionLimit: maxParticipants,
        eligibilityRules: { minimumReputation: index > 4 ? 150 : 0, onePerUser: true },
        versionRequirements: server.versions,
        regionRestrictions: index % 3 === 0 ? ["US", "CA", "GB"] : [],
        publishedAt: new Date(Date.now() - 5 * 86_400_000),
        milestones: {
          create: [
            {
              templateType: "JOIN_SERVER",
              title: "Connect and begin",
              publicInstructions: `Join ${server.name} using the connection instructions.`,
              verificationConfig: { metric: "JOIN_SERVER", target: 1, scope: "SERVER" },
              order: 1,
              publicRewardCents: 50,
              sparksReward: 25,
              completionRequirements: { connected: true },
              verificationMethod: "SERVER_PLUGIN",
              reviewRequired: false,
            },
            {
              templateType: "COMPLETE_TUTORIAL",
              title: "Complete the welcome path",
              publicInstructions: "Finish the server tutorial and capture the completion screen.",
              verificationConfig: { metric: "COMPLETE_TUTORIAL", target: 1, scope: "SERVER" },
              order: 2,
              publicRewardCents: 125 + index * 10,
              sparksReward: 35,
              completionRequirements: { tutorialComplete: true },
              verificationMethod: "SERVER_PLUGIN",
              reviewRequired: false,
            },
            {
              templateType: "SUBMIT_FEEDBACK",
              title: "Share structured feedback",
              publicInstructions:
                "Complete the Nortix feedback form with specific, constructive notes.",
              verificationConfig: { form: "campaign_feedback_v1" },
              order: 3,
              publicRewardCents: 125 + index * 30,
              sparksReward: maximumSparksReward - 60,
              completionRequirements: { minimumCommentLength: 80 },
              verificationMethod: "WEB_EVENT",
              reviewRequired: false,
            },
          ],
        },
      },
      include: { milestones: true },
    });
    campaigns.push(campaign);
  }

  for (let index = 0; index < 12; index += 1) {
    const user = users[4 + (index % 12)]!;
    const campaign = campaigns[index % campaigns.length]!;
    const participation = await prisma.campaignParticipation.create({
      data: {
        playerId: user.id,
        campaignId: campaign.id,
        status: index < 7 ? ParticipationStatus.ACTIVE : ParticipationStatus.COMPLETED,
        currentMilestone: index < 7 ? 1 + (index % 2) : 3,
        eligibilitySnapshot: {
          reputationScore: user.reputationScore,
          countryCode: user.countryCode,
        },
        completedAt: index >= 7 ? new Date(Date.now() - index * 86_400_000) : null,
      },
    });
    const milestone = campaign.milestones[0]!;
    const earnings = await prisma.earningsLedgerEntry.create({
      data: {
        userId: user.id,
        direction: LedgerDirection.CREDIT,
        amountCents: milestone.publicRewardCents,
        currency: "USD",
        transactionType: EarningsTransactionType.MILESTONE_REWARD,
        referenceType: "MILESTONE_COMPLETION",
        referenceId: `${participation.id}:${milestone.id}`,
        idempotencyKey: `seed:earnings:${participation.id}:${milestone.id}`,
        internalNote: "Verified seed milestone reward.",
      },
    });
    const sparks = await prisma.sparksLedgerEntry.create({
      data: {
        userId: user.id,
        direction: LedgerDirection.CREDIT,
        amount: milestone.sparksReward,
        transactionType: SparksTransactionType.CAMPAIGN_REWARD,
        referenceType: "MILESTONE_COMPLETION",
        referenceId: `${participation.id}:${milestone.id}`,
        idempotencyKey: `seed:sparks:${participation.id}:${milestone.id}`,
      },
    });
    await prisma.milestoneCompletion.create({
      data: {
        participationId: participation.id,
        milestoneId: milestone.id,
        evidence: { type: "seed", note: "Connection evidence accepted." },
        verificationSource: "MANUAL",
        status: CompletionStatus.VERIFIED,
        rewardTransactionId: earnings.id,
        sparksTransactionId: sparks.id,
        reviewedById: users[17]!.id,
        reviewedAt: new Date(),
      },
    });
  }

  for (const campaign of campaigns) {
    const participationCount = await prisma.campaignParticipation.count({
      where: { campaignId: campaign.id },
    });
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        consumedBudgetCredits: Math.min(
          campaign.campaignBudgetCredits,
          participationCount * campaign.creditCostPerParticipant,
        ),
      },
    });
  }

  await prisma.cosmeticItem.createMany({
    data: [
      {
        slug: "default-avatar",
        name: "Nortix Initials",
        description: "The classic Nortix profile tile.",
        type: CosmeticType.AVATAR,
        unlockMethod: CosmeticUnlockMethod.DEFAULT,
        sparksPrice: 0,
        rarity: "COMMON",
        sortOrder: 0,
        preview: { primary: "#3b2868", accent: "#b99cff", icon: "user", pattern: "plain" },
      },
      {
        slug: "mossbound-avatar",
        name: "Mossbound",
        description: "A living green frame unlocked at level 4.",
        type: CosmeticType.AVATAR,
        unlockMethod: CosmeticUnlockMethod.LEVEL,
        requiredLevel: 4,
        sparksPrice: 0,
        rarity: "UNCOMMON",
        sortOrder: 10,
        preview: { primary: "#173b2a", accent: "#68e34b", icon: "leaf", pattern: "grid" },
      },
      {
        slug: "pixel-bot-avatar",
        name: "Pixel Bot",
        description: "A curious companion for your profile.",
        type: CosmeticType.AVATAR,
        unlockMethod: CosmeticUnlockMethod.SPARKS,
        sparksPrice: 2400,
        rarity: "RARE",
        sortOrder: 20,
        preview: { primary: "#15364a", accent: "#55c7ff", icon: "bot", pattern: "grid" },
      },
      {
        slug: "gridline-banner",
        name: "Gridline",
        description: "A clean signal-grid profile banner.",
        type: CosmeticType.BANNER,
        unlockMethod: CosmeticUnlockMethod.DEFAULT,
        sparksPrice: 0,
        rarity: "COMMON",
        sortOrder: 0,
        preview: { primary: "#10251d", accent: "#68e34b", icon: "grid", pattern: "grid" },
      },
      {
        slug: "aurora-banner",
        name: "Aurora",
        description: "Northern lights for players who reach level 3.",
        type: CosmeticType.BANNER,
        unlockMethod: CosmeticUnlockMethod.LEVEL,
        requiredLevel: 3,
        sparksPrice: 0,
        rarity: "UNCOMMON",
        sortOrder: 10,
        preview: { primary: "#102c3b", accent: "#32e5a4", icon: "waves", pattern: "aurora" },
      },
      {
        slug: "mountains-banner",
        name: "Overworld Peaks",
        description: "A distant mountain banner unlocked at level 8.",
        type: CosmeticType.BANNER,
        unlockMethod: CosmeticUnlockMethod.LEVEL,
        requiredLevel: 8,
        sparksPrice: 0,
        rarity: "RARE",
        sortOrder: 20,
        preview: { primary: "#1c3045", accent: "#8fc7ef", icon: "mountain", pattern: "mountains" },
      },
      {
        slug: "cosmic-banner",
        name: "Cosmic",
        description: "A deep-space profile banner.",
        type: CosmeticType.BANNER,
        unlockMethod: CosmeticUnlockMethod.SPARKS,
        sparksPrice: 3200,
        rarity: "EPIC",
        sortOrder: 30,
        preview: { primary: "#20143e", accent: "#9a72ff", icon: "orbit", pattern: "cosmic" },
      },
      {
        slug: "new-tester-badge",
        name: "New Tester",
        description: "Issued to every Nortix tester.",
        type: CosmeticType.BADGE,
        unlockMethod: CosmeticUnlockMethod.DEFAULT,
        sparksPrice: 0,
        rarity: "COMMON",
        sortOrder: 0,
        preview: { primary: "#183321", accent: "#68e34b", icon: "shield-check", pattern: "plain" },
      },
      {
        slug: "signal-scout-badge",
        name: "Signal Scout",
        description: "Reach level 2 to unlock this badge.",
        type: CosmeticType.BADGE,
        unlockMethod: CosmeticUnlockMethod.LEVEL,
        requiredLevel: 2,
        sparksPrice: 0,
        rarity: "COMMON",
        sortOrder: 10,
        preview: { primary: "#27304a", accent: "#8ca8ff", icon: "radio", pattern: "plain" },
      },
      {
        slug: "helpful-badge",
        name: "Helpful",
        description: "Unlocked at tester level 5.",
        type: CosmeticType.BADGE,
        unlockMethod: CosmeticUnlockMethod.LEVEL,
        requiredLevel: 5,
        sparksPrice: 0,
        rarity: "UNCOMMON",
        sortOrder: 20,
        preview: { primary: "#2d2045", accent: "#b78cff", icon: "message", pattern: "plain" },
      },
      {
        slug: "veteran-badge",
        name: "Veteran",
        description: "A seasoned tester badge unlocked at level 12.",
        type: CosmeticType.BADGE,
        unlockMethod: CosmeticUnlockMethod.LEVEL,
        requiredLevel: 12,
        sparksPrice: 0,
        rarity: "EPIC",
        sortOrder: 30,
        preview: { primary: "#3a202b", accent: "#ff7893", icon: "award", pattern: "plain" },
      },
      {
        slug: "pathfinder-badge",
        name: "Pathfinder",
        description: "A purchasable badge for avid explorers.",
        type: CosmeticType.BADGE,
        unlockMethod: CosmeticUnlockMethod.SPARKS,
        sparksPrice: 1800,
        rarity: "RARE",
        sortOrder: 40,
        preview: { primary: "#16384a", accent: "#5fd5ff", icon: "compass", pattern: "plain" },
      },
      {
        slug: "tester-title",
        name: "Tester",
        description: "The standard profile title.",
        type: CosmeticType.TITLE,
        unlockMethod: CosmeticUnlockMethod.DEFAULT,
        sparksPrice: 0,
        rarity: "COMMON",
        sortOrder: 0,
        preview: { primary: "#273044", accent: "#aab7ca", icon: "tag", pattern: "plain" },
      },
      {
        slug: "signal-chaser-title",
        name: "Signal Chaser",
        description: "Unlocked at tester level 6.",
        type: CosmeticType.TITLE,
        unlockMethod: CosmeticUnlockMethod.LEVEL,
        requiredLevel: 6,
        sparksPrice: 0,
        rarity: "RARE",
        sortOrder: 10,
        preview: { primary: "#202a3b", accent: "#68e34b", icon: "zap", pattern: "plain" },
      },
      {
        slug: "void-walker-title",
        name: "Void Walker",
        description: "A deep-space profile title.",
        type: CosmeticType.TITLE,
        unlockMethod: CosmeticUnlockMethod.SPARKS,
        sparksPrice: 2600,
        rarity: "EPIC",
        sortOrder: 20,
        preview: { primary: "#21153d", accent: "#ad88ff", icon: "orbit", pattern: "plain" },
      },
      {
        slug: "nortix-dark-theme",
        name: "Nortix Dark",
        description: "The default profile presentation.",
        type: CosmeticType.THEME,
        unlockMethod: CosmeticUnlockMethod.DEFAULT,
        sparksPrice: 0,
        rarity: "COMMON",
        sortOrder: 0,
        preview: { primary: "#0d1926", accent: "#68e34b", icon: "moon", pattern: "grid" },
      },
      {
        slug: "voidglass-theme",
        name: "Voidglass",
        description: "A violet profile theme for level 10 testers.",
        type: CosmeticType.THEME,
        unlockMethod: CosmeticUnlockMethod.LEVEL,
        requiredLevel: 10,
        sparksPrice: 0,
        rarity: "EPIC",
        sortOrder: 10,
        preview: { primary: "#24163f", accent: "#9d79ff", icon: "sparkles", pattern: "cosmic" },
      },
    ],
  });

  const defaultCosmetics = await prisma.cosmeticItem.findMany({
    where: { unlockMethod: CosmeticUnlockMethod.DEFAULT },
    select: { id: true, type: true },
  });
  await prisma.equippedCosmetic.createMany({
    data: users.flatMap((user) =>
      defaultCosmetics.map((item) => ({ userId: user.id, itemId: item.id, type: item.type })),
    ),
  });

  for (let index = 0; index < 4; index += 1) {
    await prisma.campaignCreditLedgerEntry.create({
      data: {
        ownerId: users[index]!.id,
        direction: LedgerDirection.CREDIT,
        amountCents: 50_000,
        purchasedCents: 35_000,
        promotionalCents: 15_000,
        transactionType: "PROMOTIONAL",
        referenceType: "ONBOARDING_GRANT",
        referenceId: `owner-${index + 1}`,
        idempotencyKey: `seed:credit:owner:${index + 1}`,
        expiresAt: new Date(Date.now() + 60 * 86_400_000),
        internalNote: "Purchased and promotional components remain separately attributable.",
      },
    });
  }

  for (const campaign of campaigns) {
    await prisma.campaignCreditLedgerEntry.create({
      data: {
        ownerId: campaign.ownerId,
        direction: LedgerDirection.DEBIT,
        amountCents: campaign.campaignBudgetCredits,
        purchasedCents: 0,
        promotionalCents: campaign.campaignBudgetCredits,
        transactionType: "SPENT",
        referenceType: "CAMPAIGN_BUDGET",
        referenceId: campaign.id,
        idempotencyKey: `campaign-budget:${campaign.id}`,
        internalNote: "Seeded Campaign Credits reservation for an active campaign.",
      },
    });
  }

  await prisma.dailyQuest.createMany({
    data: [
      {
        slug: "create-account",
        title: "Create an account",
        description: "Create a Nortix account to start earning Sparks.",
        type: "ACCOUNT_CREATED",
        target: 1,
        sparksReward: 25,
      },
      {
        slug: "link-minecraft-account",
        title: "Link a Minecraft account",
        description: "Link either a premium Minecraft account or a cracked server account.",
        type: "MINECRAFT_ACCOUNT_LINKED",
        target: 1,
        sparksReward: 20,
      },
      {
        slug: "complete-campaign",
        title: "Complete a campaign",
        description: "Complete the requirements of one Nortix campaign.",
        type: "CAMPAIGN_COMPLETED",
        target: 1,
        sparksReward: 15,
      },
      {
        slug: "vote-for-server",
        title: "Vote for a server",
        description: "Cast your vote for a Minecraft server on Nortix.",
        type: "SERVER_VOTED",
        target: 1,
        sparksReward: 10,
      },
      {
        slug: "join-verified-server",
        title: "Join a Nortix-verified server",
        description: "Join a campaign hosted by a Nortix-verified server.",
        type: "VERIFIED_SERVER_JOINED",
        target: 1,
        sparksReward: 5,
      },
      {
        slug: "join-nortix-discord",
        title: "Join the Nortix Discord",
        description: "Join the official Nortix Discord community.",
        type: "DISCORD_JOIN",
        target: 1,
        sparksReward: 15,
      },
      {
        slug: "seven-day-login-streak",
        title: "Maintain a 7-day login streak",
        description: "Log in to Nortix on seven consecutive days.",
        type: "LOGIN_STREAK",
        target: 7,
        sparksReward: 20,
      },
      {
        slug: "purchase-sparks-shop-item",
        title: "Purchase an item from the Sparks Shop",
        description: "Use Sparks to purchase an item from the Sparks Shop.",
        type: "SPARKS_SHOP_PURCHASED",
        target: 1,
        sparksReward: 25,
      },
      {
        slug: "invite-a-friend",
        title: "Invite a friend",
        description: "Invite a friend who registers and earns at least 200 Sparks.",
        type: "FRIEND_REFERRAL",
        target: 1,
        sparksReward: 50,
      },
      {
        slug: "write-server-review",
        title: "Write a server review",
        description: "Write a helpful review about a server you have played.",
        type: "SERVER_REVIEW_WRITTEN",
        target: 1,
        sparksReward: 20,
      },
    ],
  });
  const seededQuests = await prisma.dailyQuest.findMany({ orderBy: { slug: "asc" } });
  const questDate = new Date("1970-01-01T00:00:00.000Z");
  await prisma.userQuest.createMany({
    data: seededQuests.map((quest, index) => ({
      userId: users[4]!.id,
      questId: quest.id,
      progress: index === 0 ? Math.min(1, quest.target) : 0,
      completedAt: null,
      questDate,
    })),
  });

  const badges = await Promise.all([
    prisma.badge.create({
      data: {
        slug: "first-signal",
        name: "First Signal",
        description: "Completed a first verified milestone.",
        icon: "radio",
        rarity: "COMMON",
      },
    }),
    prisma.badge.create({
      data: {
        slug: "sharp-eye",
        name: "Sharp Eye",
        description: "Submitted a useful bug report.",
        icon: "scan-eye",
        rarity: "RARE",
      },
    }),
    prisma.badge.create({
      data: {
        slug: "returning-player",
        name: "Returning Player",
        description: "Returned for a multi-day campaign.",
        icon: "calendar-check",
        rarity: "UNCOMMON",
      },
    }),
  ]);
  await prisma.badgeAward.createMany({
    data: badges.map((badge, index) => ({ badgeId: badge.id, userId: users[4 + index]!.id })),
  });

  await prisma.moderationCase.createMany({
    data: [
      {
        type: "CAMPAIGN_REVIEW",
        status: "OPEN",
        priority: "NORMAL",
        campaignId: campaigns[2]!.id,
        assignedToId: users[17]!.id,
        summary: "Review configured tutorial evidence requirements.",
        evidence: { automatedWarnings: [] },
      },
      {
        type: "COMPLETION_DISPUTE",
        status: "OPEN",
        priority: "HIGH",
        subjectUserId: users[12]!.id,
        assignedToId: users[18]!.id,
        summary: "Player disputes a rejected tutorial completion.",
        evidence: { timelineAvailable: true, rawSensitiveDataStored: false },
      },
      {
        type: "WITHDRAWAL_REVIEW",
        status: "OPEN",
        priority: "NORMAL",
        subjectUserId: users[9]!.id,
        assignedToId: users[17]!.id,
        summary: "First withdrawal requires standard manual review.",
        evidence: { accountAgeDays: 96, riskSignals: [] },
      },
    ],
  });

  await prisma.featureFlag.createMany({
    data: [
      {
        key: "minecraft_plugin_events",
        description: "Accept automatic server plugin verification events.",
        enabled: false,
        rules: {},
      },
      {
        key: "rewarded_sparks",
        description: "Enable optional rewarded-ad sessions for Sparks only.",
        enabled: false,
        rules: {},
      },
      {
        key: "google_auth",
        description: "Show Google sign-in when Firebase is configured.",
        enabled: true,
        rules: {},
      },
    ],
  });

  for (let index = 0; index < 40; index += 1) {
    const campaign = campaigns[index % campaigns.length]!;
    await prisma.analyticsEvent.create({
      data: {
        id: `seed-event-${index + 1}`,
        userId: users[4 + (index % 12)]!.id,
        serverId: campaign.serverId,
        campaignId: campaign.id,
        source: index % 4 === 0 ? AnalyticsSource.MANUAL : AnalyticsSource.WEB,
        type: ["CAMPAIGN_IMPRESSION", "CAMPAIGN_VIEW", "CAMPAIGN_JOIN", "SERVER_CONNECTION"][
          index % 4
        ]!,
        occurredAt: new Date(Date.now() - index * 3_600_000),
        metadata: { seed: true },
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: users[19]!.id,
      action: "SEED_ENVIRONMENT_CREATED",
      entityType: "SYSTEM",
      entityId: "development",
      afterSnapshot: { users: 20, servers: 12, activeCampaigns: 8 },
      reason: "Create realistic local prototype data.",
    },
  });

  console.info("Seeded Nortix Playtests: 20 users, 12 servers, 8 campaigns.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
