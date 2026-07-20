import { useQuery } from "@tanstack/react-query";
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
  hostname?: string;
  port?: number;
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

export type DailyQuest = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  target: number;
  sparksReward: number;
  progress: number;
  completedAt?: string | null;
};

export type AdminOverview = {
  users: number;
  servers: number;
  campaigns: number;
  pendingWithdrawals: number;
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

export const useSparksSummary = () =>
  useQuery({
    queryKey: ["sparks-summary"],
    queryFn: () =>
      api<{ balance: number; cashValue: null; withdrawable: false }>("/sparks/summary"),
  });

export const useCurrentUser = () =>
  useQuery({
    queryKey: ["current-user"],
    queryFn: () => api<CurrentUser>("/users/me"),
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

export const useDailyQuests = () =>
  useQuery({
    queryKey: ["daily-quests"],
    queryFn: () => api<DailyQuest[]>("/quests"),
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

export const useInboxSummary = () =>
  useQuery({
    queryKey: ["inbox-summary"],
    queryFn: () => api<InboxSummary>("/notifications/summary"),
    refetchInterval: 30_000,
  });

export const useNotifications = (unreadOnly = false) =>
  useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => api<UserNotification[]>(`/notifications?unread=${unreadOnly}`),
    refetchInterval: 30_000,
  });

export const useInboxMessages = (unreadOnly = false) =>
  useQuery({
    queryKey: ["inbox-messages", unreadOnly],
    queryFn: () => api<InboxMessage[]>(`/messages?unread=${unreadOnly}`),
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
