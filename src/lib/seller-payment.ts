import "server-only";

/**
 * Seller payment abstraction (KRW credits).
 *
 * The provider is pluggable via SELLER_PAYMENT_PROVIDER. Default is "stub":
 * checkout is reported as not-configured so the product still runs on the free
 * trial. Drop in PortOne (or another PG) credentials via env to go live — no
 * code change needed here beyond filling the adapter's checkout call.
 *
 * NOTE: real go-live requires a merchant account + secret keys, which are set
 * by the operator (not in code). This file only structures the integration.
 */

export type CreditPack = {
  id: string;
  credits: number;
  priceKrw: number;
  label: string;
};

// 1 credit = 1 lookbook shot. (style-room charges ~₩300/lookbook for reference.)
export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", credits: 50, priceKrw: 9900, label: "스타터" },
  { id: "pro", credits: 200, priceKrw: 29900, label: "프로" },
  { id: "studio", credits: 600, priceKrw: 79900, label: "스튜디오" },
];

export function getCreditPack(packId: string): CreditPack | null {
  return CREDIT_PACKS.find((pack) => pack.id === packId) ?? null;
}

export type CreditCheckout =
  | {
      status: "ready";
      provider: string;
      // PG-specific params the client uses to open the payment widget.
      params: Record<string, unknown>;
    }
  | {
      status: "not_configured";
      provider: string;
      message: string;
    };

function resolveProviderName() {
  return process.env.SELLER_PAYMENT_PROVIDER?.trim().toLowerCase() || "stub";
}

/**
 * Create a checkout for a credit pack. Until a PG is configured this returns
 * "not_configured" and the UI keeps the seller on the free trial.
 */
export async function createCreditCheckout({
  pack,
  workspaceId,
}: {
  pack: CreditPack;
  workspaceId: string;
}): Promise<CreditCheckout> {
  const provider = resolveProviderName();

  if (provider === "portone") {
    const storeId = process.env.PORTONE_STORE_ID?.trim();
    const channelKey = process.env.PORTONE_CHANNEL_KEY?.trim();

    if (!storeId || !channelKey) {
      return {
        message:
          "PortOne is selected but PORTONE_STORE_ID / PORTONE_CHANNEL_KEY are not set.",
        provider,
        status: "not_configured",
      };
    }

    // Scaffold: params the PortOne browser SDK (requestPayment) needs. The
    // server should verify the payment via webhook before granting credits.
    return {
      params: {
        channelKey,
        currency: "KRW",
        orderName: `Lookbook credits · ${pack.label}`,
        payMethod: "CARD",
        paymentId: `lookbook_${workspaceId}_${pack.id}_${Date.now()}`,
        storeId,
        totalAmount: pack.priceKrw,
      },
      provider,
      status: "ready",
    };
  }

  return {
    message:
      "결제 연동이 아직 설정되지 않았습니다. 지금은 무료 체험 크레딧으로 이용해 주세요.",
    provider,
    status: "not_configured",
  };
}
