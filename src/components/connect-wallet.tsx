"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export function WalletConnection({ className }: { className?: string }) {
  const { publicKey, disconnect, connecting, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Fetch balance when wallet is connected
  useEffect(() => {
    if (publicKey && connected) {
      setIsInitialLoading(false);
      connection.getBalance(publicKey).then((bal) => {
        setBalance(bal / LAMPORTS_PER_SOL);
      });
    } else {
      setBalance(null);
    }
  }, [publicKey, connected, connection]);

  const getDisplayText = () => {
    if (connecting || isInitialLoading) return "Loading...";
    if (!publicKey) return "Connect Wallet";
    const address = publicKey.toBase58();
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleConnect = () => {
    setVisible(true);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
  };

  return (
    <div className="">
      {!connected && (
        <button
          onClick={handleConnect}
          className={cn(
            `bg-[#836EF9]
             flex items-center justify-center rounded-lg mx-auto w-fit h-[40px] sm:h-[50px] px-2.5 sm:px-6 py-5
             text-sm sm:text-lg text-white font-medium transition-all duration-300 ease-in-out
             ${connecting ? "" : ""}`,
            className
          )}
        >
          Connect Wallet
        </button>
      )}
      {connected && publicKey && (
        <div className="flex items-center gap-4 w-full">
          <button
            onClick={handleDisconnect}
            className={cn(
              `bg-[#836EF9]
                flex items-center rounded-lg mx-auto h-[40px] sm:h-[50px] w-fit px-2.5 sm:px-6 py-5
                text-sm sm:text-lg text-white font-semibold justify-center transition-all duration-300 ease-in-out
                `,
              className
            )}
          >
            {getDisplayText()}
            {balance !== null && (
              <span className="ml-2 text-xs opacity-80">
                ({balance.toFixed(2)} SOL)
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
