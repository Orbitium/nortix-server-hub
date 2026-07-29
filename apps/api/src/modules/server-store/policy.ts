export const serverStorePlaceholders = [
  "%player%",
  "%amount%",
  "%quantity%",
  "%purchase_id%",
  "%item_id%",
  "%buyer%",
  "%recipient%",
] as const;

export const renderServerStoreCommands = (
  templates: string[],
  values: {
    player: string;
    quantity: number;
    purchaseId: string;
    itemId: string;
    buyer: string;
    recipient: string;
  },
) => {
  const replacements: Record<(typeof serverStorePlaceholders)[number], string> = {
    "%player%": values.player,
    "%amount%": String(values.quantity),
    "%quantity%": String(values.quantity),
    "%purchase_id%": values.purchaseId,
    "%item_id%": values.itemId,
    "%buyer%": values.buyer,
    "%recipient%": values.recipient,
  };
  return templates.map((template) => {
    let rendered = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      rendered = rendered.replace(new RegExp(placeholder, "gi"), value);
    }
    return rendered;
  });
};

export const calculateOwnerProceedsCents = (
  sparksAmount: number,
  centsPerThousandSparks: number,
) => Math.floor((sparksAmount * centsPerThousandSparks) / 1_000);

export const canPublishServerStore = (
  server: {
    claimed: boolean;
    verificationStatus: string;
    publicListing: boolean;
    pluginLastSeenAt: Date | null;
    pluginCapabilities: unknown;
    hasActiveSigningKey: boolean;
  },
  now = new Date(),
) =>
  server.claimed &&
  server.verificationStatus === "VERIFIED" &&
  server.publicListing &&
  server.pluginLastSeenAt !== null &&
  server.pluginLastSeenAt >= new Date(now.getTime() - 10 * 60_000) &&
  Array.isArray(server.pluginCapabilities) &&
  server.pluginCapabilities.length > 0 &&
  server.hasActiveSigningKey;

export const canRefundServerStorePurchase = (
  purchase: {
    buyerId: string;
    recipientId: string;
    status: string;
    refundEligibleUntil: Date;
  },
  actorId: string,
  now = new Date(),
) =>
  purchase.buyerId === actorId &&
  purchase.buyerId === purchase.recipientId &&
  purchase.status === "PURCHASED" &&
  purchase.refundEligibleUntil >= now;

export const calculateStoreProceedsBalance = (
  entries: ReadonlyArray<{
    direction: "CREDIT" | "DEBIT";
    amountCents: number;
    availableAt: Date;
  }>,
  now = new Date(),
) =>
  entries
    .filter((entry) => entry.availableAt <= now)
    .reduce(
      (total, entry) =>
        total + (entry.direction === "CREDIT" ? entry.amountCents : -entry.amountCents),
      0,
    );
