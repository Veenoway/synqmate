"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/lib/shadcn/modal";
import { FC, PropsWithChildren } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletName } from "@solana/wallet-adapter-base";

export const WalletModal: FC<
  PropsWithChildren & { open: boolean; setOpen: (value: boolean) => void }
> = ({ children, open, setOpen }) => {
  const { wallets, select } = useWallet();

  const handleSelectWallet = (walletName: WalletName) => {
    select(walletName);
    setOpen(false);
  };

  return (
    <Dialog open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        close={() => setOpen(false)}
        className="sm:max-w-[600px] text-white px-10 py-8 rounded-2xl bg-[#1E1E1E] border border-white/5 backdrop-blur-md"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl mb-3 text-white">
            Connect Wallet
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-5 w-full">
          {wallets
            .filter((wallet) => wallet.readyState === "Installed" || wallet.readyState === "Loadable")
            .map((wallet, i) => (
              <button
                key={i}
                style={{
                  width: "calc(50% - 10px)",
                }}
                onClick={() => handleSelectWallet(wallet.adapter.name)}
                className="bg-[#252525] hover:border-[#836EF9] hover:bg-[#836EF9]/20 border border-white/5 transition-all duration-300 ease-in-out flex items-center justify-center rounded h-[50px] px-2 font-light text-base sm:text-lg"
              >
                <img
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  className="w-6 h-6 mr-3"
                />
                {wallet.adapter.name}
              </button>
            ))}
        </div>
        {wallets.filter((wallet) => wallet.readyState === "Installed" || wallet.readyState === "Loadable").length === 0 && (
          <p className="text-gray-400 text-center">
            No wallets found. Please install a Solana wallet like Phantom or Solflare.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
