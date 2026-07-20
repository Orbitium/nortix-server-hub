import { BarChart3, Bell, ChevronDown, ChevronLeft, Compass, CreditCard, Crown, Gamepad2, Home, Inbox, LayoutDashboard, Menu, MessageSquare, Moon, PlusCircle, Search, Settings, ShieldCheck, Sparkles, Trophy, UserRound, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useUiStore } from "../app/store";
import { Brand } from "../components/Brand";
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

const playerNav = [
  ["/dashboard", "Home", Home],
  ["/servers", "Servers", Compass],
  ["/campaigns", "Campaigns", Gamepad2],
  ["/dashboard/progress", "My Progress", LayoutDashboard],
  ["/dashboard/quests", "Quests", Zap],
  ["/dashboard/sparks-shop", "Sparks Shop", Sparkles],
  ["/dashboard/leaderboards", "Leaderboards", Trophy],
] as const;

const ownerNav = [
  ["/owner/campaigns/new", "Create Campaign", PlusCircle],
  ["/owner", "Dashboard", Crown],
  ["/owner/analytics", "Analytics", BarChart3],
  ["/owner/balance", "Campaign Credits", CreditCard],
  ["/owner/integrations", "Plugin & Servers", Gamepad2],
  ["/owner/settings", "Settings", Settings],
] as const;

