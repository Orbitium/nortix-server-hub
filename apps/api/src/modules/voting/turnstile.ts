const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileResult = {
  success?: boolean;
  action?: string;
  "error-codes"?: string[];
};

export async function verifyVoteTurnstile(secret: string, token: string, remoteIp?: string) {
  const response = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      response: token,
      remoteip: remoteIp,
    }),
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (!response?.ok) {
    throw new Error("The CAPTCHA service could not be reached. Please try again.");
  }
  const result = (await response.json()) as TurnstileResult;
  if (!result.success || (result.action && result.action !== "server-vote")) {
    throw new Error("Complete the CAPTCHA again before voting.");
  }
}
