"use client";

import { useState, useEffect, useCallback } from "react";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const { ethereum } = window as any;
    if (!ethereum) {
      alert("Please install MetaMask");
      return;
    }
    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });
    if (accounts[0]) {
      setAddress(accounts[0]);
    }
  }, []);

  useEffect(() => {
    const { ethereum } = window as any;
    if (!ethereum) return;

    ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts[0]) setAddress(accounts[0]);
    });

    const handleAccountsChanged = (accounts: string[]) => {
      setAddress(accounts[0] ?? null);
    };
    ethereum.on("accountsChanged", handleAccountsChanged);
    return () => ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, []);

  return { address, connect };
}
