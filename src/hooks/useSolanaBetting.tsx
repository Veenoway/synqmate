"use client";
import { useCallback, useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  CHESS_PROGRAM_ID,
  GameState,
  GameResult,
  formatSOL,
  parseSOL,
  MAGICBLOCK_CONFIG,
} from "@/lib/solana/config";

// Game info interface for Solana
export interface GameInfo {
  gameId: PublicKey;
  whitePlayer: PublicKey;
  blackPlayer: PublicKey | null;
  betAmount: number; // in lamports
  state: number;
  result: number;
  createdAt: number;
  finishedAt: number;
  roomName: string;
  whiteClaimed: boolean;
  blackClaimed: boolean;
}

export interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  totalWinnings: number;
  totalLosses: number;
}

// Re-export GameState and GameResult for convenience
export { GameState, GameResult };

// MagicBlock ephemeral rollup connection (for future integration)
let ephemeralConnection: Connection | null = null;

const getEphemeralConnection = (): Connection => {
  if (!ephemeralConnection) {
    ephemeralConnection = new Connection(MAGICBLOCK_CONFIG.ephemeralRpcUrl, {
      commitment: "confirmed",
    });
  }
  return ephemeralConnection;
};

// Note: MagicBlock engine integration will be added when the program is deployed
// For now, we use standard Solana transactions

