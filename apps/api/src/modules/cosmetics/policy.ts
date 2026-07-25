import type { CosmeticUnlockMethod } from "@nortix/shared";

export const isCosmeticUnlocked = ({
  unlockMethod,
  requiredLevel,
  testerLevel,
  purchased,
}: {
  unlockMethod: CosmeticUnlockMethod;
  requiredLevel: number | null;
  testerLevel: number;
  purchased: boolean;
}) => {
  if (unlockMethod === "DEFAULT") return true;
  if (unlockMethod === "LEVEL") return requiredLevel !== null && testerLevel >= requiredLevel;
  return purchased;
};

const safeHexColor = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

export const normalizeCosmeticPreview = (preview: unknown) => {
  const value =
    preview && typeof preview === "object" && !Array.isArray(preview)
      ? (preview as Record<string, unknown>)
      : {};
  return {
    primary: safeHexColor(value.primary ?? value.color, "#26364a"),
    accent: safeHexColor(value.accent, "#68e34b"),
    icon:
      typeof value.icon === "string" && /^[a-z0-9-]{1,40}$/.test(value.icon)
        ? value.icon
        : "sparkles",
    pattern:
      typeof value.pattern === "string" &&
      ["grid", "aurora", "mountains", "cosmic", "waves", "plain"].includes(value.pattern)
        ? value.pattern
        : "plain",
  };
};
