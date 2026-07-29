import { useQuery } from "@tanstack/react-query";
import type { StoreItemCategory } from "@nortix/shared";
import { api } from "../lib/api";

export type PublicMilestone = {
  id: string;
  templateType: string;
  title: string;
  publicInstructions: string;
  order: number;
  sparksReward: number;
  verificationMethod: string;
};

export type PublicServer = {
  id: string;
  name: string;
  slug: string;
  source?: "NORTIX" | "DISCOVERED";
  description: string;
  versions: string[];
  edition: "JAVA" | "BEDROCK";
  categories: string[];
  tags: string[];
  logoUrl?: string | null;
  bannerUrl?: string | null;
  screenshotUrls: string[];
  discordUrl?: string | null;
  websiteUrl?: string | null;
  verificationStatus: string;
  online: boolean;
  playerCount?: number | null;
  maxPlayers?: number | null;
  rating?: number | null;
  reviewCount?: number;
  voteCount?: number;
  monthlyVoteCount?: number;
  averagePlayerCount?: number | null;
  averagePlayerWindowDays?: number;
  campaignCountAllTime?: number;
  rewardedVotingEnabled?: boolean;
  hostname?: string;
  port?: number;
  activeCampaignCount?: number;
  crackedAccountLinkingAvailable?: boolean;
  lastCheckedAt?: string | null;
  campaigns?: PublicCampaign[];
  reviews?: PublicReview[];
};

export type PublicReview = {
  id: string;
  rating: number;
  text: string;
  campaignLinked: boolean;
  helpfulCount: number;
  createdAt: string;
  player: {
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
};

export type PublicCampaign = {
  id: string;
  title: string;
  description: string;
  status: "ACTIVE" | "SCHEDULED" | "COMPLETED";
  category: string;
  quickStart?: string | null;
  quickStartConfig?: Record<string, unknown>;
  startsAt: string;
  endsAt: string;
  maxParticipants: number;
  minimumSparksReward: number;
  maximumSparksReward: number;
  potentialExposureMin: number;
  potentialExposureMax: number;
  automaticVerification: boolean;
  versionRequirements: string[];
  regionRestrictions: string[];
  server: PublicServer;
  milestones: PublicMilestone[];
  _count: { participations: number };
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type LeaderboardEntry = {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  reputationScore: number;
  reputationTier: string;
  testerLevel: number;
};

export type ReferralInvite = {
  id: string;
  code: string;
  label: string;
  status: "OPEN" | "REGISTERED" | "QUALIFIED" | "EXPIRED";
  creditedSparks: number;
  requiredSparks: number;
  createdAt: string;
  expiresAt: string;
  claimedAt?: string | null;
  qualifiedAt?: string | null;
  earningWindowEndsAt?: string | null;
  earningWindowActive: boolean;
};

export type CosmeticItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  sparksPrice: number;
  rarity: string;
  season?: string | null;
  preview: Record<string, unknown>;
};

export type ProfileCosmeticType = "AVATAR" | "BANNER" | "BADGE" | "TITLE" | "THEME";

export type ProfileCosmeticItem = CosmeticItem & {
  type: ProfileCosmeticType;
  unlockMethod: "DEFAULT" | "LEVEL" | "SPARKS";
  requiredLevel: number | null;
  sortOrder: number;
  available: boolean;
  purchased: boolean;
  unlocked: boolean;
  equipped: boolean;
  preview: {
    primary: string;
    accent: string;
    icon: string;
    pattern: "grid" | "aurora" | "mountains" | "cosmic" | "waves" | "plain";
  };
};

export type ProfileCosmetics = {
  testerLevel: number;
  testerExperience: number;
  currentLevelExperience: number;
  nextLevelExperience: number;
  reputationScore: number;
  nextLevelUnlock: { level: number; name: string; itemId: string } | null;
  equipped: Partial<Record<ProfileCosmeticType, string>>;
  items: ProfileCosmeticItem[];
};

export type SponsoredFulfillmentField =
  | "MINECRAFT_USERNAME"
  | "DISCORD_USERNAME"
  | "EMAIL";

export type SponsoredItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: StoreItemCategory;
  sparksPrice: number;
  imageUrl?: string | null;
  fulfillmentSummary: string;
  fulfillmentFields: SponsoredFulfillmentField[];
};

