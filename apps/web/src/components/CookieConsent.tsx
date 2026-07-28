import { ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  clearAnalyticsCookies,
  readCookiePreferences,
  saveCookiePreferences,
  type CookiePreferences,
} from "../lib/cookie-consent";
import { setFirebaseAnalyticsConsent } from "../lib/firebase";

export function CookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(readCookiePreferences);
  const [open, setOpen] = useState(() => !readCookiePreferences());
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(() => readCookiePreferences()?.analytics ?? false);

  useEffect(() => {
    void setFirebaseAnalyticsConsent(preferences?.analytics === true);
  }, [preferences]);

  const choose = (allowAnalytics: boolean) => {
    const next = saveCookiePreferences(allowAnalytics);
    setPreferences(next);
    setAnalytics(allowAnalytics);
    setOpen(false);
    setShowDetails(false);

    if (!allowAnalytics) clearAnalyticsCookies();
  };

  if (!open) {
    return null;
  }

  return (
    <section
      className="cookie-consent"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
    >
      {preferences ? (
        <button
          className="cookie-consent__close"
          onClick={() => setOpen(false)}
          aria-label="Close cookie settings"
        >
          <X />
        </button>
      ) : null}
      <div className="cookie-consent__intro">
        <span className="cookie-consent__icon">
          <ShieldCheck />
        </span>
        <div>
          <h2 id="cookie-consent-title">Your privacy choices</h2>
          <p>
            Nortix uses essential browser storage for sign-in, security, language, your player or
            owner choice, and this consent record. With your permission, Firebase Analytics also
            measures site usage and interactions.
          </p>
          <button
            className="cookie-consent__details-button"
            onClick={() => setShowDetails((value) => !value)}
            aria-expanded={showDetails}
          >
            {showDetails ? "Hide details" : "Customize"}
          </button>
        </div>
      </div>

      {showDetails ? (
        <div className="cookie-consent__details">
          <div>
            <span>
              <strong>Essential</strong>
              <small>Always on</small>
            </span>
            <p>
              Firebase authentication persistence and saved Nortix preferences. These are required
              for account access and requested site features.
            </p>
          </div>
          <label>
            <span>
              <strong>Optional analytics</strong>
              <small>Firebase Analytics</small>
            </span>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
            />
            <p>
              Measures device and browser information, pages, and interactions so Nortix can
              understand and improve site usage. Disabled until you opt in.
            </p>
          </label>
        </div>
      ) : null}

      <div className="cookie-consent__actions">
        <Link to="/privacy" onClick={() => preferences && setOpen(false)}>
          Privacy details
        </Link>
        <button className="button button--ghost" onClick={() => choose(false)}>
          Essential only
        </button>
        {showDetails ? (
          <button className="button button--primary" onClick={() => choose(analytics)}>
            Save choices
          </button>
        ) : (
          <button className="button button--primary" onClick={() => choose(true)}>
            Accept optional analytics
          </button>
        )}
      </div>
    </section>
  );
}
