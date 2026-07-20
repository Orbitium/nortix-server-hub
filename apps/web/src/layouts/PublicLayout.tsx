import { Menu, ShieldCheck } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useUiStore } from "../app/store";
import { Brand } from "../components/Brand";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useI18n } from "../lib/i18n";

export function PublicLayout() {
  const { mobileNavOpen, setMobileNavOpen } = useUiStore();
  const { t } = useI18n();
  return (
    <div className="public-shell">
      <header className="public-header">
        <Brand />
        <nav
          className={mobileNavOpen ? "public-nav public-nav--open" : "public-nav"}
          aria-label={t("nav.primary")}
        >
          <NavLink to="/servers">{t("nav.servers")}</NavLink>
          <NavLink to="/campaigns">{t("nav.campaigns")}</NavLink>
          <NavLink to="/how-it-works">{t("nav.forPlayers")}</NavLink>
          <NavLink to="/for-server-owners">{t("nav.forOwners")}</NavLink>
          <NavLink to="/safety">
            <ShieldCheck size={15} /> {t("nav.safety")}
          </NavLink>
          <div className="public-nav__language">
            <LanguageSwitcher />
          </div>
        </nav>
        <div className="public-header__actions">
          <LanguageSwitcher compact />
          <Link className="button button--ghost" to="/sign-in">
            {t("nav.signIn")}
          </Link>
          <Link className="button button--primary" to="/register">
            {t("nav.join")}
          </Link>
          <button
            className="icon-button mobile-only"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label={t("nav.toggleMenu")}
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
          <p>{t("footer.discover")}</p>
        </div>
        <div>
          <strong>{t("footer.explore")}</strong>
          <Link to="/servers">{t("nav.servers")}</Link>
          <Link to="/campaigns">{t("nav.campaigns")}</Link>
          <Link to="/how-it-works">{t("nav.howItWorks")}</Link>
        </div>
        <div>
          <strong>{t("footer.trust")}</strong>
          <Link to="/safety">{t("nav.safety")}</Link>
          <Link to="/guidelines">{t("nav.guidelines")}</Link>
          <Link to="/privacy">{t("nav.privacy")}</Link>
        </div>
        <div>
          <strong>Nortix</strong>
          <Link to="/contact">{t("nav.contact")}</Link>
          <Link to="/terms">{t("nav.terms")}</Link>
          <Link to="/dashboard">{t("nav.openDashboard")}</Link>
        </div>
        <small>{t("footer.legal")}</small>
      </footer>
    </div>
  );
}