export type SponsoredStore = {
  id: string;
  slug: string;
  name: string;
  description: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  items: SponsoredItem[];
};

export type SponsoredPurchaseStatus =
  | "REQUESTED"
  | "PROCESSING"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type SponsoredPurchase = {
  id: string;
  status: SponsoredPurchaseStatus;
  quantity: number;
  priceSparks: number;
  fulfillmentDetails: Record<string, string>;
  deliveryReference?: string | null;
  statusReason?: string | null;
  processingAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  item: {
    id: string;
    name: string;
    description: string;
    imageUrl?: string | null;
    fulfillmentSummary: string;
    store: Pick<SponsoredStore, "id" | "slug" | "name" | "websiteUrl">;
  };
};

export type AdminSponsoredStore = Omit<SponsoredStore, "items"> & {
  available: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: { username: string; displayName: string };
  items: Array<
    SponsoredItem & {
      available: boolean;
      sortOrder: number;
      createdAt: string;
      updatedAt: string;
      _count: { purchases: number };
    }
  >;
};

export type AdminSponsoredPurchase = SponsoredPurchase & {
  adminNote?: string | null;
  user: { id: string; username: string; displayName: string };
  handledBy?: { id: string; username: string; displayName: string } | null;
  sparksDebitLedgerEntryId: string;
  sparksRefundLedgerEntryId?: string | null;
};

export type ServerStoreItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: StoreItemCategory;
  sparksPrice: number;
  imageUrls: string[];
  stockQuantity: number | null;
  maxPerPurchase: number;
};

export type ServerStore = {
  id: string;
  name: string;
  description: string;
  logoUrl?: string | null;
  server: {
    id: string;
    slug: string;
    name: string;
    logoUrl?: string | null;
    online: boolean;
  };
  items: ServerStoreItem[];
};

export type ServerStorePurchase = {
  id: string;
  status: "PURCHASED" | "PENDING_DELIVERY" | "DELIVERED" | "FAILED" | "REFUNDED";
  quantity: number;
  priceSparks: number;
  recipientMinecraftUsername: string;
  giftMessage?: string | null;
  refundEligibleUntil: string;
  redeemedAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  buyer: { username: string; displayName: string };
  recipient: { username: string; displayName: string };
  item: {
    id: string;
    name: string;
    imageUrls: string[];
    store: {
      id: string;
      name: string;
      server: { id: string; slug: string; name: string };
    };
  };
  delivery?: {
    id: string;
    status: "PENDING" | "CLAIMED" | "DELIVERED" | "FAILED";
    updatedAt: string;
  } | null;
};

export type ProfileActivity = {
  stats: {
    verifiedPlaytests: number;
    participationRecords: number;
    premiumIdentities: number;
    serverScopedIdentities: number;
    feedbackGiven: number;
  };
  gameplay: {
    windowDays: number;
    totals: {
      playMinutes: number;
      serverVisits: number;
      serversExplored: number;
      blocksBroken: number;
      playerWins: number;
      mobsDefeated: number;
    };
    favoriteServer: string | null;
    daily: Array<{
      date: string;
      label: string;
      playMinutes: number;
      adventures: number;
    }>;
  };
  activities: Array<{
    id: string;
    kind: "PLAYTEST" | "FEEDBACK" | "JOINED" | "SPARKS";
    title: string;
    detail: string;
    occurredAt: string;
    sparks: number | null;
  }>;
};

export type CurrentUser = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  roles: string[];
  status: string;
  reputationScore: number;
  reputationTier: string;
  testerLevel: number;
  testerExperience: number;
  publicProfile?: UserPublicProfile;
};

export type UserPublicProfile = {
  bio?: string | null;
  backgroundColor?: "slate" | "violet" | "ocean" | "moss" | "ember";
  isPublic?: boolean;
  showReputation?: boolean;
};

export type PublicUserProfile = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  reputationScore: number | null;
  reputationTier: string | null;
  testerLevel: number | null;
  publicProfile: UserPublicProfile;
  cosmetics: Array<Pick<ProfileCosmeticItem, "id" | "name" | "type" | "rarity" | "preview">>;
};

export type AdminReviewCampaign = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  maxParticipants: number;
  minimumSparksReward: number;
  maximumSparksReward: number;
  automaticVerification: boolean;
  milestones: Array<{
    id: string;
    title: string;
    verificationMethod: string;
  }>;
  server: {
    id: string;
    name: string;
    slug: string;
    verificationStatus: string;
    moderationStatus: string;
  };
  owner: {
    id: string;
    username: string;
    displayName?: string | null;
    status: string;
  };
};

