import { createHmac, timingSafeEqual } from "node:crypto";

export type CheckoutInput = { accountId: string; amountCents: number; currency: string };
export type CheckoutSession = { id: string; url: string; expiresAt: Date };
export type PaymentEvent = {
  id: string;
  type: "PAYMENT_SUCCEEDED" | "PAYMENT_REFUNDED" | "PAYMENT_FAILED";
  referenceId: string;
  amountCents: number;
  currency: string;
};
export type RefundInput = { providerPaymentId: string; amountCents?: number };
export type RefundResult = { id: string; status: "PENDING" | "SUCCEEDED" | "FAILED" };

export interface PaymentProvider {
  createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession>;
  verifyWebhook(payload: unknown, signature: string): Promise<PaymentEvent>;
  refundPayment(input: RefundInput): Promise<RefundResult>;
}

export type RecipientInput = { userId: string; destinationReference: string };
export type RecipientResult = { id: string; status: "READY" | "REVIEW_REQUIRED" };
export type PayoutInput = { recipientId: string; amountCents: number; currency: string };
export type PayoutResult = { id: string; status: PayoutStatus };
export type PayoutStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";

export interface PayoutProvider {
  createRecipient(input: RecipientInput): Promise<RecipientResult>;
  createPayout(input: PayoutInput): Promise<PayoutResult>;
  getPayoutStatus(providerPayoutId: string): Promise<PayoutStatus>;
}

export type VerificationChallenge = {
  id: string;
  type: string;
  instructions: string;
  expiresAt: Date;
};
export type VerificationResult = { verified: boolean; reason?: string };

export interface ServerVerificationProvider {
  createChallenge(serverId: string): Promise<VerificationChallenge>;
  verify(serverId: string, challengeId: string): Promise<VerificationResult>;
}

export interface RewardedAdProvider {
  createRewardSession(input: {
    userId: string;
    placement: string;
  }): Promise<{ id: string; url: string }>;
  verifyCompletion(input: {
    sessionId: string;
    proof: string;
  }): Promise<{ sparks: number; verified: boolean }>;
}

export interface FraudProvider {
  assess(input: {
    subjectType: string;
    subjectId: string;
    signals: Record<string, unknown>;
  }): Promise<{
    score: number;
    flags: string[];
    recommendation: "ALLOW" | "REVIEW" | "BLOCK";
  }>;
}

export class MockPaymentProvider implements PaymentProvider {
  constructor(private readonly webhookSecret: string) {}

  async createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
    const id = `mock_checkout_${crypto.randomUUID()}`;
    return {
      id,
      url: `http://localhost:5173/mock-checkout/${id}?amount=${input.amountCents}`,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    };
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<PaymentEvent> {
    const raw = JSON.stringify(payload);
    const expected = createHmac("sha256", this.webhookSecret).update(raw).digest("hex");
    const valid =
      expected.length === signature.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!valid) throw new Error("Invalid webhook signature");
    return payload as PaymentEvent;
  }

  async refundPayment(): Promise<RefundResult> {
    return { id: `mock_refund_${crypto.randomUUID()}`, status: "SUCCEEDED" };
  }
}

export class MockPayoutProvider implements PayoutProvider {
  async createRecipient(input: RecipientInput): Promise<RecipientResult> {
    return { id: `mock_recipient_${input.userId}`, status: "READY" };
  }

  async createPayout(_input: PayoutInput): Promise<PayoutResult> {
    return { id: `mock_payout_${crypto.randomUUID()}`, status: "PROCESSING" };
  }

  async getPayoutStatus(): Promise<PayoutStatus> {
    return "PAID";
  }
}

export class ManualServerVerificationProvider implements ServerVerificationProvider {
  async createChallenge(serverId: string): Promise<VerificationChallenge> {
    return {
      id: `manual_${serverId}_${crypto.randomUUID()}`,
      type: "MANUAL_REVIEW",
      instructions:
        "Submit a screenshot of the server console and ownership details for moderator review.",
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    };
  }

  async verify(): Promise<VerificationResult> {
    return { verified: false, reason: "Manual moderator review is required." };
  }
}

export class MockFraudProvider implements FraudProvider {
  async assess(input: {
    subjectType: string;
    subjectId: string;
    signals: Record<string, unknown>;
  }) {
    const flags = Object.entries(input.signals)
      .filter(([, value]) => value === true)
      .map(([key]) => key);
    const score = Math.min(flags.length * 18, 100);
    return {
      score,
      flags,
      recommendation:
        score >= 70 ? ("BLOCK" as const) : score >= 35 ? ("REVIEW" as const) : ("ALLOW" as const),
    };
  }
}
