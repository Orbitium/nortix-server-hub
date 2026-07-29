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
