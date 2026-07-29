import { describe, expect, it } from "vitest";
import { MAX_STORE_IMAGE_BYTES, validateStoreImage } from "./media.js";

describe("server store image validation", () => {
  it("accepts matching PNG bytes", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateStoreImage(png, "image/png")).toEqual({
      contentType: "image/png",
      extension: "png",
    });
  });

  it("rejects disguised files and oversized images", () => {
    expect(() => validateStoreImage(Buffer.from("<svg></svg>"), "image/png")).toThrow(
      "PNG, JPEG, or WebP",
    );
    expect(() =>
      validateStoreImage(
        Buffer.concat([
          Buffer.from([0xff, 0xd8, 0xff]),
          Buffer.alloc(MAX_STORE_IMAGE_BYTES),
        ]),
        "image/jpeg",
      ),
    ).toThrow("2 MB");
  });
});
