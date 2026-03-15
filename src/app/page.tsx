"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/useWallet";

export default function Home() {
  const { address, connect } = useWallet();
  const [role, setRole] = useState<"seller" | "buyer">("seller");
  const [loading, setLoading] = useState(false);
  const [joinId, setJoinId] = useState("");
  const router = useRouter();

  async function createDeal() {
    if (!address) return;
    setLoading(true);
    try {
      const { ethereum } = window as any;
      const message = `Create deal as ${role}`;
      const signature = await ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      const res = await fetch("/api/deal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, role, signature }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/deal/${data.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Deal Maker</h1>
          <p className="mt-2 text-gray-400">
            Private deal negotiation using commit-reveal cryptography.
            Neither party sees the other&apos;s number unless a deal is made.
          </p>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-5 space-y-3 text-sm text-gray-400">
          <h2 className="text-base font-semibold text-gray-200">How it works</h2>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>The <span className="text-emerald-400">seller</span> sets a secret minimum price and the <span className="text-blue-400">buyer</span> sets a secret maximum price</li>
            <li>Each value is hashed with a random nonce and committed &mdash; the server only stores the hash, not the number</li>
            <li>Once both sides commit, each privately submits their value to the server, which verifies it matches the original hash</li>
            <li>If the buyer&apos;s max &ge; the seller&apos;s min &rarr; <span className="text-emerald-400 font-medium">Deal!</span> at the midpoint price</li>
            <li>If not &rarr; <span className="text-red-400 font-medium">No deal</span>, and neither number is ever shared</li>
          </ol>
          <p className="text-xs text-gray-500">
            All actions are signed with your MetaMask wallet so no one can impersonate you or tamper with values after committing.
          </p>
        </div>

        {!address ? (
          <button
            onClick={connect}
            className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition"
          >
            Connect MetaMask
          </button>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-4 text-sm text-gray-400 break-all">
              Connected: {address}
            </div>

            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Create a Deal</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setRole("seller")}
                  className={`flex-1 py-2 rounded-lg font-medium transition ${
                    role === "seller"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  Seller (set min)
                </button>
                <button
                  onClick={() => setRole("buyer")}
                  className={`flex-1 py-2 rounded-lg font-medium transition ${
                    role === "buyer"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  Buyer (set max)
                </button>
              </div>
              <button
                onClick={createDeal}
                disabled={loading}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg font-medium transition"
              >
                {loading ? "Creating..." : "Create Deal"}
              </button>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Join a Deal</h2>
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Enter deal ID"
                className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-violet-500 focus:outline-none"
              />
              <button
                onClick={() => joinId && router.push(`/deal/${joinId}`)}
                disabled={!joinId}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg font-medium transition"
              >
                Join Deal
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
