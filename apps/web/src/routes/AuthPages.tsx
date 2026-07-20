import { ArrowLeft, Check, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Badge, Button } from "@nortix/ui";
import { Brand } from "../components/Brand";
import { firebaseActions, firebaseConfigured } from "../lib/firebase";
import { markNortixAccountSession } from "../lib/auth-session";
import { useI18n } from "../lib/i18n";

export function AuthPage({ mode }: { mode: "sign-in" | "register" }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const next = searchParams.get("next");
  const safeNext = next?.startsWith("/") ? next : "/dashboard";
  const reason = searchParams.get("reason");
  const continuation = `next=${encodeURIComponent(safeNext)}${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "register") await firebaseActions.register(email, password);
      else await firebaseActions.signIn(email, password);
      markNortixAccountSession();
      navigate(safeNext);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("auth.failed"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-aside">
        <Brand />
        <div>
          <Badge tone="success">{t("auth.trusted")}</Badge>
          <h1>{mode === "register" ? t("auth.registerTitle") : t("auth.signInTitle")}</h1>
          <p>{t("auth.intro")}</p>
          {reason && (
            <div className="auth-requirement">
              <ShieldCheck />
              <span>
                <strong>{t("auth.accountRequired")}</strong>
                <small>
                  {reason === "server" ? t("auth.serverReason") : t("auth.campaignReason")}
                </small>
              </span>
            </div>
          )}
          <div className="auth-benefits">
            <span>
              <Check /> {t("auth.moderated")}
            </span>
            <span>
              <Check /> {t("auth.verified")}
            </span>
            <span>
              <Check /> {t("auth.sparks")}
            </span>
            <span>
              <Check /> {t("auth.privacy")}
            </span>
          </div>
        </div>
        <small>{t("auth.affiliation")}</small>
      </div>
      <main className="auth-main">
        <Link to="/" className="auth-back">
          <ArrowLeft /> {t("auth.back")}
        </Link>
        <form className="auth-card" onSubmit={submit}>
          <span className="auth-icon">{mode === "register" ? <ShieldCheck /> : <KeyRound />}</span>
          <h2>{mode === "register" ? t("auth.createProfile") : t("auth.signInTo")}</h2>
          <p>{mode === "register" ? t("auth.registerDescription") : t("auth.signInDescription")}</p>
          <button
            type="button"
            className="google-button"
            onClick={async () => {
              await firebaseActions.google();
              markNortixAccountSession();
              navigate(safeNext);
            }}
          >
            <b>G</b> {t("auth.google")}
          </button>
          <div className="or">
            <span>{t("auth.orEmail")}</span>
          </div>
          <label>
            {t("auth.email")}
            <span>
              <Mail />
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </span>
          </label>
          <label>
            {t("auth.password")}
            <span>
              <KeyRound />
              <input
                required
                minLength={8}
                type={show ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}
              >
                {show ? <EyeOff /> : <Eye />}
              </button>
            </span>
          </label>
          {mode === "sign-in" && (
            <button
              type="button"
              className="text-button"
              onClick={async () => {
                if (email) {
                  await firebaseActions.reset(email);
                  setMessage(t("auth.resetRequested"));
                }
              }}
            >
              {t("auth.forgot")}
            </button>
          )}
          {message && <p className="auth-message">{message}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "register" ? "Create profile" : "Sign in"}
          </Button>
          <small className="auth-terms">
            {mode === "register" ? (
              <>
                {t("auth.byCreating")} <Link to="/terms">{t("nav.terms")}</Link> {t("auth.and")}{" "}
                <Link to="/privacy">{t("auth.privacyPolicy")}</Link>.
                <br />
                {t("auth.haveAccount")}{" "}
                <Link to={`/sign-in?${continuation}`}>{t("nav.signIn")}</Link>
              </>
            ) : (
              <>
                {t("auth.new")} <Link to="/register">{t("auth.create")}</Link>
              </>
            )}
          </small>
          {!firebaseConfigured && <p className="demo-notice">{t("auth.prototype")}</p>}
        </form>
      </main>
    </div>
  );
}
