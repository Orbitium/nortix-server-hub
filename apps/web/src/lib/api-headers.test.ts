import { describe, expect, it } from "vitest";
import { buildApiHeaders } from "./api-headers";

describe("buildApiHeaders", () => {
  it("does not label a bodyless request as JSON", () => {
    const headers = buildApiHeaders(
      { method: "POST" },
      { Authorization: "Bearer token" },
    );

    expect(headers.get("Content-Type")).toBeNull();
    expect(headers.get("Authorization")).toBe("Bearer token");
  });

  it("labels string request bodies as JSON", () => {
    const headers = buildApiHeaders({
      method: "POST",
      body: JSON.stringify({ active: true }),
    });

    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("preserves an explicit content type", () => {
    const headers = buildApiHeaders({
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: new Blob(),
    });

    expect(headers.get("Content-Type")).toBe("image/png");
  });
});
