/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { GameState } from "@/lib/solana/config";

// Helper function to normalize wallet addresses for comparison
const normalizeAddress = (address: string | PublicKey | undefined): string => {
  if (!address) return "";
  if (address instanceof PublicKey) {
    return address.toBase58().toLowerCase();
  }
  return address.toLowerCase();
};

export const useContractIntegration = (
  gameId: PublicKey | undefined,
  gameInfo: any,
  gameState: any,
  multisynqView: any,
  currentPlayerId: string | null,
  walletAddress: string | undefined,
  refetchAll: () => void,
  isSuccess: boolean,
  finishBettingGame: (gameId: PublicKey, result: 1 | 2 | 3) => Promise<void>,
  setIsFinalizingGame: (finalizing: boolean) => void
) => {
  const [lastClaimState, setLastClaimState] = useState<{
    whiteClaimed: boolean;
    blackClaimed: boolean;
  }>({ whiteClaimed: false, blackClaimed: false });

  useEffect(() => {
    if (!gameInfo || !multisynqView || !currentPlayerId || !walletAddress)
      return;

    const whiteJustClaimed =
      gameInfo.whiteClaimed && !lastClaimState.whiteClaimed;
    const blackJustClaimed =
      gameInfo.blackClaimed && !lastClaimState.blackClaimed;

    if (whiteJustClaimed || blackJustClaimed) {
      setTimeout(() => {
        if (whiteJustClaimed) {
          const isCurrentPlayer =
            normalizeAddress(gameInfo.whitePlayer) ===
            normalizeAddress(walletAddress);

          if (isCurrentPlayer) {
            multisynqView.sendMessage(
              `I just claimed!`,
              currentPlayerId,
              walletAddress
            );
          }
        }

        if (blackJustClaimed) {
          const isCurrentPlayer =
            normalizeAddress(gameInfo.blackPlayer) ===
            normalizeAddress(walletAddress);

          if (isCurrentPlayer) {
            multisynqView.sendMessage(
              `I just claimed!`,
              currentPlayerId,
              walletAddress
            );
          }
        }
      }, 1000);

      setLastClaimState({
        whiteClaimed: gameInfo.whiteClaimed,
        blackClaimed: gameInfo.blackClaimed,
      });
    } else if (
      gameInfo.whiteClaimed !== lastClaimState.whiteClaimed ||
      gameInfo.blackClaimed !== lastClaimState.blackClaimed
    ) {
      setLastClaimState({
        whiteClaimed: gameInfo.whiteClaimed,
        blackClaimed: gameInfo.blackClaimed,
      });
    }
  }, [
    gameInfo?.whiteClaimed,
    gameInfo?.blackClaimed,
    gameInfo?.whitePlayer,
    gameInfo?.blackPlayer,
    multisynqView,
    currentPlayerId,
    walletAddress,
    lastClaimState,
  ]);

  useEffect(() => {
    if (isSuccess && gameId) {
      setTimeout(() => {
        refetchAll();
      }, 3000);
    }
  }, [isSuccess, gameId, refetchAll]);

  const finishGameViaRelayer = async (
    gameId: PublicKey,
    result: 1 | 2 | 3
  ): Promise<boolean> => {
    try {
      setIsFinalizingGame(true);

      const response = await fetch("/api/finish-game-relayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: gameId.toBase58(),
          result: result,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTimeout(() => setIsFinalizingGame(false), 2000);
        return true;
      } else {
        return false;
      }
    } catch {
      setTimeout(() => setIsFinalizingGame(false), 3000);
      return false;
    }
  };

  const finishGameOnContract = async (gameResult: {
    type: "abandoned" | "draw" | "checkmate" | "stalemate" | "timeout" | null;
    winner?: "white" | "black" | "draw";
  }) => {
    if (!gameId || !gameInfo?.betAmount || gameInfo.betAmount <= 0) {
      return;
    }

    // Check if game is already finished
    if (gameInfo.state === GameState.FINISHED) {
      return;
    }

    try {
      let contractResult: 1 | 2 | 3;

      if (gameResult.winner === "draw") {
        contractResult = 3;
      } else if (
        gameResult.winner === "white" ||
        gameResult.winner === "black"
      ) {
        const winnerColor = gameResult.winner;
        const winnerPlayer = gameState.players.find(
          (p: any) => p.color === winnerColor
        );

        if (!winnerPlayer) {
          console.error("Impossible to find the winner player");
          return;
        }

        const isWinnerWhiteInContract =
          normalizeAddress(gameInfo?.whitePlayer) ===
          normalizeAddress(winnerPlayer.wallet);
        const isWinnerBlackInContract =
          normalizeAddress(gameInfo?.blackPlayer) ===
          normalizeAddress(winnerPlayer.wallet);

        if (isWinnerWhiteInContract) {
          contractResult = 1;
        } else if (isWinnerBlackInContract) {
          contractResult = 2;
        } else {
          return;
        }
      } else {
        contractResult = 3;
      }

      const relayerSuccess = await finishGameViaRelayer(gameId, contractResult);

      if (!relayerSuccess) {
        try {
          await finishBettingGame(gameId, contractResult);
          setTimeout(() => setIsFinalizingGame(false), 2000);
        } catch {
          setTimeout(() => setIsFinalizingGame(false), 3000);
        }
      }
    } catch {
      setTimeout(() => setIsFinalizingGame(false), 3000);
    }
  };

  return {
    finishGameOnContract,
    finishGameViaRelayer,
  };
};
