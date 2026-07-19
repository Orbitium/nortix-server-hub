import {
  BarChart3,
  Bell,
  ChevronLeft,
  CircleDollarSign,
  Compass,
  Crown,
  Gamepad2,
  Gift,
  Home,
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
  WalletCards,
  Zap,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Brand } from "../components/Brand";
import { useUiStore } from "../app/store";
import { leaderboard } from "../features/demo-data";

const playerNav = [
  ["/dashboard", "Home", Home],
  ["/dashboard/servers", "Servers", Compass],
  ["/dashboard/campaigns", "Campaigns", Gamepad2],
  ["/dashboard/progress", "My Progress", LayoutDashboard],
  ["/dashboard/quests", "Quests", Zap],
  ["/dashboard/sparks-shop", "Sparks Shop", Sparkles],
  ["/dashboard/leaderboards", "Leaderboards", Trophy],
  ["/dashboard/community", "Community", Users],
  ["/dashboard/referrals", "Referrals", Gift],
] as const;

const ownerNav = [
  ["/owner/campaigns/new", "Create Campaign", PlusCircle],
  ["/owner", "Owner Dashboard", Crown],
  ["/owner/analytics", "Analytics", BarChart3],
  ["/owner/balance", "Campaign Balance", WalletCards],
  ["/owner/integrations", "Integrations", Gamepad2],
  ["/owner/settings", "Settings", Settings],
] as const;

export function DashboardLayout() {
  const { navCollapsed, toggleNav, theme, toggleTheme, mobileNavOpen, setMobileNavOpen } =
    useUiStore();
  return (
    <div
      className={`dashboard-shell ${navCollapsed ? "dashboard-shell--collapsed" : ""} theme-${theme}`}
    >
      <aside className={`sidebar ${mobileNavOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <Brand compact={navCollapsed} />
          <button
            className="icon-button sidebar__close mobile-only"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
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
              title={navCollapsed ? label : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Server owner</span>
          {ownerNav.map(([href, label, Icon]) => (
            <NavLink
              key={href}
              to={href}
              end={href === "/owner"}
              onClick={() => setMobileNavOpen(false)}
              title={navCollapsed ? label : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__bottom">
          <button className="mod-download">
            <Gamepad2 />
            <span>
              <strong>Download Nortix Mod</strong>
              <small>Coming later</small>
            </span>
          </button>
          <button onClick={toggleTheme}>
            <Moon size={18} />
            <span>Theme</span>
          </button>
          <NavLink to="/dashboard/settings">
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
          <button onClick={toggleNav}>
            <ChevronLeft className={navCollapsed ? "rotate-180" : ""} size={18} />
            <span>Collapse navigation</span>
          </button>
        </div>
      </aside>
      <header className="topbar">
        <button
          className="icon-button mobile-only"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <Menu />
        </button>
        <label className="global-search">
          <Search size={18} />
          <input placeholder="Search servers, campaigns, players…" aria-label="Global search" />
          <kbd>⌘ K</kbd>
        </label>
        <div className="topbar__actions">
          <button className="icon-button" aria-label="Notifications">
            <Bell />
            <span className="notification-dot" />
          </button>
          <button className="icon-button desktop-only" aria-label="Messages">
            <MessageSquare />
          </button>
          <NavLink to="/dashboard/profile" className="profile-trigger">
            <span className="avatar">QT</span>
            <span>
              <strong>QuartzTester</strong>
              <small>Trusted Tester</small>
            </span>
          </NavLink>
        </div>
      </header>
      <main className="dashboard-main">
        <Outlet />
      </main>
      <aside className="right-rail">
        <div className="rail-card rail-card--earnings">
          <span>
            <CircleDollarSign size={18} /> Earnings
          </span>
          <strong>$48.20</strong>
          <small>Available to withdraw</small>
          <NavLink to="/dashboard/earnings">View earnings →</NavLink>
        </div>
        <div className="rail-card rail-card--sparks">
          <span>
            <Sparkles size={18} /> Sparks
          </span>
          <strong>12,430</strong>
          <small>Cosmetics & progression only</small>
          <NavLink to="/dashboard/sparks-shop">Visit shop →</NavLink>
        </div>
        <div className="rail-card">
          <div className="rail-card__heading">
            <span>
              <Zap size={17} /> Daily quest
            </span>
            <small>2h 18m</small>
          </div>
          <strong className="rail-title">Curious Explorer</strong>
          <p>View two new server pages.</p>
          <div className="progress-track">
            <span style={{ width: "50%" }} />
          </div>
          <small>1 of 2 · +120 Sparks</small>
        </div>
        <div className="rail-card streak-card">
          <span>
            <Crown size={18} /> 6 day streak
          </span>
          <div className="streak-days">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <i className={i < 6 ? "done" : ""} key={`${day}-${i}`}>
                {i < 6 ? "✓" : day}
              </i>
            ))}
          </div>
          <small>Return tomorrow for +200 Sparks</small>
        </div>
        <div className="rail-card">
          <div className="rail-card__heading">
            <span>
              <Trophy size={17} /> Top testers
            </span>
            <NavLink to="/dashboard/leaderboards">All</NavLink>
          </div>
          <div className="mini-leaderboard">
            {leaderboard.slice(0, 3).map(([name, , score], index) => (
              <div key={name}>
                <b>{index + 1}</b>
                <span className="avatar avatar--small">{name.slice(0, 2)}</span>
                <span>
                  <strong>{name}</strong>
                  <small>{score} rep</small>
                </span>
              </div>
            ))}
          </div>
        </div>
        <NavLink className="admin-link" to="/admin">
          <ShieldCheck size={17} /> Moderator panel
        </NavLink>
      </aside>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/dashboard">
          <Home />
          <span>Home</span>
        </NavLink>
        <NavLink to="/dashboard/campaigns">
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
