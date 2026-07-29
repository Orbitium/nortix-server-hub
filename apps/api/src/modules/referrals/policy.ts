import {
  friendReferralEarningWindowDays,
  maxFriendReferralInvitesPerMonth,
} from "@nortix/shared";

export const REFERRAL_SPARKS_REQUIREMENT = 200;
export const REFERRAL_INVITE_LIFETIME_DAYS = 30;
export const MAX_OPEN_REFERRAL_INVITES = maxFriendReferralInvitesPerMonth;
export const MAX_MONTHLY_REFERRAL_INVITES = maxFriendReferralInvitesPerMonth;
export const REFERRAL_CLAIM_WINDOW_HOURS = 24;

export const referralMonthWindow = (date = new Date()) => ({
  startsAt: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
  endsAt: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)),
});

export const referralEarningWindowEndsAt = (claimedAt: Date) =>
  new Date(claimedAt.getTime() + friendReferralEarningWindowDays * 24 * 60 * 60 * 1_000);

export const referralProgress = (creditedSparks: number) => ({
  creditedSparks: Math.max(0, creditedSparks),
  requiredSparks: REFERRAL_SPARKS_REQUIREMENT,
  qualified: creditedSparks >= REFERRAL_SPARKS_REQUIREMENT,
});
