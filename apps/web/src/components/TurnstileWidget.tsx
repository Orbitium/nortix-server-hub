import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { ShimmerBlock } from "./LoadingSkeletons";

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | undefined;
const loadTurnstile = () => {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-nortix-turnstile]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("CAPTCHA failed to load.")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.nortixTurnstile = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("CAPTCHA failed to load."));
    document.head.append(script);
  });
  return scriptPromise;
};

export function TurnstileWidget({
  resetKey,
  onToken,
}: {
  resetKey: number;
  onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | undefined;
    onToken("");
    setLoading(true);
    setMessage("");
    Promise.all([
      loadTurnstile(),
      api<{ turnstileSiteKey: string }>("/voting/config"),
    ])
      .then(([, config]) => {
        if (cancelled || !container.current || !window.turnstile) return;
        setLoading(false);
        setMessage("");
        widgetId = window.turnstile.render(container.current, {
          sitekey: config.turnstileSiteKey,
          action: "server-vote",
          theme: "auto",
          callback: (token) => onToken(token),
          "expired-callback": () => {
            onToken("");
            setMessage("CAPTCHA expired. Complete it again.");
          },
          "error-callback": () => {
            onToken("");
            setMessage("CAPTCHA could not be completed. Please retry.");
          },
        });
      })
      .catch(() => {
        setLoading(false);
        setMessage("CAPTCHA could not be loaded. Check your connection and retry.");
      });
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken, resetKey]);

  return (
    <div className="turnstile-wrap">
      <div ref={container} />
      {loading ? (
        <>
          <ShimmerBlock width={300} height={65} />
          <span className="sr-only" role="status">Loading secure CAPTCHA</span>
        </>
      ) : null}
      {message ? <small role="status">{message}</small> : null}
    </div>
  );
}
