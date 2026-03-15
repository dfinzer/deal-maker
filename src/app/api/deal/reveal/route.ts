import { NextRequest, NextResponse } from "next/server";
import { getDeal, saveDeal } from "@/lib/redis";
import { verifySignature } from "@/lib/auth";
import { verifyCommitment } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const { dealId, address, value, nonce, signature } = await req.json();

  if (!dealId || !address || value == null || !nonce || !signature) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const message = `Reveal for deal ${dealId}: ${value}:${nonce}`;
  if (!verifySignature(message, signature, address)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const deal = await getDeal(dealId);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  if (deal.status !== "committed" && deal.status !== "revealed") {
    return NextResponse.json({ error: "Both parties must commit first" }, { status: 400 });
  }

  const addr = address.toLowerCase();
  const numValue = Number(value);

  if (addr === deal.creatorAddress) {
    const valid = await verifyCommitment(numValue, nonce, deal.creatorCommitment!);
    if (!valid) {
      return NextResponse.json({ error: "Commitment mismatch" }, { status: 400 });
    }
    deal.creatorValue = numValue;
    deal.creatorNonce = nonce;
  } else if (addr === deal.joinerAddress) {
    const valid = await verifyCommitment(numValue, nonce, deal.joinerCommitment!);
    if (!valid) {
      return NextResponse.json({ error: "Commitment mismatch" }, { status: 400 });
    }
    deal.joinerValue = numValue;
    deal.joinerNonce = nonce;
  } else {
    return NextResponse.json({ error: "Not a party to this deal" }, { status: 403 });
  }

  // Check if both have revealed
  if (deal.creatorValue != null && deal.joinerValue != null) {
    const sellerMin =
      deal.creatorRole === "seller" ? deal.creatorValue : deal.joinerValue;
    const buyerMax =
      deal.creatorRole === "buyer" ? deal.creatorValue : deal.joinerValue;

    if (buyerMax >= sellerMin) {
      deal.result = {
        deal: true,
        price: Math.round(((sellerMin + buyerMax) / 2) * 100) / 100,
      };
    } else {
      deal.result = { deal: false };
    }
    deal.status = "complete";

    // Clear raw values so they're not exposed via status endpoint
    deal.creatorValue = undefined;
    deal.joinerValue = undefined;
    deal.creatorNonce = undefined;
    deal.joinerNonce = undefined;
  } else {
    deal.status = "revealed";
  }

  await saveDeal(deal);
  return NextResponse.json({ status: deal.status, result: deal.result ?? null });
}
