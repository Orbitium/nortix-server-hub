export type SponsoredPurchaseStatus =
  | "REQUESTED"
  | "PROCESSING"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type SponsoredPurchaseAction =
  | "START_PROCESSING"
  | "MARK_DELIVERED"
  | "CANCEL"
  | "REFUND"
  | "CANCEL_AND_REFUND";

const allowedStatuses: Record<SponsoredPurchaseAction, readonly SponsoredPurchaseStatus[]> = {
  START_PROCESSING: ["REQUESTED"],
  MARK_DELIVERED: ["REQUESTED", "PROCESSING"],
  CANCEL: ["REQUESTED", "PROCESSING"],
  REFUND: ["REQUESTED", "PROCESSING", "DELIVERED", "CANCELLED"],
  CANCEL_AND_REFUND: ["REQUESTED", "PROCESSING", "DELIVERED", "CANCELLED"],
};

export const canTransitionSponsoredPurchase = (
  status: SponsoredPurchaseStatus,
  action: SponsoredPurchaseAction,
) => allowedStatuses[action].includes(status);

export const sponsoredPurchaseStatusAfter = (
  action: SponsoredPurchaseAction,
): SponsoredPurchaseStatus =>
  action === "START_PROCESSING"
    ? "PROCESSING"
    : action === "MARK_DELIVERED"
      ? "DELIVERED"
      : action === "CANCEL"
        ? "CANCELLED"
        : "REFUNDED";
