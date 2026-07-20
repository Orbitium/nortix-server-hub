# Frontend localization

The web application supports English (`en`), Turkish (`tr`), Spanish (`es`), German (`de`), and
Portuguese (`pt`). The browser language is used on a first visit and the user's selection is saved
under `nortix-locale`.

User-facing product copy belongs in `apps/web/src/lib/i18n.tsx`. Components read it through
`useI18n()` and should use the provided number, date, and USD formatters instead of calling
`toLocaleString()` directly for newly localized copy.

Localization rules:

- Never translate `Nortix`, `Sparks`, plugin names, server names, campaign titles, Minecraft
  usernames, or other user-provided/custom names.
- Keep monetary display on the `$` symbol until the product supports other currencies.
- Treat backend-provided custom content as authored content; do not machine-translate it in the
  browser.
- Every new shared translation key needs a human-readable value in all five catalogs. English is
  the safe fallback if a locale entry is temporarily unavailable.
