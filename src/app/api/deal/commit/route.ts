import { NextRequest, NextResponse } from "next/server";
import { getDeal, saveDeal } from "@/lib/redis";
import { verifySignature } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { dealId, address, commitment, signature } = await req.json();

  if (!dealId || !address || !commitment || !signature) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const message = `Commit to deal ${dealId}: ${commitment}`;
  if (!verifySignature(message, signature, address)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const deal = await getDeal(dealId);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const addr = address.toLowerCase();

  if (addr === deal.creatorAddress) {
    deal.creatorCommitment = commitment;
  } else if (!deal.joinerAddress || addr === deal.joinerAddress) {
    deal.joinerAddress = addr;
    deal.joinerCommitment = commitment;
  } else {
    return NextResponse.json({ error: "Deal already has two parties" }, { status: 400 });
  }

  if (deal.creatorCommitment && deal.joinerCommitment) {
    deal.status = "committed";
  }

  await saveDeal(deal);
  return NextResponse.json({ status: deal.status });
}
