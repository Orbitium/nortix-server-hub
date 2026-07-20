import { ArrowLeft, Check, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Badge, Button } from "@nortix/ui";
import { Brand } from "../components/Brand";
import { firebaseActions, firebaseConfigured } from "../lib/firebase";
import { markNortixAccountSession } from "../lib/auth-session";

export function AuthPage({ mode }: { mode: "sign-in" | "register" }) {
  const navigate = useNavigate();
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
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-aside">
        <Brand />
        <div>
          <Badge tone="success">TRUSTED PLAYTESTS</Badge>
          <h1>
            {mode === "register"
              ? "Build a reputation for useful participation."
              : "Welcome back to the signal."}
          </h1>
          <p>
            Discover Minecraft communities, complete clear milestones, and help server teams
            improve.
          </p>
          {reason && (
            <div className="auth-requirement">
              <ShieldCheck />
              <span>
                <strong>Account required</strong>
                <small>
                  {reason === "server"
                    ? "Create an account before registering or publishing a server."
                    : "Create an account before joining or contributing to a campaign."}
                </small>
              </span>
            </div>
          )}
          <div className="auth-benefits">
            <span>
              <Check /> Moderated campaigns
            </span>
            <span>
              <Check /> Verified milestone rewards
            </span>
            <span>
              <Check /> Separate Sparks progression
            </span>
            <span>
              <Check /> Privacy-conscious reviews
            </span>
          </div>
        </div>
        <small>Not affiliated with Mojang Studios or Microsoft.</small>
      </div>
      <main className="auth-main">
        <Link to="/" className="auth-back">
          <ArrowLeft /> Back to Nortix
        </Link>
        <form className="auth-card" onSubmit={submit}>
          <span className="auth-icon">{mode === "register" ? <ShieldCheck /> : <KeyRound />}</span>
          <h2>{mode === "register" ? "Create your Nortix profile" : "Sign in to Nortix"}</h2>
          <p>
            {mode === "register"
              ? "One profile can playtest and manage servers."
              : "Continue to campaigns, progress, and owner tools."}
          </p>
          <button
            type="button"
            className="google-button"
            onClick={async () => {
              await firebaseActions.google();
              markNortixAccountSession();
              navigate(safeNext);
            }}
          >
            <b>G</b> Continue with Google
          </button>
          <div className="or">
            <span>or continue with email</span>
          </div>
          <label>
            Email address
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
            Password
            <span>
              <KeyRound />
              <input
                required
                minLength={8}
                type={show ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}
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
                  setMessage("Password reset email requested.");
                }
              }}
            >
              Forgot password?
            </button>
          )}
          {message && <p className="auth-message">{message}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "register" ? "Create profile" : "Sign in"}
          </Button>
          <small className="auth-terms">
            {mode === "register" ? (
              <>
                By creating a profile, you agree to the <Link to="/terms">Terms</Link> and{" "}
                <Link to="/privacy">Privacy Policy</Link>.
                <br />
                Already have an account? <Link to={`/sign-in?${continuation}`}>Sign in</Link>
              </>
            ) : (
              <>
                New to Nortix? <Link to="/register">Create a profile</Link>
              </>
            )}
          </small>
          {!firebaseConfigured && (
            <p className="demo-notice">
              Prototype mode: Firebase UI is complete; local sign-in continues with the seeded demo
              identity until credentials are added.
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
