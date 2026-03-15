import { NextRequest, NextResponse } from "next/server";
import { saveDeal, type Deal } from "@/lib/redis";
import { verifySignature } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { address, role, signature } = await req.json();

  if (!address || !role || !signature) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (role !== "seller" && role !== "buyer") {
    return NextResponse.json({ error: "Role must be seller or buyer" }, { status: 400 });
  }

  const message = `Create deal as ${role}`;
  if (!verifySignature(message, signature, address)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const id = crypto.randomUUID().slice(0, 8);
  const deal: Deal = {
    id,
    creatorAddress: address.toLowerCase(),
    creatorRole: role,
    status: "waiting",
  };

  try {
    await saveDeal(deal);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  return NextResponse.json({ id });
}