export type AdminCampaignServer = {
  id: string;
  name: string;
  slug: string;
  hostname: string;
  port: number;
  edition: "JAVA" | "BEDROCK";
  versions: string[];
  categories: string[];
  online: boolean;
  playerCount?: number | null;
  owner: { username: string; displayName?: string | null };
};

export type AdminOngoingCampaign = {
  id: string;
  title: string;
  status: "APPROVED" | "SCHEDULED" | "ACTIVE" | "PAUSED";
  startsAt: string;
  endsAt: string;
  fundingSource: "OWNER_CREDITS" | "NORTIX_SPONSORED";
  campaignBudgetCredits: number;
  consumedBudgetCredits: number;
  minimumSparksReward: number;
  maximumSparksReward: number;
  _count: { participations: number };
  server: {
    id: string;
    name: string;
    slug: string;
    owner: { username: string; displayName?: string | null };
  };
};

export type DailyQuest = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  target: number;
  sparksReward: number;
  cadence: "ONCE" | "DAILY";
  progress: number;
  completedAt?: string | null;
  verificationPending?: boolean;
};

export type VotingServer = {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl?: string | null;
  playerCount?: number | null;
  maxPlayers?: number | null;
  pluginLastSeenAt: string;
  voteCount: number;
  rewardedVotingEnabled: boolean;
  votedToday: boolean;
  votedAt?: string | null;
};

export type VotingServers = {
  dailyLimit: number;
  votesUsed: number;
  resetsAt: string;
  rewardedAdsAvailable: boolean;
  servers: VotingServer[];
};

export type AdminOverview = {
  users: number;
  servers: number;
  campaigns: number;
  openCases: number;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor?: {
    username: string;
    displayName?: string | null;
    roles: string[];
  } | null;
};

export type Participation = {
  id: string;
  status: string;
  currentMilestone: number;
  joinedAt: string;
  lastActivityAt: string;
  completedAt?: string | null;
  campaign: Omit<
    PublicCampaign,
    "maxParticipants" | "potentialExposureMin" | "potentialExposureMax" | "_count"
  >;
  completions: Array<{
    id: string;
    milestoneId: string;
    status: string;
    submittedAt: string;
    reviewedAt?: string | null;
  }>;
};

export type OwnerAnalytics = {
  serverId: string;
  periodDays: number;
  totals: {
    events: number;
    impressions: number;
    views: number;
    joins: number;
    connections: number;
    uniquePlayers: number;
    campaigns: number;
    participations: number;
  };
  daily: Array<{
    date: string;
    impressions: number;
    views: number;
    joins: number;
    connections: number;
  }>;
  campaigns: Array<{
    id: string;
    title: string;
    status: string;
    minimumSparksReward: number;
    maximumSparksReward: number;
    _count: { participations: number };
  }>;
  recentEvents: Array<{
    id: string;
    type: string;
    source: string;
    occurredAt: string;
  }>;
  retention: { day1: number | null; day7: number | null; label: string };
};

export type InboxSummary = {
  unreadNotifications: number;
  unreadMessages: number;
};

export type UserNotification = {
  id: string;
  category: "CAMPAIGN" | "QUEST" | "SPARKS" | "SERVER" | "TEAM" | "SECURITY" | "SYSTEM";
  title: string;
  body: string;
  actionUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type InboxMessage = {
  id: string;
  readAt?: string | null;
  deliveredAt: string;
  message: {
    id: string;
    title: string;
    body: string;
    severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
    actionUrl?: string | null;
    sentAt?: string | null;
    createdBy: { displayName: string };
  };
};

export type NotificationPreferences = {
  campaignActivity: boolean;
  questsAndStreaks: boolean;
  sparksActivity: boolean;
  serverOperations: boolean;
  teamActivity: boolean;
  productUpdates: boolean;
  emailProductUpdates: boolean;
  updatedAt: string;
};

export type Streak = {
  current: number;
  longest: number;
  timezone: "UTC";
  today: {
    webOpened: boolean;
    campaignPlayed: boolean;
    verifiedServerJoined: boolean;
    active: boolean;
  };
  days: Array<{ date: string; active: boolean }>;
};

export type AdminMessageRecord = {
  id: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  audience: "ALL_USERS" | "PLAYERS" | "SERVER_OWNERS" | "LIMITED_ACCOUNTS" | "USER";
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  status: "DRAFT" | "SENT";
  sentAt?: string | null;
  createdAt: string;
  targetUser?: { username: string; displayName?: string | null } | null;
  createdBy: { username: string; displayName?: string | null };
  _count: { deliveries: number };
  deliveries: Array<{ id: string }>;
};

export type AdminSparksPlayer = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  status: string;
  lastActiveAt: string;
  balance: number;
  spent: number;
};

