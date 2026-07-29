export const crackedReservationRejection = (input: {
  playedBefore: boolean;
  openLinkOwnerId?: string;
  previousLinkedOwnerId?: string;
  requesterId: string;
  claimsLastHour: number;
  claimsLastDay: number;
}) => {
  if (input.openLinkOwnerId) {
    return input.openLinkOwnerId === input.requesterId
      ? "This name is already linked by your account."
      : "This name was linked to someone else.";
  }
  if (input.playedBefore && input.previousLinkedOwnerId !== input.requesterId) {
    return "This account has played on this server before.";
  }
  if (input.claimsLastHour >= 3) return "You can reserve up to 3 cracked accounts per hour.";
  if (input.claimsLastDay >= 5) return "You can reserve up to 5 cracked accounts per 24 hours.";
  return null;
};

export const canCompleteCrackedClaim = (input: {
  status: string;
  reservedAt: Date;
  expiresAt: Date;
  occurredAt: Date;
  firstSeenAt?: Date;
  previouslyLinkedToRequester?: boolean;
}) =>
  input.status === "PENDING" &&
  input.reservedAt <= input.occurredAt &&
  input.expiresAt > input.occurredAt &&
  (input.previouslyLinkedToRequester ||
    !input.firstSeenAt ||
    input.firstSeenAt >= input.reservedAt);

export const crackedLinkInactivityDeadline = (lastLoginAt: Date) =>
  new Date(lastLoginAt.getTime() + 30 * 24 * 60 * 60_000);
