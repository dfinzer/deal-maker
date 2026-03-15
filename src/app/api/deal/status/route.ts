import { NextRequest, NextResponse } from "next/server";
import { getDeal } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const dealId = req.nextUrl.searchParams.get("id");
  if (!dealId) {
    return NextResponse.json({ error: "Missing deal id" }, { status: 400 });
  }

  const deal = await getDeal(dealId);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const addr = req.nextUrl.searchParams.get("address")?.toLowerCase();

  return NextResponse.json({
    id: deal.id,
    status: deal.status,
    creatorRole: deal.creatorRole,
    joinerRole: deal.creatorRole === "seller" ? "buyer" : "seller",
    isCreator: addr === deal.creatorAddress,
    isJoiner: addr === deal.joinerAddress,
    hasCreatorCommitment: !!deal.creatorCommitment,
    hasJoinerCommitment: !!deal.joinerCommitment,
    hasCreatorReveal: deal.creatorValue != null,
    hasJoinerReveal: deal.joinerValue != null,
    result: deal.result ?? null,
  });
}
