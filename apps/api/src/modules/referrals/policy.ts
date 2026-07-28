export const REFERRAL_SPARKS_REQUIREMENT = 200;
export const REFERRAL_INVITE_LIFETIME_DAYS = 30;
export const MAX_OPEN_REFERRAL_INVITES = 20;
export const REFERRAL_CLAIM_WINDOW_HOURS = 24;

export const referralProgress = (creditedSparks: number) => ({
  creditedSparks: Math.max(0, creditedSparks),
  requiredSparks: REFERRAL_SPARKS_REQUIREMENT,
  qualified: creditedSparks >= REFERRAL_SPARKS_REQUIREMENT,
});
