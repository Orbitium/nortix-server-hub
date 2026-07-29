import { describe, expect, it } from "vitest";
import {
  canCompleteCrackedClaim,
  crackedLinkInactivityDeadline,
  crackedReservationRejection,
} from "./minecraft-link-policy.js";

describe("server-scoped cracked account policy", () => {
  it("rejects names observed before reservation and hides the other owner", () => {
    expect(crackedReservationRejection({
      playedBefore: true,
      requesterId: "user-a",
      claimsLastHour: 0,
      claimsLastDay: 0,
    })).toMatch(/played on this server before/i);
    expect(crackedReservationRejection({
      playedBefore: false,
      openLinkOwnerId: "user-b",
      requesterId: "user-a",
      claimsLastHour: 0,
      claimsLastDay: 0,
    })).toBe("This name was linked to someone else.");
    expect(crackedReservationRejection({
      playedBefore: true,
      previousLinkedOwnerId: "user-a",
      requesterId: "user-a",
      claimsLastHour: 0,
      claimsLastDay: 0,
    })).toBeNull();
  });

  it("enforces rolling hourly and daily limits", () => {
    expect(crackedReservationRejection({
      playedBefore: false,
      requesterId: "user-a",
      claimsLastHour: 3,
      claimsLastDay: 3,
    })).toMatch(/3 cracked accounts per hour/i);
    expect(crackedReservationRejection({
      playedBefore: false,
      requesterId: "user-a",
      claimsLastHour: 1,
      claimsLastDay: 5,
    })).toMatch(/5 cracked accounts per 24 hours/i);
  });

  it("completes only on a first login inside the reservation window", () => {
    const reservedAt = new Date("2026-07-20T12:00:00Z");
    const expiresAt = new Date("2026-07-20T12:30:00Z");
    expect(canCompleteCrackedClaim({
      status: "PENDING",
      reservedAt,
      expiresAt,
      occurredAt: new Date("2026-07-20T12:29:59Z"),
      firstSeenAt: new Date("2026-07-20T12:01:00Z"),
    })).toBe(true);
    expect(canCompleteCrackedClaim({
      status: "PENDING",
      reservedAt,
      expiresAt,
      occurredAt: new Date("2026-07-20T11:59:59Z"),
    })).toBe(false);
    expect(canCompleteCrackedClaim({
      status: "PENDING",
      reservedAt,
      expiresAt,
      occurredAt: new Date("2026-07-20T12:01:00Z"),
      firstSeenAt: new Date("2026-07-20T11:59:00Z"),
    })).toBe(false);
    expect(canCompleteCrackedClaim({
      status: "PENDING",
      reservedAt,
      expiresAt,
      occurredAt: new Date("2026-07-20T12:01:00Z"),
      firstSeenAt: new Date("2026-07-01T12:00:00Z"),
      previouslyLinkedToRequester: true,
    })).toBe(true);
  });

  it("expires an active cracked link 30 days after its latest login", () => {
    expect(crackedLinkInactivityDeadline(new Date("2026-07-20T12:00:00Z")).toISOString())
      .toBe("2026-08-19T12:00:00.000Z");
  });
});