export function DashboardLayout() {
  const { navCollapsed, toggleNav, theme, toggleTheme, mobileNavOpen, setMobileNavOpen } = useUiStore();
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
      .filter((server) => `${server.name} ${server.categories.join(" ")}`.toLowerCase().includes(value))
      .slice(0, 3)
      .map((server) => ({ label: server.name, meta: "Server", href: `/servers/${server.slug}` }));
    const campaignResults = campaigns
      .filter((campaign) => `${campaign.title} ${campaign.server.name} ${campaign.category}`.toLowerCase().includes(value))
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
    <div className={`dashboard-shell ${navCollapsed ? "dashboard-shell--collapsed" : ""} ${showRightRail ? "" : "dashboard-shell--wide"} theme-${theme}`}>
      <RoleChooser />
      <aside className={`sidebar ${mobileNavOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <Brand compact={navCollapsed} />
          <button className="icon-button sidebar__close mobile-only" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
            <ChevronLeft />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Player dashboard">
          {playerNav.map(([href, label, Icon]) => (
            <NavLink key={href} to={href} end={href === "/dashboard"} onClick={() => setMobileNavOpen(false)} title={navCollapsed ? label : undefined}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">For server owners</span>
          {ownerNav.map(([href, label, Icon]) => (
            <NavLink key={href} to={href} end={href === "/owner"} onClick={() => setMobileNavOpen(false)} title={navCollapsed ? label : undefined}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__bottom">
          <div className="sidebar__utility">
            <button onClick={toggleTheme} aria-label="Toggle theme">
              <Moon size={17} />
            </button>
            <NavLink to="/dashboard/settings" aria-label="Settings">
              <Settings size={17} />
            </NavLink>
            <button onClick={toggleNav} aria-label="Collapse navigation">
              <ChevronLeft className={navCollapsed ? "rotate-180" : ""} size={17} />
            </button>
          </div>
        </div>
      </aside>

      <header className="topbar">
        <button className="icon-button mobile-only" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
          <Menu />
        </button>
        <div className="global-search-wrap">
          <label className="global-search">
            <Search size={17} />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search servers, campaigns..." aria-label="Global search" />
            <kbd>Ctrl K</kbd>
          </label>
          {query && (
            <div className="global-search-results">
              {results.length ? (
                results.map((result) => (
                  <button key={`${result.meta}-${result.label}`} onClick={() => openResult(result.href)}>
                    <span>{result.label}</span>
                    <small>{result.meta}</small>
                  </button>
                ))
              ) : (
                <p>No matching servers or campaigns.</p>
              )}
            </div>
          )}
        </div>
        <div className="topbar__actions">
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
              {(inboxSummary?.unreadNotifications ?? 0) > 0 ? <span className="notification-dot" /> : null}
            </button>
            {notificationsOpen && (
              <div className="admin-message-popover inbox-popover">
                <header>
                  <span><Bell /> Notifications</span>
                  <small>{inboxSummary?.unreadNotifications ?? 0} unread</small>
                </header>
                {notificationItems.slice(0, 4).map((item) => (
                  <button className="inbox-popover__item" key={item.id} onClick={() => openNotification(item.id, item.actionUrl)}>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </button>
                ))}
                {notificationItems.length === 0 ? <article><strong>You’re caught up</strong><p>No unread notifications.</p></article> : null}
                <NavLink to="/dashboard/inbox" onClick={() => setNotificationsOpen(false)}>Open notification center</NavLink>
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
              {(inboxSummary?.unreadMessages ?? 0) > 0 ? <span className="notification-dot" /> : null}
            </button>
            {messagesOpen && (
              <div className="admin-message-popover inbox-popover">
                <header>
                  <span>
                    <ShieldCheck /> Messages from Nortix
                  </span>
                  <small>{inboxSummary?.unreadMessages ?? 0} unread</small>
                </header>
                {messageItems.slice(0, 4).map((delivery) => (
                  <button className="inbox-popover__item" key={delivery.id} onClick={() => openMessage(delivery.id, delivery.message.actionUrl)}>
                    <strong>{delivery.message.title}</strong>
                    <p>{delivery.message.body}</p>
                  </button>
                ))}
                {messageItems.length === 0 ? <article><strong>You’re caught up</strong><p>No unread messages from Nortix.</p></article> : null}
                <NavLink to="/dashboard/inbox" onClick={() => setMessagesOpen(false)}>Open message center</NavLink>
              </div>
            )}
          </div>
          <button className="icon-button desktop-only" aria-label="Open inbox" onClick={() => navigate("/dashboard/inbox")}>
            <Inbox />
          </button>
          <NavLink to="/dashboard/profile" className="profile-trigger">
            <span className="avatar avatar--pixel">
              {(currentUser?.username ?? "NX").slice(0, 2).toUpperCase()}
            </span>
            <span>
              <strong>{currentUser?.displayName ?? currentUser?.username ?? "Nortix account"}</strong>
              <small>Level {currentUser?.testerLevel ?? "—"}</small>
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
              <strong>{sparksSummary?.balance.toLocaleString() ?? "—"}</strong>
              <NavLink to="/dashboard/sparks-shop">Explore shop</NavLink>
            </div>
          </div>

          <div className="rail-card rail-card--quest">
            <div className="rail-card__heading">
              <span>
                <Zap size={17} /> Daily quest
              </span>
              <small>11h 32m</small>
            </div>
            <div className="quest-row">
              <strong className="rail-title">{dailyQuest?.title ?? "No active quest"}</strong>
              <span>{dailyQuest?.progress ?? 0} / {dailyQuest?.target ?? 0}</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${dailyQuest ? Math.min(dailyQuest.progress / dailyQuest.target, 1) * 100 : 0}%` }} />
            </div>
            <p>
              Potential: <b>Up to {dailyQuest?.sparksReward ?? 0} Sparks</b>
            </p>
            <NavLink className="rail-action" to="/dashboard/quests">View quest details</NavLink>
          </div>

          <div className="rail-card streak-card">
            <div className="rail-card__heading">
              <span>
                <Crown size={18} /> Your streak
              </span>
              <b>Not tracked</b>
            </div>
            <p>Streak tracking is unavailable until a persisted activity endpoint is enabled.</p>
            <div className="streak-days">
              {["—", "—", "—", "—", "—", "—", "—"].map((day, index) => (
                <i key={`${day}-${index}`}>
                  {day}
                </i>
              ))}
            </div>
            <button className="rail-action" disabled>
              Activity endpoint required
            </button>
          </div>

          <div className="rail-card rail-leaderboard">
            <div className="rail-card__heading">
              <span>
                <Trophy size={17} /> Leaderboard
              </span>
              <button>
                This month <ChevronDown size={12} />
              </button>
            </div>
            <div className="mini-leaderboard">
              {railLeaders.map((entry, index) => (
                <div className={entry.username === currentUser?.username ? "is-current" : ""} key={entry.username}>
                  <b>{index + 1}</b>
                  <span className="avatar avatar--small">{entry.username.slice(0, 2)}</span>
                  <span>
                    <strong>{entry.displayName ?? entry.username}</strong>
                    <small>Level {entry.testerLevel}</small>
                  </span>
                  <em>{entry.reputationScore} rep</em>
                </div>
              ))}
            </div>
            <NavLink className="leaderboard-link" to="/dashboard/leaderboards">
              View full leaderboard
            </NavLink>
          </div>
        </aside>
      )}

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/dashboard">
          <Home />
          <span>Home</span>
        </NavLink>
        <NavLink to="/campaigns">
          <Gamepad2 />
          <span>Playtests</span>
        </NavLink>
        <NavLink to="/dashboard/progress">
          <BarChart3 />
          <span>Progress</span>
        </NavLink>
        <NavLink to="/dashboard/profile">
          <UserRound />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
