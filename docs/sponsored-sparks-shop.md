# Nortix-sponsored Sparks gifts

The Sparks Shop supports a separate Nortix-sponsored gift catalog alongside permanent profile
cosmetics. Sponsored items are not cosmetics and use their own catalog, purchase, fulfillment,
refund, permission, and audit models.

## Player experience

An authenticated player can request an available gift using non-withdrawable Sparks. The API, not
the browser, determines the item price, store availability, required delivery fields, current
ledger balance, and initial purchase status.

The player-facing catalog always explains:

- the item is independently supplied as a gift by Nortix Labs;
- Nortix is not affiliated with, endorsed by, or partnered with the named store or brand; and
- product names and trademarks belong to their respective owners.

Third-party product logos should be added only when their published brand rules permit that use.
For example, Discord documents both its Nitro gifting flow and restrictions on its brand assets.
Admins should use accurate item names and avoid language such as "official partner" unless a real,
documented relationship exists.

Delivery details and delivered gift references are private to the purchaser and authorized Nortix
administrators. They are never included in public catalog responses, notifications, audit
snapshots, or another player's responses.

## Administration

Only users with the admin-only `sponsored_shop:manage` permission can create stores and items or
change their availability. Only users with `sponsored_purchase:fulfill` can inspect private
fulfillment details and perform purchase actions.

Supported purchase actions are:

- start processing;
- mark delivered with a private delivery reference;
- cancel with a reason;
- refund Sparks with a reason; or
- cancel and refund Sparks with a reason.

Destructive or financial-state actions require an explicit confirmation value. Every catalog
mutation and purchase action appends an audit record. Delivery details and internal notes are
deliberately omitted from audit snapshots.

## Ledger and transaction rules

Purchase creation runs in a serializable transaction and creates a `SPONSORED_PURCHASE` debit in
the append-only Sparks ledger. The browser provides an item ID, a UUID idempotency key, and only
the configured delivery fields; it cannot choose a price, user, status, or ledger amount.

A refund creates one idempotent `SPONSORED_PURCHASE_REFUND` credit for the original price snapshot.
The original debit is never edited or deleted. Refunded purchases are terminal, and lifecycle
rules prevent delivery after cancellation or refund.

## Operator checklist

1. Review the third party's current gifting, regional, refund, and brand-asset rules before listing
   an item.
2. Configure the store and item through the admin catalog.
3. Keep uncertain or unavailable inventory hidden.
4. Deliver gift links or codes only through the private purchase workflow.
5. Apply the committed Prisma migration before enabling the feature.

No deployment is performed by automated agents.