export type AdminSparksDashboard = {
  summary: {
    activePlayers: number;
    playersWithSparks: number;
    totalAvailable: number;
    totalCredited: number;
    totalSpent: number;
    ledgerEntries: number;
  };
  topBalances: Array<Omit<AdminSparksPlayer, "spent">>;
  topSpenders: Array<Omit<AdminSparksPlayer, "balance">>;
  spending: Array<{
    transactionType: string;
    amount: number;
    transactions: number;
  }>;
  trend: Array<{
    date: string;
    credited: number;
    spent: number;
    entries: number;
  }>;
  users: AdminSparksPlayer[];
  recentActivity: Array<{
    id: string;
    direction: "CREDIT" | "DEBIT";
    amount: number;
    transactionType: string;
    referenceType: string;
    internalNote?: string | null;
    createdAt: string;
    user: Pick<AdminSparksPlayer, "id" | "username" | "displayName" | "avatarUrl" | "status" | "lastActiveAt">;
    createdBy?: { id: string; username: string; displayName: string } | null;
  }>;
};

export const artIndexFor = (id: string) => {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 8;
};

export const usePublicServers = () =>
  useQuery({
    queryKey: ["public-servers"],
    queryFn: () => api<Paginated<PublicServer>>("/servers?pageSize=50"),
  });

export const usePublicServer = (slug?: string) =>
  useQuery({
    queryKey: ["public-server", slug],
    queryFn: () => api<PublicServer>(`/servers/${slug}`),
    enabled: Boolean(slug),
  });

export const usePublicCampaigns = () =>
  useQuery({
    queryKey: ["public-campaigns"],
    queryFn: () => api<Paginated<PublicCampaign>>("/campaigns?pageSize=50"),
  });

export const usePublicCampaign = (id?: string) =>
  useQuery({
    queryKey: ["public-campaign", id],
    queryFn: () => api<PublicCampaign>(`/campaigns/${id}`),
    enabled: Boolean(id),
  });

export const useLeaderboard = () =>
  useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => api<LeaderboardEntry[]>("/leaderboard"),
  });

export const useCosmetics = () =>
  useQuery({
    queryKey: ["sparks-shop"],
    queryFn: () => api<CosmeticItem[]>("/sparks/shop"),
  });

export const useProfileCosmetics = () =>
  useQuery({
    queryKey: ["profile-cosmetics"],
    queryFn: () => api<ProfileCosmetics>("/profile/cosmetics"),
  });

export const useSponsoredStores = () =>
  useQuery({
    queryKey: ["sponsored-stores"],
    queryFn: () => api<SponsoredStore[]>("/sparks/sponsored-stores"),
  });

export const useSponsoredPurchases = () =>
  useQuery({
    queryKey: ["sponsored-purchases"],
    queryFn: () => api<SponsoredPurchase[]>("/sparks/sponsored-purchases"),
  });

export const useServerStores = () =>
  useQuery({
    queryKey: ["server-stores"],
    queryFn: () => api<ServerStore[]>("/sparks/server-stores"),
  });

export const useServerStorePurchases = () =>
  useQuery({
    queryKey: ["server-store-purchases"],
    queryFn: () => api<ServerStorePurchase[]>("/sparks/server-store-purchases"),
  });

export const useAdminSponsoredStores = () =>
  useQuery({
    queryKey: ["admin-sponsored-stores"],
    queryFn: () => api<AdminSponsoredStore[]>("/admin/sponsored-stores"),
  });

export const useAdminSponsoredPurchases = (status = "") =>
  useQuery({
    queryKey: ["admin-sponsored-purchases", status],
    queryFn: () =>
      api<AdminSponsoredPurchase[]>(
        `/admin/sponsored-purchases${status ? `?status=${encodeURIComponent(status)}` : ""}`,
      ),
  });

