export const crackedReservationRejection = (input: {
  playedBefore: boolean;
  openLinkOwnerId?: string;
  requesterId: string;
  claimsLastHour: number;
  claimsLastDay: number;
}) => {
  if (input.playedBefore) return "This account has played on this server before.";
  if (input.openLinkOwnerId) {
    return input.openLinkOwnerId === input.requesterId
      ? "This name is already linked by your account."
      : "This name was linked to someone else.";
  }
  if (input.claimsLastHour >= 3) return "You can reserve up to 3 cracked accounts per hour.";
  if (input.claimsLastDay >= 5) return "You can reserve up to 5 cracked accounts per 24 hours.";
  return null;
};

export const canActivateFirstJoin = (input: {
  presenceAlreadyExists: boolean;
  status: string;
  reservedAt: Date;
  expiresAt: Date;
  occurredAt: Date;
}) =>
  !input.presenceAlreadyExists &&
  input.status === "PENDING" &&
  input.reservedAt <= input.occurredAt &&
  input.expiresAt > input.occurredAt;
