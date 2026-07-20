import { Globe2 } from "lucide-react";
import { localeNames, supportedLocales, useI18n } from "../lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className={`language-switcher ${compact ? "language-switcher--compact" : ""}`}>
      <Globe2 aria-hidden="true" />
      {!compact ? <span>{t("language.label")}</span> : null}
      <select
        aria-label={t("language.label")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
      >
        {supportedLocales.map((value) => (
          <option value={value} key={value}>
            {localeNames[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
