import { Gamepad2, ServerCog, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../lib/i18n";

const preferenceKey = "nortix-role-preference";

export function RoleChooser() {
  const navigate = useNavigate();
  const { t } = useI18n();
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
    <div
      className="role-chooser-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-title"
    >
      <section className="role-chooser">
        <button
          className="role-chooser__close"
          onClick={() => setOpen(false)}
          aria-label={t("role.close")}
        >
          <X />
        </button>
        <span className="eyebrow">WELCOME TO NORTIX</span>
        <h2 id="role-title">{t("role.title")}</h2>
        <p>{t("role.description")}</p>
        <div className="role-chooser__options">
          <button onClick={() => choose("player")}>
            <span>
              <Gamepad2 />
            </span>
            <strong>{t("role.player")}</strong>
            <small>{t("role.playerDescription")}</small>
          </button>
          <button onClick={() => choose("owner")}>
            <span>
              <ServerCog />
            </span>
            <strong>{t("role.owner")}</strong>
            <small>{t("role.ownerDescription")}</small>
          </button>
        </div>
      </section>
    </div>
  );
}
