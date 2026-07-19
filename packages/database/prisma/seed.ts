import {
  AnalyticsSource,
  CampaignStatus,
  CompletionStatus,
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

  const campaigns = [];
  for (let index = 0; index < 8; index += 1) {
    const server = servers[index]!;
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
        publicRewardCents: 300 + index * 40,
        startsAt: new Date(Date.now() - 4 * 86_400_000),
        endsAt: new Date(Date.now() + (18 + index) * 86_400_000),
        maxParticipants: 100 + index * 25,
        completionLimit: 100 + index * 25,
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
              verificationConfig: { mode: "manual_until_plugin" },
              order: 1,
              publicRewardCents: 50,
              sparksReward: 150,
              completionRequirements: { connected: true },
              verificationMethod: "MANUAL",
              reviewRequired: true,
            },
            {
              templateType: "COMPLETE_TUTORIAL",
              title: "Complete the welcome path",
              publicInstructions: "Finish the server tutorial and capture the completion screen.",
              verificationConfig: { screenshotRequired: true },
              order: 2,
              publicRewardCents: 125 + index * 10,
              sparksReward: 350,
              completionRequirements: { tutorialComplete: true },
              verificationMethod: "MANUAL",
              reviewRequired: true,
            },
            {
              templateType: "SUBMIT_FEEDBACK",
              title: "Share structured feedback",
              publicInstructions:
                "Complete the Nortix feedback form with specific, constructive notes.",
              verificationConfig: { form: "campaign_feedback_v1" },
              order: 3,
              publicRewardCents: 125 + index * 30,
              sparksReward: 500,
              completionRequirements: { minimumCommentLength: 80 },
              verificationMethod: "WEB_EVENT",
              reviewRequired: true,
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

  await prisma.cosmeticItem.createMany({
    data: [
      {
        slug: "moss-frame",
        name: "Mossbound Frame",
        description: "A living green profile frame.",
        type: "PROFILE_FRAME",
        sparksPrice: 2200,
        rarity: "RARE",
        preview: { color: "#68e34b" },
      },
      {
        slug: "void-card",
        name: "Voidglass Card",
        description: "An animated deep-purple campaign card.",
        type: "ANIMATED_CARD",
        sparksPrice: 4800,
        rarity: "EPIC",
        preview: { color: "#8b5cf6" },
      },
      {
        slug: "founder-badge",
        name: "Early Explorer",
        description: "A badge for early Nortix testers.",
        type: "BADGE",
        sparksPrice: 1500,
        rarity: "UNCOMMON",
        preview: { icon: "compass" },
      },
      {
        slug: "forest-background",
        name: "Moonlit Forest",
        description: "A calm profile background.",
        type: "PROFILE_BACKGROUND",
        sparksPrice: 3200,
        rarity: "RARE",
        preview: { color: "#153827" },
      },
      {
        slug: "signal-name",
        name: "Signal Pulse",
        description: "A subtle green name effect.",
        type: "NAME_EFFECT",
        sparksPrice: 6000,
        rarity: "EPIC",
        preview: { effect: "pulse" },
      },
      {
        slug: "summer-stamps",
        name: "Summer Stamp Page",
        description: "A seasonal server-stamp collection page.",
        type: "COLLECTION_PAGE",
        sparksPrice: 2800,
        rarity: "SEASONAL",
        season: "Summer 2026",
        preview: { icon: "sun" },
      },
    ],
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

  await prisma.dailyQuest.createMany({
    data: [
      {
        slug: "explore-two",
        title: "Curious Explorer",
        description: "View two new server pages.",
        type: "SERVER_VIEWS",
        target: 2,
        sparksReward: 120,
      },
      {
        slug: "useful-feedback",
        title: "Thoughtful Tester",
        description: "Submit one structured feedback response.",
        type: "FEEDBACK",
        target: 1,
        sparksReward: 300,
      },
      {
        slug: "campaign-step",
        title: "Keep the Momentum",
        description: "Complete one campaign milestone.",
        type: "MILESTONE",
        target: 1,
        sparksReward: 180,
      },
    ],
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
