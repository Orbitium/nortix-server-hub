import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "../layouts/PublicLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import {
  BrowseCampaignsPage,
  BrowseServersPage,
  CampaignDetailPage,
  ContactPage,
  HomePage,
  HowItWorksPage,
  LegalPage,
  ServerDetailPage,
} from "../routes/PublicPages";
import {
  CommunityPage,
  DashboardCampaignsPage,
  DashboardHomePage,
  DashboardServersPage,
  EarningsPage,
  LeaderboardsPage,
  PlaceholderDashboardPage,
  ProfilePage,
  ProgressPage,
  QuestsPage,
  ReferralsPage,
  SparksShopPage,
} from "../routes/DashboardPages";
import {
  CampaignBalancePage,
  CampaignWizardPage,
  IntegrationsPage,
  OwnerAnalyticsPage,
  OwnerDashboardPage,
  OwnerSettingsPage,
  ServerOnboardingPage,
} from "../routes/OwnerPages";
import {
  AdminGenericPage,
  AdminLayout,
  AdminOverviewPage,
  CampaignReviewPage,
  WithdrawalReviewPage,
} from "../routes/AdminPages";
import { AuthPage } from "../routes/AuthPages";

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="servers" element={<BrowseServersPage />} />
        <Route path="servers/:slug" element={<ServerDetailPage />} />
        <Route path="campaigns" element={<BrowseCampaignsPage />} />
        <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="for-server-owners" element={<HowItWorksPage owners />} />
        <Route path="safety" element={<LegalPage type="safety" />} />
        <Route path="guidelines" element={<LegalPage type="guidelines" />} />
        <Route path="terms" element={<LegalPage type="terms" />} />
        <Route path="privacy" element={<LegalPage type="privacy" />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>
      <Route path="sign-in" element={<AuthPage mode="sign-in" />} />
      <Route path="register" element={<AuthPage mode="register" />} />
      <Route element={<DashboardLayout />}>
        <Route path="dashboard" element={<DashboardHomePage />} />
        <Route path="dashboard/servers" element={<DashboardServersPage />} />
        <Route path="dashboard/campaigns" element={<DashboardCampaignsPage />} />
        <Route path="dashboard/progress" element={<ProgressPage />} />
        <Route path="dashboard/earnings" element={<EarningsPage />} />
        <Route path="dashboard/quests" element={<QuestsPage />} />
        <Route path="dashboard/sparks-shop" element={<SparksShopPage />} />
        <Route path="dashboard/leaderboards" element={<LeaderboardsPage />} />
        <Route path="dashboard/community" element={<CommunityPage />} />
        <Route path="dashboard/referrals" element={<ReferralsPage />} />
        <Route path="dashboard/profile" element={<ProfilePage />} />
        <Route
          path="dashboard/settings"
          element={
            <PlaceholderDashboardPage
              title="Settings"
              description="Profile, notifications, privacy, payout method, and security."
            />
          }
        />
        <Route path="owner" element={<OwnerDashboardPage />} />
        <Route path="owner/servers/new" element={<ServerOnboardingPage />} />
        <Route path="owner/campaigns/new" element={<CampaignWizardPage />} />
        <Route path="owner/analytics" element={<OwnerAnalyticsPage />} />
        <Route path="owner/balance" element={<CampaignBalancePage />} />
        <Route path="owner/integrations" element={<IntegrationsPage />} />
        <Route path="owner/settings" element={<OwnerSettingsPage />} />
      </Route>
      <Route
        path="/admin/*"
        element={
          <AdminLayout>
            <Routes>
              <Route index element={<AdminOverviewPage />} />
              <Route path="campaigns" element={<CampaignReviewPage />} />
              <Route path="withdrawals" element={<WithdrawalReviewPage />} />
              <Route
                path="ledger"
                element={
                  <AdminGenericPage
                    title="Internal Ledger"
                    description="Restricted earnings, Sparks, and campaign-credit records."
                    type="ledger"
                  />
                }
              />
              <Route
                path="audit-logs"
                element={
                  <AdminGenericPage
                    title="Audit Logs"
                    description="Append-only records for important administrative actions."
                    type="audit"
                  />
                }
              />
              <Route
                path="users"
                element={
                  <AdminGenericPage
                    title="Users"
                    description="Account states, roles, moderation context, and privacy-safe risk summaries."
                  />
                }
              />
              <Route
                path="servers"
                element={
                  <AdminGenericPage
                    title="Servers"
                    description="Listings, verification, moderation, ownership, and connection health."
                  />
                }
              />
              <Route
                path="ownership"
                element={
                  <AdminGenericPage
                    title="Ownership Verification"
                    description="Manual evidence review with future provider adapter support."
                  />
                }
              />
              <Route
                path="milestones"
                element={
                  <AdminGenericPage
                    title="Milestone Templates"
                    description="Allowed requirements, verification methods, ranges, and abuse risk."
                  />
                }
              />
              <Route
                path="participations"
                element={
                  <AdminGenericPage
                    title="Participations"
                    description="Player campaign history and current verification states."
                  />
                }
              />
              <Route
                path="disputes"
                element={
                  <AdminGenericPage
                    title="Completion Disputes"
                    description="Evidence, configuration snapshots, timelines, and escalation."
                  />
                }
              />
              <Route
                path="payments"
                element={
                  <AdminGenericPage
                    title="Payment Events"
                    description="Idempotent mock-provider webhooks and reconciliation state."
                  />
                }
              />
              <Route
                path="promotional-credits"
                element={
                  <AdminGenericPage
                    title="Promotional Credits"
                    description="Non-refundable, non-transferable, expiring campaign grants."
                  />
                }
              />
              <Route
                path="fraud"
                element={
                  <AdminGenericPage
                    title="Fraud Flags"
                    description="Privacy-conscious signals routed to proportionate human review."
                  />
                }
              />
              <Route
                path="reports"
                element={
                  <AdminGenericPage
                    title="Reports"
                    description="Safety, campaign, server, user, and community reports."
                  />
                }
              />
              <Route
                path="reviews"
                element={
                  <AdminGenericPage
                    title="Reviews"
                    description="Public server review moderation, separate from private feedback."
                  />
                }
              />
              <Route
                path="feature-flags"
                element={
                  <AdminGenericPage
                    title="Feature Flags"
                    description="Controlled rollout for integrations and product features."
                  />
                }
              />
              <Route
                path="settings"
                element={
                  <AdminGenericPage
                    title="System Settings"
                    description="Restricted platform thresholds, provider adapters, and policies."
                  />
                }
              />
            </Routes>
          </AdminLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
