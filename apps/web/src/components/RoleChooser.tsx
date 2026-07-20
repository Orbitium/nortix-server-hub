import { Gamepad2, ServerCog, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const preferenceKey = "nortix-role-preference";

export function RoleChooser() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!window.localStorage.getItem(preferenceKey));
  }, []);

  const choose = (role: "player" | "owner") => {
    window.localStorage.setItem(preferenceKey, role);
    setOpen(false);
    navigate(role === "owner" ? "/owner" : "/dashboard");
  };

  if (!open) return null;

  return (
    <div className="role-chooser-backdrop" role="dialog" aria-modal="true" aria-labelledby="role-title">
      <section className="role-chooser">
        <button className="role-chooser__close" onClick={() => setOpen(false)} aria-label="Close">
          <X />
        </button>
        <span className="eyebrow">WELCOME TO NORTIX</span>
        <h2 id="role-title">How will you use Nortix?</h2>
        <p>This only changes your starting workspace. You could switch areas later.</p>
        <div className="role-chooser__options">
          <button onClick={() => choose("player")}>
            <span>
              <Gamepad2 />
            </span>
            <strong>I’m a player</strong>
            <small>
              Discover servers, join optional playtests, track quests, and potentially receive
              Sparks after verification.
            </small>
          </button>
          <button onClick={() => choose("owner")}>
            <span>
              <ServerCog />
            </span>
            <strong>I own a server</strong>
            <small>
              Manage listings, create campaigns, review feedback, and configure potential Sparks
              limits.
            </small>
          </button>
        </div>
      </section>
    </div>
  );
}