export const useSolanaBetting = () => {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);

  const [claimState, setClaimState] = useState<{
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: string | null;
    txHash: string | null;
  }>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    txHash: null,
  });

  const [cancelState, setCancelState] = useState<{
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: string | null;
    txHash: string | null;
  }>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    txHash: null,
  });

  // Fetch balance
  useEffect(() => {
    if (publicKey && connected) {
      connection.getBalance(publicKey).then(setBalance);
    }
  }, [publicKey, connected, connection]);

  const refetchBalance = useCallback(async () => {
    if (publicKey) {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal);
    }
  }, [publicKey, connection]);

  const resetClaimState = useCallback(() => {
    setClaimState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      txHash: null,
    });
  }, []);

  const resetCancelState = useCallback(() => {
    setCancelState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      txHash: null,
    });
  }, []);

  // Generate game PDA (Program Derived Address)
  const getGamePDA = useCallback(
    (roomName: string) => {
      return PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(roomName)],
        CHESS_PROGRAM_ID
      );
    },
    []
  );

  // Create a betting game using MagicBlock ephemeral rollup
  const createBettingGame = useCallback(
    async (betAmountSOL: string, roomName: string) => {
      if (!publicKey || !signTransaction) {
        console.log("Wallet not connected");
        return;
      }

      try {
        setIsPending(true);
        setError(null);

        const betAmount = parseSOL(betAmountSOL);

        // Check balance
        if (betAmount > balance) {
          console.log("Insufficient SOL balance");
          setIsPending(false);
          return;
        }

        // Create game on chain
        const [gamePDA] = getGamePDA(roomName);

        // For now, we'll use a simple transfer as placeholder
        // In production, this would call your Solana program's create_game instruction
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: gamePDA,
            lamports: betAmount,
          })
        );

        transaction.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;
        transaction.feePayer = publicKey;

        const signedTx = await signTransaction(transaction);
        setIsConfirming(true);

        // Send transaction to Solana
        const signature = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(signature, "confirmed");

        setHash(signature);
        setIsSuccess(true);
        console.log("Creating betting game on ephemeral rollup...");

        setTimeout(() => {
          refetchBalance();
        }, 2000);
      } catch (err) {
        console.error("Error creating betting game:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsPending(false);
        setIsConfirming(false);
      }
    },
    [publicKey, signTransaction, balance, connection, getGamePDA, refetchBalance]
  );

  // Join a betting game
  const joinBettingGame = useCallback(
    async (gameId: PublicKey, betAmount: number) => {
      if (!publicKey || !signTransaction) {
        console.log("Wallet not connected");
        return;
      }

      try {
        setIsPending(true);
        setError(null);

        if (betAmount > balance) {
          console.log("Insufficient SOL balance");
          setIsPending(false);
          return;
        }

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: gameId,
            lamports: betAmount,
          })
        );

        transaction.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;
        transaction.feePayer = publicKey;

        const signedTx = await signTransaction(transaction);
        setIsConfirming(true);

        const signature = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(signature, "confirmed");

        setHash(signature);
        setIsSuccess(true);
        console.log("Joining betting game...");

        setTimeout(() => {
          refetchBalance();
        }, 2000);
      } catch (err) {
        console.error("Error joining betting game:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsPending(false);
        setIsConfirming(false);
      }
    },
    [publicKey, signTransaction, balance, connection, refetchBalance]
  );

  // Join game by room name
  const joinBettingGameByRoom = useCallback(
    async (roomName: string, betAmount: number) => {
      const [gamePDA] = getGamePDA(roomName);
      await joinBettingGame(gamePDA, betAmount);
    },
    [getGamePDA, joinBettingGame]
  );

  // Finish betting game
  const finishBettingGame = useCallback(
    async (gameId: PublicKey, result: 1 | 2 | 3) => {
      if (!publicKey || !signTransaction) {
        return;
      }

      try {
        setIsPending(true);

        // In production, this would call your program's finish_game instruction
        // For now, we'll log the action
        console.log(`Finishing game ${gameId.toBase58()} with result ${result}`);

        // TODO: Call finish_game instruction on Solana program

        setIsSuccess(true);
      } catch (err) {
        console.error("Error finishing game:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsPending(false);
      }
    },
    [publicKey, signTransaction]
  );

  // Finish game via API relayer (for gasless transactions)
  const finishGameViaRelayer = useCallback(
    async (gameId: PublicKey, result: 1 | 2 | 3): Promise<boolean> => {
      try {
        const response = await fetch("/api/finish-game-relayer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: gameId.toBase58(),
            result,
          }),
        });

        const data = await response.json();
        return response.ok && data.success;
      } catch {
        return false;
      }
    },
    []
  );

  // Claim winnings
  const claimWinnings = useCallback(
    async (
      gameId: PublicKey,
      result: 1 | 2 | 3,
      onSuccess?: () => void,
      onError?: (error: string) => void
    ) => {
      if (!publicKey || !signTransaction) {
        const errorMsg = "Please connect your wallet";
        setClaimState((prev) => ({ ...prev, isError: true, error: errorMsg }));
        onError?.(errorMsg);
        return;
      }

      setClaimState({
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        txHash: null,
      });

      try {
        // First, ensure the game is finished on chain
        await finishBettingGame(gameId, result);

        // Then claim winnings
        // In production, this would call your program's claim_winnings instruction
        console.log(`Claiming winnings for game ${gameId.toBase58()}`);

        setClaimState({
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          txHash: "placeholder-tx-hash",
        });

        setTimeout(() => {
          refetchBalance();
        }, 2000);

        onSuccess?.();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to claim winnings";
        setClaimState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          txHash: null,
        });
        onError?.(errorMessage);
      }
    },
    [publicKey, signTransaction, finishBettingGame, refetchBalance]
  );

  // Claim draw refund
  const claimDrawRefund = useCallback(
    async (gameId: PublicKey) => {
      if (!publicKey || !signTransaction) {
        return;
      }

      try {
        console.log(`Claiming draw refund for game ${gameId.toBase58()}`);
        // TODO: Call claim_draw_refund instruction on Solana program

        setTimeout(() => {
          refetchBalance();
        }, 2000);
      } catch (err) {
        console.error("Error claiming draw refund:", err);
      }
    },
    [publicKey, signTransaction, refetchBalance]
  );

  // Cancel betting game
  const cancelBettingGame = useCallback(
    async (
      gameId: PublicKey,
      onSuccess?: () => void,
      onError?: (error: string) => void
    ) => {
      if (!publicKey || !signTransaction) {
        const errorMsg = "Please connect your wallet";
        onError?.(errorMsg);
        return;
      }

      setCancelState({
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        txHash: null,
      });

      try {
        console.log(`Cancelling game ${gameId.toBase58()}`);
        // TODO: Call cancel_game instruction on Solana program

        setCancelState({
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          txHash: "placeholder-tx-hash",
        });

        setTimeout(() => {
          refetchBalance();
        }, 2000);

        onSuccess?.();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to cancel game";
        setCancelState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          txHash: null,
        });
        onError?.(errorMessage);
      }
    },
    [publicKey, signTransaction, refetchBalance]
  );

  return {
    // Actions
    createBettingGame,
    joinBettingGame,
    joinBettingGameByRoom,
    claimWinnings,
    claimDrawRefund,
    cancelBettingGame,
    finishBettingGame,
    finishGameViaRelayer,

    // State
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
    balance,
    balanceFormatted: formatSOL(balance),

    // Claim state
    claimState,
    resetClaimState,

    // Cancel state
    cancelState,
    resetCancelState,

    // Utilities
    getGamePDA,
  };
};

