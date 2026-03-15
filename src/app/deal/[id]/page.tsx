"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useWallet } from "@/lib/useWallet";
import { createCommitment, generateNonce } from "@/lib/crypto";

interface DealStatus {
  id: string;
  status: string;
  creatorRole: string;
  joinerRole: string;
  isCreator: boolean;
  isJoiner: boolean;
  hasCreatorCommitment: boolean;
  hasJoinerCommitment: boolean;
  hasCreatorReveal: boolean;
  hasJoinerReveal: boolean;
  result: { deal: boolean; price?: number } | null;
}

export default function DealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: dealId } = use(params);
  const { address, connect } = useWallet();
  const [deal, setDeal] = useState<DealStatus | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [storedNonce, setStoredNonce] = useState<string | null>(null);
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch(
      `/api/deal/status?id=${dealId}&address=${address ?? ""}`
    );
    if (res.ok) {
      setDeal(await res.json());
    }
  }, [dealId, address]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function sign(message: string): Promise<string> {
    const { ethereum } = window as any;
    return ethereum.request({
      method: "personal_sign",
      params: [message, address],
    });
  }

  async function handleCommit() {
    if (!address || !amount) return;
    setLoading(true);
    setError(null);
    try {
      const value = parseFloat(amount);
      if (isNaN(value) || value < 0) {
        setError("Enter a valid positive number");
        return;
      }

      const nonce = generateNonce();
      const commitment = await createCommitment(value, nonce);

      const message = `Commit to deal ${dealId}: ${commitment}`;
      const signature = await sign(message);

      const res = await fetch("/api/deal/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, address, commitment, signature }),
      });
      const data = await res.json();
      if (res.ok) {
        // Store nonce and value locally for reveal phase
        setStoredNonce(nonce);
        setStoredValue(value);
        localStorage.setItem(
          `deal-${dealId}-${address}`,
          JSON.stringify({ nonce, value })
        );
        await fetchStatus();
      } else {
        setError(data.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReveal() {
    if (!address) return;
    setLoading(true);
    setError(null);

    // Try to recover stored values
    let nonce = storedNonce;
    let value = storedValue;
    if (nonce == null || value == null) {
      const stored = localStorage.getItem(`deal-${dealId}-${address}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        nonce = parsed.nonce;
        value = parsed.value;
      }
    }

    if (nonce == null || value == null) {
      setError("Cannot find your committed value. Did you commit from this browser?");
      setLoading(false);
      return;
    }

    try {
      const message = `Reveal for deal ${dealId}: ${value}:${nonce}`;
      const signature = await sign(message);

      const res = await fetch("/api/deal/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, address, value, nonce, signature }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem(`deal-${dealId}-${address}`);
        await fetchStatus();
      } else {
        setError(data.error);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!address) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <h1 className="text-3xl font-bold">Deal {dealId}</h1>
          <p className="text-gray-400">Connect your wallet to participate</p>
          <button
            onClick={connect}
            className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition"
          >
            Connect MetaMask
          </button>
        </div>
      </main>
    );
  }

  const myRole = deal?.isCreator
    ? deal.creatorRole
    : deal?.isJoiner
    ? deal.joinerRole
    : deal?.joinerRole; // new joiner takes remaining role

  const hasMyCommitment = deal?.isCreator
    ? deal.hasCreatorCommitment
    : deal?.hasJoinerCommitment;

  const hasMyReveal = deal?.isCreator
    ? deal.hasCreatorReveal
    : deal?.hasJoinerReveal;

  const hasOtherCommitment = deal?.isCreator
    ? deal?.hasJoinerCommitment
    : deal?.hasCreatorCommitment;

  const bothCommitted = deal?.status === "committed" || deal?.status === "revealed" || deal?.status === "complete";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Deal {dealId}</h1>
          <p className="mt-1 text-gray-400">
            Your role:{" "}
            <span
              className={
                myRole === "seller" ? "text-emerald-400" : "text-blue-400"
              }
            >
              {myRole === "seller" ? "Seller (set minimum)" : "Buyer (set maximum)"}
            </span>
          </p>
        </div>

        {/* Status indicators */}
        <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Creator committed</span>
            <span>{deal?.hasCreatorCommitment ? "Yes" : "Waiting..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Joiner committed</span>
            <span>
              {deal?.hasJoinerCommitment
                ? "Yes"
                : deal?.joinerRole
                ? "Waiting..."
                : "No joiner yet"}
            </span>
          </div>
          {bothCommitted && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Creator revealed</span>
                <span>{deal?.hasCreatorReveal ? "Yes" : "Waiting..."}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Joiner revealed</span>
                <span>{deal?.hasJoinerReveal ? "Yes" : "Waiting..."}</span>
              </div>
            </>
          )}
        </div>

        {/* Commit phase */}
        {!hasMyCommitment && deal?.status !== "complete" && (
          <div className="bg-gray-900 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              {myRole === "seller"
                ? "Set your minimum price"
                : "Set your maximum price"}
            </h2>
            <p className="text-sm text-gray-400">
              Your value will be cryptographically committed. Neither party can
              see the other&apos;s number until both reveal.
            </p>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
              step="any"
              className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-violet-500 focus:outline-none"
            />
            <button
              onClick={handleCommit}
              disabled={loading || !amount}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg font-medium transition"
            >
              {loading ? "Committing..." : "Commit Value"}
            </button>
          </div>
        )}

        {/* Waiting for other party */}
        {hasMyCommitment && !bothCommitted && (
          <div className="bg-gray-900 rounded-lg p-6 text-center space-y-3">
            <div className="text-2xl animate-pulse">Waiting for the other party to commit...</div>
            <p className="text-sm text-gray-400">
              Share this link with the other party:
            </p>
            <code className="block text-xs bg-gray-800 p-2 rounded break-all">
              {typeof window !== "undefined" && window.location.href}
            </code>
          </div>
        )}

        {/* Reveal phase */}
        {bothCommitted && !hasMyReveal && deal?.status !== "complete" && (
          <div className="bg-gray-900 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Both parties committed!</h2>
            <p className="text-sm text-gray-400">
              Now reveal your value. The server will verify it matches your
              commitment and compute the result.
            </p>
            <button
              onClick={handleReveal}
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg font-medium transition"
            >
              {loading ? "Revealing..." : "Reveal My Value"}
            </button>
          </div>
        )}

        {/* Waiting for other reveal */}
        {bothCommitted && hasMyReveal && deal?.status !== "complete" && (
          <div className="bg-gray-900 rounded-lg p-6 text-center">
            <div className="text-2xl animate-pulse">
              Waiting for the other party to reveal...
            </div>
          </div>
        )}

        {/* Result */}
        {deal?.status === "complete" && deal.result && (
          <div
            className={`rounded-lg p-8 text-center space-y-3 ${
              deal.result.deal
                ? "bg-emerald-900/50 border border-emerald-700"
                : "bg-red-900/50 border border-red-700"
            }`}
          >
            {deal.result.deal ? (
              <>
                <div className="text-5xl font-bold text-emerald-400">DEAL!</div>
                <div className="text-2xl">
                  Price: <span className="font-bold">${deal.result.price}</span>
                </div>
                <p className="text-sm text-gray-400">
                  The agreed price splits the difference between both parties.
                </p>
              </>
            ) : (
              <>
                <div className="text-5xl font-bold text-red-400">NO DEAL</div>
                <p className="text-sm text-gray-400">
                  The buyer&apos;s max was below the seller&apos;s min.
                  Neither value has been revealed.
                </p>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
