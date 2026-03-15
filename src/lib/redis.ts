export interface Deal {
  id: string;
  creatorAddress: string;
  creatorRole: "seller" | "buyer";
  creatorCommitment?: string;
  joinerAddress?: string;
  joinerCommitment?: string;
  creatorValue?: number;
  creatorNonce?: string;
  joinerValue?: number;
  joinerNonce?: string;
  status: "waiting" | "committed" | "revealed" | "complete";
  result?: { deal: boolean; price?: number };
}

// In-memory fallback for local dev
const memStore = new Map<string, Deal>();

const ECFG_ID = process.env.EDGE_CONFIG_ID;
const VERCEL_TOKEN = process.env.VTOKEN;
const TEAM_ID = process.env.VTEAM_ID;

const useEdgeConfig = !!ECFG_ID && !!VERCEL_TOKEN;

// In-memory write-through cache (survives within a single function instance)
const cache = new Map<string, { deal: Deal; ts: number }>();
const CACHE_TTL = 10_000; // 10s

export async function getDeal(id: string): Promise<Deal | null> {
  const key = `deal_${id}`;

  if (!useEdgeConfig) {
    return memStore.get(key) ?? null;
  }

  // Check cache first
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.deal;
  }

  try {
    const url = `https://api.vercel.com/v1/edge-config/${ECFG_ID}/item/${key}?teamId=${TEAM_ID}&edgeConfigId=${ECFG_ID}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json();
    const deal = (data.value as Deal) ?? null;
    if (deal) cache.set(key, { deal, ts: Date.now() });
    return deal;
  } catch {
    return null;
  }
}

export async function saveDeal(deal: Deal): Promise<void> {
  const key = `deal_${deal.id}`;

  if (!useEdgeConfig) {
    memStore.set(key, structuredClone(deal));
    return;
  }

  const url = `https://api.vercel.com/v1/edge-config/${ECFG_ID}/items?teamId=${TEAM_ID}&edgeConfigId=${ECFG_ID}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ operation: "upsert", key, value: deal }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to save deal: ${text}`);
  }

  // Update cache on write
  cache.set(key, { deal: structuredClone(deal), ts: Date.now() });
}
