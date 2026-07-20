import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  Compass,
  CreditCard,
  Crown,
  Gamepad2,
  Home,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Moon,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useUiStore } from "../app/store";
import { Brand } from "../components/Brand";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { RoleChooser } from "../components/RoleChooser";
import {
  useCurrentUser,
  useDailyQuests,
  useInboxMessages,
  useInboxSummary,
  useLeaderboard,
  useNotifications,
  usePublicCampaigns,
  usePublicServers,
  useSparksSummary,
} from "../features/api-data";
import { api } from "../lib/api";
import { useI18n, type TranslationKey } from "../lib/i18n";

const playerNav = [
  ["/dashboard", "nav.home", Home],
  ["/servers", "nav.servers", Compass],
  ["/campaigns", "nav.campaigns", Gamepad2],
  ["/dashboard/progress", "nav.progress", LayoutDashboard],
  ["/dashboard/quests", "nav.quests", Zap],
  ["/dashboard/sparks-shop", "nav.sparksShop", Sparkles],
  ["/dashboard/leaderboards", "nav.leaderboards", Trophy],
] as const satisfies ReadonlyArray<readonly [string, TranslationKey, typeof Home]>;

const ownerNav = [
  ["/owner/campaigns/new", "nav.createCampaign", PlusCircle],
  ["/owner", "nav.dashboard", Crown],
  ["/owner/analytics", "nav.analytics", BarChart3],
  ["/owner/balance", "nav.credits", CreditCard],
  ["/owner/integrations", "nav.plugins", Gamepad2],
  ["/owner/settings", "nav.settings", Settings],
] as const satisfies ReadonlyArray<readonly [string, TranslationKey, typeof Home]>;

