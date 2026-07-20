import { Navigate, Route, Routes } from "react-router-dom";
import { UnifiedInfoPage, OwnerWorkspace } from "../components/UnifiedPages";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { CampaignDetailPage, ContactPage, ServerDetailPage } from "../routes/PublicPages";
import {
  CommunityPage,
  DashboardCampaignsPage,
  DashboardHomePage,
  DashboardServersPage,
  LeaderboardsPage,
  PlaceholderDashboardPage,
  ProfilePage,
  ProgressPage,
  QuestsPage,
  ReferralsPage,
  SparksShopPage,
} from "../routes/DashboardPages";
import {
  AdminGenericPage,
  AdminLayout,
  AdminOverviewPage,
  CampaignReviewPage,
  WithdrawalReviewPage,
} from "../routes/AdminPages";
import { AuthPage } from "../routes/AuthPages";

const managedPages = [
  ["users", "Users", "Edit account data, roles, access, restrictions, and moderation context.", "users"],
  ["servers", "Servers", "Edit listings, verification, ownership, moderation, and connection health.", "servers"],
  ["reports", "Reports", "Review safety, campaign, server, user, and community reports.", "reports"],
  ["ownership", "Ownership Verification", "Review evidence and manage verified server ownership.", "ownership"],
  ["milestones", "Milestone Templates", "Edit allowed tasks, verification methods, and Sparks limits.", "milestones"],
  ["participations", "Participations", "Inspect campaign history and current verification states.", "participations"],
  ["disputes", "Completion Disputes", "Review evidence, timelines, configuration snapshots, and appeals.", "disputes"],
  ["fraud", "Risk Signals", "Route proportionate signals to human review and document outcomes.", "fraud"],
  ["reviews", "Reviews", "Moderate public server reviews separately from private feedback.", "reviews"],
  ["feature-flags", "Feature Flags", "Control rollout for integrations and product capabilities.", "flags"],
  ["settings", "System Settings", "Manage restricted thresholds, adapters, policies, and platform defaults.", "settings"],
] as const;

function AdminRoutes() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminOverviewPage />} />
        <Route path="campaigns" element={<CampaignReviewPage />} />
        <Route path="sparks-adjustments" element={<WithdrawalReviewPage />} />
        <Route path="withdrawals" element={<Navigate to="/admin/sparks-adjustments" replace />} />
        <Route path="messages" element={<AdminGenericPage title="Admin Messages" description="Send moderated service messages to players, owners, or selected accounts." type="messages" />} />
        <Route path="access" element={<AdminGenericPage title="Access Control" description="Manage roles, capabilities, and privileged access." type="access" />} />
        <Route path="monitor" element={<AdminGenericPage title="Activity Monitor" description="Inspect live product and moderation activity." type="monitor" />} />
        <Route path="analytics" element={<AdminGenericPage title="Product Analytics" description="Understand website usage and campaign conversion." type="analytics" />} />
        <Route path="umami" element={<AdminGenericPage title="Umami" description="Configure privacy-conscious site usage analytics." type="umami" />} />
        <Route path="audit-logs" element={<AdminGenericPage title="Audit Logs" description="Review append-only records for important administrative actions." type="audit" />} />
        <Route path="termination" element={<AdminGenericPage title="Termination Console" description="Restrict or terminate users and servers with safeguards and audit trails." type="termination" />} />
        <Route path="ledger" element={<AdminGenericPage title="Sparks Ledger" description="Inspect Sparks eligibility, adjustments, limits, and verification history." type="ledger" />} />
        {managedPages.map(([path, title, description, type]) => (
          <Route key={path} path={path} element={<AdminGenericPage title={title} description={description} type={type} />} />
        ))}
      </Routes>
    </AdminLayout>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="welcome" element={<Navigate to="/dashboard" replace />} />
        <Route path="servers" element={<DashboardServersPage />} />
        <Route path="servers/:slug" element={<ServerDetailPage />} />
        <Route path="campaigns" element={<DashboardCampaignsPage />} />
        <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="how-it-works" element={<UnifiedInfoPage type="players" />} />
        <Route path="for-server-owners" element={<UnifiedInfoPage type="owners" />} />
        <Route path="safety" element={<UnifiedInfoPage type="safety" />} />
        <Route path="guidelines" element={<UnifiedInfoPage type="guidelines" />} />
        <Route path="terms" element={<UnifiedInfoPage type="terms" />} />
        <Route path="privacy" element={<UnifiedInfoPage type="privacy" />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="dashboard" element={<DashboardHomePage />} />
        <Route path="dashboard/servers" element={<Navigate to="/servers" replace />} />
        <Route path="dashboard/campaigns" element={<Navigate to="/campaigns" replace />} />
        <Route path="dashboard/progress" element={<ProgressPage />} />
        <Route path="dashboard/earnings" element={<Navigate to="/dashboard/sparks-shop" replace />} />
        <Route path="dashboard/quests" element={<QuestsPage />} />
        <Route path="dashboard/sparks-shop" element={<SparksShopPage />} />
        <Route path="dashboard/leaderboards" element={<LeaderboardsPage />} />
        <Route path="dashboard/community" element={<CommunityPage />} />
        <Route path="dashboard/referrals" element={<ReferralsPage />} />
        <Route path="dashboard/profile" element={<ProfilePage />} />
        <Route path="dashboard/settings" element={<PlaceholderDashboardPage title="Settings" description="Profile, notifications, privacy, Sparks preferences, and security." />} />
        <Route path="owner" element={<OwnerWorkspace />} />
        <Route path="owner/servers/new" element={<OwnerWorkspace />} />
        <Route path="owner/campaigns/new" element={<OwnerWorkspace />} />
        <Route path="owner/analytics" element={<OwnerWorkspace />} />
        <Route path="owner/balance" element={<OwnerWorkspace />} />
        <Route path="owner/integrations" element={<OwnerWorkspace />} />
        <Route path="owner/settings" element={<OwnerWorkspace />} />
      </Route>
      <Route path="sign-in" element={<AuthPage mode="sign-in" />} />
      <Route path="register" element={<AuthPage mode="register" />} />
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
