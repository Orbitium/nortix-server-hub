import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  Compass,
  Crown,
  Download,
  Gamepad2,
  Gift,
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
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useUiStore } from "../app/store";
import { Brand } from "../components/Brand";
import { RoleChooser } from "../components/RoleChooser";
import { campaigns, servers } from "../features/demo-data";

const playerNav = [
  ["/dashboard", "Home", Home],
  ["/servers", "Servers", Compass],
  ["/campaigns", "Campaigns", Gamepad2],
  ["/dashboard/progress", "My Progress", LayoutDashboard],
  ["/dashboard/quests", "Quests", Zap],
  ["/dashboard/sparks-shop", "Sparks Shop", Sparkles],
  ["/dashboard/leaderboards", "Leaderboards", Trophy],
  ["/dashboard/community", "Community", Users],
  ["/dashboard/referrals", "Referrals", Gift],
] as const;

const ownerNav = [
  ["/owner/campaigns/new", "Create Campaign", PlusCircle],
  ["/owner", "Dashboard", Crown],
  ["/owner/analytics", "Analytics", BarChart3],
  ["/owner/balance", "Sparks Settings", Sparkles],
  ["/owner/integrations", "Plugin & Servers", Gamepad2],
  ["/owner/settings", "Settings", Settings],
] as const;

const railLeaders = [
  ["MinaQuartz", "Level 52", "980 Sparks"],
  ["OakStorm", "Level 48", "840 Sparks"],
  ["Kxvin", "Level 45", "720 Sparks"],
  ["QuartzTester", "Level 37", "680 Sparks"],
  ["NotFilip", "Level 36", "610 Sparks"],
] as const;

const adminMessages = [
  {
    title: "Campaign review update",
    body: "Your latest submission passed the initial review and may now receive verified activity.",
    time: "12 min ago",
  },
  {
    title: "Sparks policy reminder",
    body: "Published amounts are potential upper limits. Eligibility may depend on verification.",
    time: "Yesterday",
  },
];