export const useAdminSparks = (search = "") =>
  useQuery({
    queryKey: ["admin-sparks", search],
    queryFn: () =>
      api<AdminSparksDashboard>(
        `/admin/sparks${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      ),
  });

export const useProfileActivity = () =>
  useQuery({
    queryKey: ["profile-activity"],
    queryFn: () => api<ProfileActivity>("/profile/activity"),
  });

export const useStreak = (enabled = true) =>
  useQuery({
    queryKey: ["profile-streak"],
    queryFn: () => api<Streak>("/profile/activity/check-in", { method: "POST" }),
    enabled,
    retry: 2,
  });

export const useSparksSummary = (enabled = true) =>
  useQuery({
    queryKey: ["sparks-summary"],
    queryFn: () => api<{ balance: number }>("/sparks/summary"),
    enabled,
  });

export const useReferrals = () =>
  useQuery({
    queryKey: ["referrals"],
    queryFn: () => api<ReferralInvite[]>("/referrals"),
  });

export const useCurrentUser = (enabled = true) =>
  useQuery({
    queryKey: ["current-user"],
    queryFn: () => api<CurrentUser>("/users/me"),
    enabled,
  });

export const usePublicProfile = (username?: string) =>
  useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => api<PublicUserProfile>(`/users/${encodeURIComponent(username!)}`),
    enabled: Boolean(username),
  });

export const useParticipations = () =>
  useQuery({
    queryKey: ["participations"],
    queryFn: () => api<Participation[]>("/participations"),
  });

export const useOwnerAnalytics = (serverId?: string, days = 30) =>
  useQuery({
    queryKey: ["owner-analytics", serverId, days],
    queryFn: () => api<OwnerAnalytics>(`/owner/analytics?serverId=${serverId}&days=${days}`),
    enabled: Boolean(serverId),
  });

export const useAdminReviewCampaigns = () =>
  useQuery({
    queryKey: ["admin-review-campaigns"],
    queryFn: () => api<AdminReviewCampaign[]>("/admin/campaigns"),
  });

export const useAdminCampaignServers = (enabled = true) =>
  useQuery({
    queryKey: ["admin-campaign-servers"],
    queryFn: () => api<AdminCampaignServer[]>("/admin/campaign-servers"),
    enabled,
  });

export const useAdminOngoingCampaigns = (enabled = true) =>
  useQuery({
    queryKey: ["admin-ongoing-campaigns"],
    queryFn: () => api<AdminOngoingCampaign[]>("/admin/campaigns/ongoing"),
    enabled,
  });

export const useDailyQuests = (enabled = true) =>
  useQuery({
    queryKey: ["daily-quests"],
    queryFn: () => api<DailyQuest[]>("/quests"),
    enabled,
  });

export const useVotingServers = (enabled = true) =>
  useQuery({
    queryKey: ["voting-servers"],
    queryFn: () => api<VotingServers>("/voting/servers"),
    enabled,
  });

export const useAdminOverview = () =>
  useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api<AdminOverview>("/admin/overview"),
  });

export const useAuditLogs = () =>
  useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => api<AuditLogEntry[]>("/admin/audit-logs"),
  });

export const useInboxSummary = (enabled = true) =>
  useQuery({
    queryKey: ["inbox-summary"],
    queryFn: () => api<InboxSummary>("/notifications/summary"),
    enabled,
    refetchInterval: 30_000,
  });

export const useNotifications = (unreadOnly = false, enabled = true) =>
  useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => api<UserNotification[]>(`/notifications?unread=${unreadOnly}`),
    enabled,
    refetchInterval: 30_000,
  });

export const useInboxMessages = (unreadOnly = false, enabled = true) =>
  useQuery({
    queryKey: ["inbox-messages", unreadOnly],
    queryFn: () => api<InboxMessage[]>(`/messages?unread=${unreadOnly}`),
    enabled,
    refetchInterval: 30_000,
  });

export const useNotificationPreferences = () =>
  useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => api<NotificationPreferences>("/notification-preferences"),
  });

export const useAdminMessages = () =>
  useQuery({
    queryKey: ["admin-messages"],
    queryFn: () => api<AdminMessageRecord[]>("/admin/messages"),
  });