// Hook to get game info from chain
export const useGameInfo = (gameId?: PublicKey) => {
  const { connection } = useConnection();
  const [gameInfo, setGameInfo] = useState<GameInfo | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!gameId) return;

    setIsLoading(true);
    try {
      // In production, this would fetch from your Solana program
      // For now, we'll return mock data
      const accountInfo = await connection.getAccountInfo(gameId);

      if (accountInfo) {
        // Parse account data according to your program's schema
        // This is a placeholder
        setGameInfo({
          gameId,
          whitePlayer: gameId, // placeholder
          blackPlayer: null,
          betAmount: 0,
          state: GameState.WAITING,
          result: GameResult.NONE,
          createdAt: Date.now(),
          finishedAt: 0,
          roomName: "",
          whiteClaimed: false,
          blackClaimed: false,
        });
      }
    } catch (err) {
      console.error("Error fetching game info:", err);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, connection]);

  useEffect(() => {
    refetch();

    // Poll for updates
    const interval = setInterval(refetch, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  return { gameInfo, isLoading, refetch };
};

// Hook to get game ID by room name
export const useGameIdByRoom = (roomName?: string) => {
  const [gameId, setGameId] = useState<PublicKey | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!roomName) return;

    setIsLoading(true);
    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(roomName)],
        CHESS_PROGRAM_ID
      );
      setGameId(pda);
    } catch (err) {
      console.error("Error getting game ID:", err);
    } finally {
      setIsLoading(false);
    }
  }, [roomName]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { gameId, isLoading, refetch };
};

// Hook to get player stats
export const usePlayerStats = (playerAddress?: PublicKey) => {
  const { connection } = useConnection();
  const [playerStats, setPlayerStats] = useState<PlayerStats | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!playerAddress) return;

    setIsLoading(true);
    try {
      // In production, fetch from your Solana program
      setPlayerStats({
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalWinnings: 0,
        totalLosses: 0,
      });
    } catch (err) {
      console.error("Error fetching player stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [playerAddress, connection]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { playerStats, isLoading, refetch };
};

// Format SOL amount
export const formatSolAmount = (lamports: number | bigint): string => {
  return formatSOL(Number(lamports));
};

// Parse SOL to lamports
export const parseSolAmount = (sol: string): number => {
  return parseSOL(sol);
};

// Export utility functions for game results
export const finishGameWithResult = {
  whiteWins: (
    gameId: PublicKey,
    finishGame: (gameId: PublicKey, result: 1 | 2 | 3) => Promise<void>
  ) => finishGame(gameId, GameResult.WHITE_WINS as 1),
  blackWins: (
    gameId: PublicKey,
    finishGame: (gameId: PublicKey, result: 1 | 2 | 3) => Promise<void>
  ) => finishGame(gameId, GameResult.BLACK_WINS as 2),
  draw: (
    gameId: PublicKey,
    finishGame: (gameId: PublicKey, result: 1 | 2 | 3) => Promise<void>
  ) => finishGame(gameId, GameResult.DRAW as 3),
};