export function DashboardLayout() {
  const { navCollapsed, toggleNav, theme, toggleTheme, mobileNavOpen, setMobileNavOpen } =
    useUiStore();
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [questProgress, setQuestProgress] = useState(2);
  const [checkedIn, setCheckedIn] = useState(false);
  const showRightRail = location.pathname === "/dashboard";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setQuery("");
        setMessagesOpen(false);
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
      .filter((campaign) =>
        `${campaign.title} ${campaign.server.name} ${campaign.category}`.toLowerCase().includes(value),
      )
      .slice(0, 3)
      .map((campaign) => ({
        label: campaign.title,
        meta: `Campaign · Up to ${campaign.sparks} Sparks`,
        href: `/campaigns/${campaign.id}`,
      }));
    return [...serverResults, ...campaignResults];
  }, [query]);

  const openResult = (href: string) => {
    setQuery("");
    navigate(href);
  };

  return (
    <div
      className={`dashboard-shell ${navCollapsed ? "dashboard-shell--collapsed" : ""} ${showRightRail ? "" : "dashboard-shell--wide"} theme-${theme}`}
    >
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
          <button className="mod-download">
            <span>
              <strong>Nortix Mod</strong>
              <small>Connect, track and verify playtests.</small>
            </span>
            <i className="mod-download__art" aria-hidden="true" />
            <b><Download size={13} /> Download</b>
          </button>
          <div className="sidebar__utility">
            <button onClick={toggleTheme} aria-label="Toggle theme"><Moon size={17} /></button>
            <NavLink to="/admin" aria-label="Nortix admin"><ShieldCheck size={17} /></NavLink>
            <NavLink to="/dashboard/settings" aria-label="Settings"><Settings size={17} /></NavLink>
            <button onClick={toggleNav} aria-label="Collapse navigation"><ChevronLeft className={navCollapsed ? "rotate-180" : ""} size={17} /></button>
          </div>
        </div>
      </aside>

      <header className="topbar">
        <button className="icon-button mobile-only" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu /></button>
        <div className="global-search-wrap">
          <label className="global-search">
            <Search size={17} />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search servers, campaigns..." aria-label="Global search" />
            <kbd>Ctrl K</kbd>
          </label>
          {query && (
            <div className="global-search-results">
              {results.length ? results.map((result) => (
                <button key={`${result.meta}-${result.label}`} onClick={() => openResult(result.href)}>
                  <span>{result.label}</span><small>{result.meta}</small>
                </button>
              )) : <p>No matching servers or campaigns.</p>}
            </div>
          )}
        </div>
        <div className="topbar__actions">
          <button className="icon-button" aria-label="Notifications"><Bell /><span className="notification-dot" /></button>
          <div className="message-center">
            <button className="icon-button desktop-only" aria-label="Admin messages" onClick={() => setMessagesOpen((value) => !value)}>
              <MessageSquare /><span className="notification-dot" />
            </button>
            {messagesOpen && (
              <div className="admin-message-popover">
                <header><span><ShieldCheck /> Messages from Nortix</span><small>{adminMessages.length} updates</small></header>
                {adminMessages.map((message) => (
                  <article key={message.title}><strong>{message.title}</strong><p>{message.body}</p><small>{message.time}</small></article>
                ))}
                <NavLink to="/dashboard/community" onClick={() => setMessagesOpen(false)}>Open message center</NavLink>
              </div>
            )}
          </div>
          <button className="icon-button desktop-only" aria-label="Inbox"><Inbox /></button>
          <NavLink to="/dashboard/profile" className="profile-trigger">
            <span className="avatar avatar--pixel">QT</span>
            <span><strong>QuartzTester</strong><small>Level 37</small></span>
            <ChevronDown size={14} />
          </NavLink>
        </div>
      </header>

      <main className="dashboard-main"><Outlet /></main>

      {showRightRail && (
        <aside className="right-rail">
          <div className="rail-balances rail-balances--sparks-only">
            <div className="rail-balance rail-balance--sparks">
              <span><Sparkles size={15} /> Sparks</span>
              <strong>12,430</strong>
              <NavLink to="/dashboard/sparks-shop">Explore shop</NavLink>
            </div>
          </div>

          <div className="rail-card rail-card--quest">
            <div className="rail-card__heading">
              <span><Zap size={17} /> Daily quest</span><small>11h 32m</small>
            </div>
            <div className="quest-row"><strong className="rail-title">Review 3 campaigns</strong><span>{questProgress} / 3</span></div>
            <div className="progress-track"><span style={{ width: `${Math.min(questProgress / 3, 1) * 100}%` }} /></div>
            <p>Potential: <b>Up to 25 Sparks</b></p>
            <button className="rail-action" disabled={questProgress >= 3} onClick={() => setQuestProgress((value) => Math.min(value + 1, 3))}>
              {questProgress >= 3 ? "Ready for verification" : "Log campaign review"}
            </button>
          </div>

          <div className="rail-card streak-card">
            <div className="rail-card__heading"><span><Crown size={18} /> Your streak</span><b>{checkedIn ? "13 days" : "12 days"}</b></div>
            <p>Checking in could extend your streak. Up to 10 Sparks may be available at the next milestone.</p>
            <div className="streak-days">
              {["✓", "✓", "✓", "✓", "✓", checkedIn ? "✓" : "13", "14", "15"].map((day, index) => (
                <i className={index < (checkedIn ? 6 : 5) ? "done" : ""} key={`${day}-${index}`}>{day}</i>
              ))}
            </div>
            <button className="rail-action" disabled={checkedIn} onClick={() => setCheckedIn(true)}>{checkedIn ? "Checked in today" : "Check in"}</button>
          </div>

          <div className="rail-card rail-leaderboard">
            <div className="rail-card__heading"><span><Trophy size={17} /> Leaderboard</span><button>This month <ChevronDown size={12} /></button></div>
            <div className="mini-leaderboard">
              {railLeaders.map(([name, level, sparks], index) => (
                <div className={name === "QuartzTester" ? "is-current" : ""} key={name}>
                  <b>{index + 1}</b><span className="avatar avatar--small">{name.slice(0, 2)}</span>
                  <span><strong>{name}</strong><small>{level}</small></span><em>{sparks}</em>
                </div>
              ))}
            </div>
            <NavLink className="leaderboard-link" to="/dashboard/leaderboards">View full leaderboard</NavLink>
          </div>
        </aside>
      )}

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/dashboard"><Home /><span>Home</span></NavLink>
        <NavLink to="/campaigns"><Gamepad2 /><span>Playtests</span></NavLink>
        <NavLink to="/dashboard/progress"><BarChart3 /><span>Progress</span></NavLink>
        <NavLink to="/dashboard/profile"><UserRound /><span>Profile</span></NavLink>
      </nav>
    </div>
  );
}
