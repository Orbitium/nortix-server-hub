import {
  BadgeCheck,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
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
  ["/owner", "Dashboard", Crown],
  ["/owner/analytics", "Analytics", BarChart3],
  ["/owner/balance", "Payouts", WalletCards],
  ["/owner/integrations", "Plugin", Gamepad2],
  ["/owner/settings", "Settings", Settings],
] as const;

const railLeaders = [
  ["MinaQuartz", "Level 52", "$312.40"],
  ["OakStorm", "Level 48", "$287.10"],
  ["Kxvin", "Level 45", "$245.60"],
  ["QuartzTester", "Level 37", "$168.20"],
  ["NotFilip", "Level 36", "$155.30"],
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
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">For server owners</span>
          {ownerNav.map(([href, label, Icon]) => (
            <NavLink
              key={href}
              to={href}
              end={href === "/owner"}
              onClick={() => setMobileNavOpen(false)}
              title={navCollapsed ? label : undefined}
            >
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
            <b>
              <Download size={13} /> Download
            </b>
          </button>
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
        <button
          className="icon-button mobile-only"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <Menu />
        </button>
        <label className="global-search">
          <Search size={17} />
          <input placeholder="Search servers, campaigns..." aria-label="Global search" />
          <kbd>Ctrl K</kbd>
        </label>
        <div className="topbar__actions">
          <button className="icon-button" aria-label="Notifications">
            <Bell />
            <span className="notification-dot" />
          </button>
          <button className="icon-button desktop-only" aria-label="Messages">
            <MessageSquare />
          </button>
          <button className="icon-button desktop-only" aria-label="Inbox">
            <Inbox />
          </button>
          <NavLink to="/dashboard/profile" className="profile-trigger">
            <span className="avatar avatar--pixel">QT</span>
            <span>
              <strong>QuartzTester</strong>
              <small>Level 37</small>
            </span>
            <ChevronDown size={14} />
          </NavLink>
        </div>
      </header>

      <main className="dashboard-main">
        <Outlet />
      </main>

      <aside className="right-rail">
        <div className="rail-balances">
          <div className="rail-balance rail-balance--earnings">
            <span>
              <CircleDollarSign size={15} /> Earnings
            </span>
            <strong>$48.20</strong>
            <NavLink to="/dashboard/earnings">Withdraw</NavLink>
          </div>
          <div className="rail-balance rail-balance--sparks">
            <span>
              <Sparkles size={15} /> Sparks
            </span>
            <strong>12,430</strong>
            <NavLink to="/dashboard/sparks-shop">Shop</NavLink>
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
            <strong className="rail-title">Complete 3 campaigns</strong>
            <span>2 / 3</span>
          </div>
          <div className="progress-track">
            <span style={{ width: "67%" }} />
          </div>
          <p>
            Reward: <b>250 Sparks</b>
          </p>
        </div>

        <div className="rail-card streak-card">
          <div className="rail-card__heading">
            <span>
              <Crown size={18} /> Your streak
            </span>
            <b>12 days</b>
          </div>
          <p>Keep it up! Next milestone: 15 days</p>
          <div className="streak-days">
            {["✓", "✓", "✓", "✓", "✓", "13", "14", "15"].map((day, index) => (
              <i className={index < 6 ? "done" : ""} key={`${day}-${index}`}>
                {day}
              </i>
            ))}
          </div>
        </div>

        <div className="rail-card badges-card">
          <div className="rail-card__heading">
            <span>
              <BadgeCheck size={17} /> Recent badges
            </span>
            <NavLink to="/dashboard/profile">View all</NavLink>
          </div>
          <div className="recent-badges" aria-label="Recent badges">
            <i>★</i>
            <i>♜</i>
            <i>✦</i>
            <i>⚔</i>
            <i>+12</i>
          </div>
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
            {railLeaders.map(([name, level, earnings], index) => (
              <div className={name === "QuartzTester" ? "is-current" : ""} key={name}>
                <b>{index + 1}</b>
                <span className="avatar avatar--small">{name.slice(0, 2)}</span>
                <span>
                  <strong>{name}</strong>
                  <small>{level}</small>
                </span>
                <em>{earnings}</em>
              </div>
            ))}
          </div>
          <NavLink className="leaderboard-link" to="/dashboard/leaderboards">
            View full leaderboard
          </NavLink>
        </div>
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
