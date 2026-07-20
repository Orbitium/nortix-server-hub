import { describe, expect, it } from "vitest";
import {
  canActivateFirstJoin,
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

  it("activates only a first join occurring inside the reservation window", () => {
    const reservedAt = new Date("2026-07-20T12:00:00Z");
    const expiresAt = new Date("2026-07-20T12:30:00Z");
    expect(canActivateFirstJoin({
      presenceAlreadyExists: false,
      status: "PENDING",
      reservedAt,
      expiresAt,
      occurredAt: new Date("2026-07-20T12:29:59Z"),
    })).toBe(true);
    expect(canActivateFirstJoin({
      presenceAlreadyExists: false,
      status: "PENDING",
      reservedAt,
      expiresAt,
      occurredAt: new Date("2026-07-20T11:59:59Z"),
    })).toBe(false);
    expect(canActivateFirstJoin({
      presenceAlreadyExists: true,
      status: "PENDING",
      reservedAt,
      expiresAt,
      occurredAt: new Date("2026-07-20T12:01:00Z"),
    })).toBe(false);
  });
});
