import { Menu, ShieldCheck } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Brand } from "../components/Brand";
import { useUiStore } from "../app/store";

export function PublicLayout() {
  const { mobileNavOpen, setMobileNavOpen } = useUiStore();
  return (
    <div className="public-shell">
      <header className="public-header">
        <Brand />
        <nav
          className={mobileNavOpen ? "public-nav public-nav--open" : "public-nav"}
          aria-label="Primary"
        >
          <NavLink to="/servers">Servers</NavLink>
          <NavLink to="/campaigns">Campaigns</NavLink>
          <NavLink to="/how-it-works">For players</NavLink>
          <NavLink to="/for-server-owners">For server owners</NavLink>
          <NavLink to="/safety">
            <ShieldCheck size={15} /> Safety
          </NavLink>
        </nav>
        <div className="public-header__actions">
          <Link className="button button--ghost" to="/sign-in">
            Sign in
          </Link>
          <Link className="button button--primary" to="/register">
            Join Nortix
          </Link>
          <button
            className="icon-button mobile-only"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle menu"
          >
            <Menu />
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="public-footer">
        <div>
          <Brand />
          <p>Discover Minecraft servers worth playing.</p>
        </div>
        <div>
          <strong>Explore</strong>
          <Link to="/servers">Servers</Link>
          <Link to="/campaigns">Campaigns</Link>
          <Link to="/how-it-works">How it works</Link>
        </div>
        <div>
          <strong>Trust</strong>
          <Link to="/safety">Safety</Link>
          <Link to="/guidelines">Guidelines</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
        <div>
          <strong>Nortix</strong>
          <Link to="/contact">Contact</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/dashboard">Open dashboard</Link>
        </div>
        <small>© 2026 Nortix Labs. Not affiliated with Mojang Studios or Microsoft.</small>
      </footer>
    </div>
  );
}
