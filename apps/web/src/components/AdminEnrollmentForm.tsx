import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { Button } from "@nortix/ui";
import { api } from "../lib/api";

type AdminEnrollmentFormProps = {
  username?: string;
  onEnrolled?: () => void;
};

export function AdminEnrollmentForm({
  username,
  onEnrolled,
}: AdminEnrollmentFormProps) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api("/admin/enrollment/redeem", {
        method: "POST",
        body: JSON.stringify({ token: token.trim() }),
      });
      setToken("");
      await queryClient.refetchQueries({ queryKey: ["current-user"], type: "active" });
      onEnrolled?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The enrollment could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-enrollment-form" onSubmit={submit}>
      <div>
        <strong>Redeem a single-use admin code</strong>
        <small>
          {username
            ? `The administrator role will be granted to @${username}.`
            : "The administrator role will be granted to the signed-in Nortix account."}
        </small>
      </div>
      <label>
        One-time enrollment code
        <span>
          <KeyRound />
          <input
            required
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="nortix_admin_..."
            aria-describedby={message ? "admin-enrollment-message" : undefined}
          />
        </span>
      </label>
      {message && (
        <p id="admin-enrollment-message" role="alert">
          {message}
        </p>
      )}
      <Button type="submit" disabled={busy || token.trim().length === 0}>
        <KeyRound />
        {busy ? "Verifying code…" : "Grant administrator access"}
      </Button>
      <small>
        Codes expire after 10 minutes, work once, and never replace normal account sign-in.
      </small>
    </form>
  );
}