export function DashboardLayout() {
  const { t, formatNumber } = useI18n();
  const { navCollapsed, toggleNav, theme, toggleTheme, mobileNavOpen, setMobileNavOpen } =
    useUiStore();
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const queryClient = useQueryClient();
  const showRightRail = location.pathname === "/dashboard";
  const { data: serverData } = usePublicServers();
  const { data: campaignData } = usePublicCampaigns();
  const { data: currentUser } = useCurrentUser();
  const { data: sparksSummary } = useSparksSummary();
  const { data: leaderboardData } = useLeaderboard();
  const { data: dailyQuests = [] } = useDailyQuests();
  const servers = serverData?.items ?? [];
  const campaigns = campaignData?.items ?? [];
  const railLeaders = leaderboardData?.slice(0, 5) ?? [];
  const dailyQuest = dailyQuests[0];
  const { data: inboxSummary } = useInboxSummary();
  const { data: notificationItems = [] } = useNotifications(true);
  const { data: messageItems = [] } = useInboxMessages(true);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setQuery("");
        setMessagesOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return [];
    const serverResults = servers
      .filter((server) =>
        `${server.name} ${server.categories.join(" ")}`.toLowerCase().includes(value),
      )
      .slice(0, 3)
      .map((server) => ({ label: server.name, meta: "Server", href: `/servers/${server.slug}` }));
    const campaignResults = campaigns
      .filter((campaign) =>
        `${campaign.title} ${campaign.server.name} ${campaign.category}`
          .toLowerCase()
          .includes(value),
      )
      .slice(0, 3)
      .map((campaign) => ({
        label: campaign.title,
        meta: `Campaign · ${campaign.minimumSparksReward}–${campaign.maximumSparksReward} Sparks`,
        href: `/campaigns/${campaign.id}`,
      }));
    return [...serverResults, ...campaignResults];
  }, [query]);

  const openResult = (href: string) => {
    setQuery("");
    navigate(href);
  };

  const refreshInbox = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] }),
      queryClient.invalidateQueries({ queryKey: ["inbox-summary"] }),
    ]);
  };

  const openNotification = async (id: string, actionUrl?: string | null) => {
    await api(`/notifications/${id}/read`, { method: "PATCH" });
    await refreshInbox();
    setNotificationsOpen(false);
    if (actionUrl) navigate(actionUrl);
  };

  const openMessage = async (id: string, actionUrl?: string | null) => {
    await api(`/messages/${id}/read`, { method: "PATCH" });
    await refreshInbox();
    setMessagesOpen(false);
    if (actionUrl) navigate(actionUrl);
  };

  return (
    <div
      className={`dashboard-shell ${navCollapsed ? "dashboard-shell--collapsed" : ""} ${showRightRail ? "" : "dashboard-shell--wide"} theme-${theme}`}
    >
      <RoleChooser />
      <aside className={`sidebar ${mobileNavOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <Brand compact={navCollapsed} />
          <button
            className="icon-button sidebar__close mobile-only"
            onClick={() => setMobileNavOpen(false)}
            aria-label={t("dashboard.closeNav")}
          >
            <ChevronLeft />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Player dashboard">
          {playerNav.map(([href, label, Icon]) => (
            <NavLink
              key={href}
              to={href}
              end={href === "/dashboard"}
              onClick={() => setMobileNavOpen(false)}
              title={navCollapsed ? t(label) : undefined}
            >
              <Icon size={18} />
              <span>{t(label)}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">{t("nav.forOwners")}</span>
          {ownerNav.map(([href, label, Icon]) => (
            <NavLink
              key={href}
              to={href}
              end={href === "/owner"}
              onClick={() => setMobileNavOpen(false)}
              title={navCollapsed ? t(label) : undefined}
            >
              <Icon size={18} />
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__bottom">
          <div className="sidebar__utility">
            <button onClick={toggleTheme} aria-label={t("dashboard.toggleTheme")}>
              <Moon size={17} />
            </button>
            <NavLink to="/dashboard/settings" aria-label={t("nav.settings")}>
              <Settings size={17} />
            </NavLink>
            <button onClick={toggleNav} aria-label={t("dashboard.collapseNav")}>
              <ChevronLeft className={navCollapsed ? "rotate-180" : ""} size={17} />
            </button>
          </div>
        </div>
      </aside>

      <header className="topbar">
        <button
          className="icon-button mobile-only"
          onClick={() => setMobileNavOpen(true)}
          aria-label={t("dashboard.openNav")}
        >
          <Menu />
        </button>
        <div className="global-search-wrap">
          <label className="global-search">
            <Search size={17} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("dashboard.search")}
              aria-label={t("dashboard.globalSearch")}
            />
            <kbd>Ctrl K</kbd>
          </label>
          {query && (
            <div className="global-search-results">
              {results.length ? (
                results.map((result) => (
                  <button
                    key={`${result.meta}-${result.label}`}
                    onClick={() => openResult(result.href)}
                  >
                    <span>{result.label}</span>
                    <small>{result.meta}</small>
                  </button>
                ))
              ) : (
                <p>{t("dashboard.noMatches")}</p>
              )}
            </div>
          )}
        </div>
        <div className="topbar__actions">
          <LanguageSwitcher compact />
          <div className="message-center">
            <button
              className="icon-button"
              aria-label={`${inboxSummary?.unreadNotifications ?? 0} unread notifications`}
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((value) => !value);
                setMessagesOpen(false);
              }}
            >
              <Bell />
              {(inboxSummary?.unreadNotifications ?? 0) > 0 ? (
                <span className="notification-dot" />
              ) : null}
            </button>
            {notificationsOpen && (
              <div className="admin-message-popover inbox-popover">
                <header>
                  <span>
                    <Bell /> {t("dashboard.notifications")}
                  </span>
                  <small>
                    {t("dashboard.unread", { count: inboxSummary?.unreadNotifications ?? 0 })}
                  </small>
                </header>
                {notificationItems.slice(0, 4).map((item) => (
                  <button
                    className="inbox-popover__item"
                    key={item.id}
                    onClick={() => openNotification(item.id, item.actionUrl)}
                  >
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </button>
                ))}
                {notificationItems.length === 0 ? (
                  <article>
                    <strong>{t("dashboard.caughtUp")}</strong>
                    <p>{t("dashboard.noNotifications")}</p>
                  </article>
                ) : null}
                <NavLink to="/dashboard/inbox" onClick={() => setNotificationsOpen(false)}>
                  {t("dashboard.openNotifications")}
                </NavLink>
              </div>
            )}
          </div>
          <div className="message-center">
            <button
              className="icon-button desktop-only"
              aria-label={`${inboxSummary?.unreadMessages ?? 0} unread messages from Nortix`}
              aria-expanded={messagesOpen}
              onClick={() => {
                setMessagesOpen((value) => !value);
                setNotificationsOpen(false);
              }}
            >
              <MessageSquare />
              {(inboxSummary?.unreadMessages ?? 0) > 0 ? (
                <span className="notification-dot" />
              ) : null}
            </button>
            {messagesOpen && (
              <div className="admin-message-popover inbox-popover">
                <header>
                  <span>
                    <ShieldCheck /> {t("dashboard.messages")}
                  </span>
                  <small>
                    {t("dashboard.unread", { count: inboxSummary?.unreadMessages ?? 0 })}
                  </small>
                </header>
                {messageItems.slice(0, 4).map((delivery) => (
                  <button
                    className="inbox-popover__item"
                    key={delivery.id}
                    onClick={() => openMessage(delivery.id, delivery.message.actionUrl)}
                  >
                    <strong>{delivery.message.title}</strong>
                    <p>{delivery.message.body}</p>
                  </button>
                ))}
                {messageItems.length === 0 ? (
                  <article>
                    <strong>{t("dashboard.caughtUp")}</strong>
                    <p>{t("dashboard.noMessages")}</p>
                  </article>
                ) : null}
                <NavLink to="/dashboard/inbox" onClick={() => setMessagesOpen(false)}>
                  {t("dashboard.openMessages")}
                </NavLink>
              </div>
            )}
          </div>
          <button
            className="icon-button desktop-only"
            aria-label={t("dashboard.openInbox")}
            onClick={() => navigate("/dashboard/inbox")}
          >
            <Inbox />
          </button>
          <NavLink to="/dashboard/profile" className="profile-trigger">
            <span className="avatar avatar--pixel">
              {(currentUser?.username ?? "NX").slice(0, 2).toUpperCase()}
            </span>
            <span>
              <strong>
                {currentUser?.displayName ?? currentUser?.username ?? t("dashboard.account")}
              </strong>
              <small>{t("dashboard.level", { level: currentUser?.testerLevel ?? "—" })}</small>
            </span>
            <ChevronDown size={14} />
          </NavLink>
        </div>
      </header>

      <main className="dashboard-main">
        <Outlet />
      </main>

      {showRightRail && (
        <aside className="right-rail">
          <div className="rail-balances rail-balances--sparks-only">
            <div className="rail-balance rail-balance--sparks">
              <span>
                <Sparkles size={15} /> Sparks
              </span>
              <strong>{sparksSummary ? formatNumber(sparksSummary.balance) : "—"}</strong>
              <NavLink to="/dashboard/sparks-shop">{t("dashboard.exploreShop")}</NavLink>
            </div>
          </div>

          <div className="rail-card rail-card--quest">
            <div className="rail-card__heading">
              <span>
                <Zap size={17} /> {t("dashboard.dailyQuest")}
              </span>
              <small>11h 32m</small>
            </div>
            <div className="quest-row">
              <strong className="rail-title">{dailyQuest?.title ?? t("dashboard.noQuest")}</strong>
              <span>
                {dailyQuest?.progress ?? 0} / {dailyQuest?.target ?? 0}
              </span>
            </div>
            <div className="progress-track">
              <span
                style={{
                  width: `${dailyQuest ? Math.min(dailyQuest.progress / dailyQuest.target, 1) * 100 : 0}%`,
                }}
              />
            </div>
            <p>{t("dashboard.potential", { count: dailyQuest?.sparksReward ?? 0 })}</p>
            <NavLink className="rail-action" to="/dashboard/quests">
              {t("dashboard.questDetails")}
            </NavLink>
          </div>

          <div className="rail-card streak-card">
            <div className="rail-card__heading">
              <span>
                <Crown size={18} /> {t("dashboard.streak")}
              </span>
              <b>{t("dashboard.notTracked")}</b>
            </div>
            <p>{t("dashboard.streakUnavailable")}</p>
            <div className="streak-days">
              {["—", "—", "—", "—", "—", "—", "—"].map((day, index) => (
                <i key={`${day}-${index}`}>{day}</i>
              ))}
            </div>
            <button className="rail-action" disabled>
              {t("dashboard.endpointRequired")}
            </button>
          </div>

          <div className="rail-card rail-leaderboard">
            <div className="rail-card__heading">
              <span>
                <Trophy size={17} /> {t("dashboard.leaderboard")}
              </span>
              <button>
                {t("dashboard.thisMonth")} <ChevronDown size={12} />
              </button>
            </div>
            <div className="mini-leaderboard">
              {railLeaders.map((entry, index) => (
                <div
                  className={entry.username === currentUser?.username ? "is-current" : ""}
                  key={entry.username}
                >
                  <b>{index + 1}</b>
                  <span className="avatar avatar--small">{entry.username.slice(0, 2)}</span>
                  <span>
                    <strong>{entry.displayName ?? entry.username}</strong>
                    <small>{t("dashboard.level", { level: entry.testerLevel })}</small>
                  </span>
                  <em>{t("dashboard.reputation", { count: entry.reputationScore })}</em>
                </div>
              ))}
            </div>
            <NavLink className="leaderboard-link" to="/dashboard/leaderboards">
              {t("dashboard.fullLeaderboard")}
            </NavLink>
          </div>
        </aside>
      )}

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/dashboard">
          <Home />
          <span>{t("nav.home")}</span>
        </NavLink>
        <NavLink to="/campaigns">
          <Gamepad2 />
          <span>{t("nav.playtests")}</span>
        </NavLink>
        <NavLink to="/dashboard/progress">
          <BarChart3 />
          <span>{t("nav.progress")}</span>
        </NavLink>
        <NavLink to="/dashboard/profile">
          <UserRound />
          <span>{t("nav.profile")}</span>
        </NavLink>
      </nav>
    </div>
  );
}
