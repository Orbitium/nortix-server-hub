import { describe, expect, it } from "vitest";
import { renderServerStoreCommands } from "./policy.js";

describe("server store command rendering", () => {
  it("renders only server-approved values into the command snapshot", () => {
    expect(
      renderServerStoreCommands(
        ["give %PLAYER% diamond %amount%", "say %recipient% received %item_id%"],
        {
          player: "Steve",
          quantity: 3,
          purchaseId: "purchase-1",
          itemId: "diamonds",
          buyer: "buyer",
          recipient: "friend",
        },
      ),
    ).toEqual(["give Steve diamond 3", "say friend received diamonds"]);
  });
});
