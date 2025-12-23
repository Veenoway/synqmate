"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Connection } from "@solana/web3.js";
import { MAGICBLOCK_CONFIG, CHESS_PROGRAM_ID } from "@/lib/solana/config";

// Types for chess game state on ephemeral rollup
export interface EphemeralGameState {
  gameId: string;
  fen: string;
  turn: "w" | "b";
  whitePlayer: string | null;
  blackPlayer: string | null;
  whiteTime: number;
  blackTime: number;
  lastMoveTime: number | null;
  isActive: boolean;
  gameResult: {
    type: "checkmate" | "stalemate" | "timeout" | "draw" | "abandoned" | null;
    winner?: "white" | "black" | "draw";
  };
  moves: string[];
}

interface UseMagicBlockGameProps {
  roomName: string;
  gameTime: number; // in seconds
  betAmount: number; // in lamports
}

// MagicBlock ephemeral connection singleton
let ephemeralConnection: Connection | null = null;

const getEphemeralConnection = (): Connection => {
  if (!ephemeralConnection) {
    ephemeralConnection = new Connection(MAGICBLOCK_CONFIG.ephemeralRpcUrl, {
      commitment: "confirmed",
    });
  }
  return ephemeralConnection;
};

export const useMagicBlockGame = ({
  roomName,
  gameTime,
  betAmount,
}: UseMagicBlockGameProps) => {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection: baseConnection } = useConnection();

  const [gameState, setGameState] = useState<EphemeralGameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionRef = useRef<number | null>(null);
  const gamePDARef = useRef<PublicKey | null>(null);

  // Initialize ephemeral connection
  useEffect(() => {
    const initConnection = async () => {
      try {
        getEphemeralConnection();
        setIsConnected(true);
      } catch (err) {
        console.error("Failed to initialize MagicBlock engine:", err);
        setError("Failed to connect to MagicBlock");
      }
    };

    initConnection();
  }, []);

  // Derive game PDA
  const getGamePDA = useCallback((): PublicKey => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), Buffer.from(roomName)],
      CHESS_PROGRAM_ID
    );
    gamePDARef.current = pda;
    return pda;
  }, [roomName]);

  // Subscribe to game state changes on ephemeral rollup
  const subscribeToGame = useCallback(async () => {
    if (!isConnected || !roomName) return;

    const gamePDA = getGamePDA();
    const ephemeralConn = getEphemeralConnection();

    try {
      // Subscribe to account changes on ephemeral rollup
      subscriptionRef.current = ephemeralConn.onAccountChange(
        gamePDA,
        (accountInfo) => {
          if (accountInfo.data) {
            // Parse game state from account data
            // This would use your program's schema
            const parsedState = parseGameState(accountInfo.data);
            setGameState(parsedState);
          }
        },
        "confirmed"
      );
    } catch (err) {
      console.error("Failed to subscribe to game:", err);
    }
  }, [roomName, getGamePDA]);

  // Unsubscribe from game
  const unsubscribeFromGame = useCallback(async () => {
    if (subscriptionRef.current !== null) {
      const ephemeralConn = getEphemeralConnection();
      await ephemeralConn.removeAccountChangeListener(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  }, []);

  // Initialize game on ephemeral rollup
  const initializeGame = useCallback(async () => {
    if (!publicKey || !signTransaction || !isConnected) {
      setError("Wallet not connected or not ready");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const gamePDA = getGamePDA();

      // TODO: Delegate account to ephemeral rollup for fast state updates
      // This will be implemented when MagicBlock SDK is properly integrated

      // Initialize game state
      const initialState: EphemeralGameState = {
        gameId: gamePDA.toBase58(),
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        turn: "w",
        whitePlayer: publicKey.toBase58(),
        blackPlayer: null,
        whiteTime: gameTime * 1000,
        blackTime: gameTime * 1000,
        lastMoveTime: null,
        isActive: false,
        gameResult: { type: null },
        moves: [],
      };

      setGameState(initialState);

      // Subscribe to updates
      await subscribeToGame();

      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Failed to initialize game:", err);
      setError("Failed to initialize game on ephemeral rollup");
      setIsLoading(false);
      return false;
    }
  }, [publicKey, signTransaction, isConnected, getGamePDA, gameTime, subscribeToGame]);

  // Join existing game
  const joinGame = useCallback(async () => {
    if (!publicKey || !signTransaction || !isConnected) {
      setError("Wallet not connected or engine not ready");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const gamePDA = getGamePDA();

      // Update game state with black player
      if (gameState) {
        setGameState({
          ...gameState,
          blackPlayer: publicKey.toBase58(),
          isActive: true,
          lastMoveTime: Date.now(),
        });
      }

      // Subscribe to updates
      await subscribeToGame();

      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Failed to join game:", err);
      setError("Failed to join game");
      setIsLoading(false);
      return false;
    }
  }, [publicKey, signTransaction, isConnected, getGamePDA, gameState, subscribeToGame]);

  // Make a move on ephemeral rollup (fast, no base layer confirmation needed)
  const makeMove = useCallback(
    async (from: string, to: string, promotion?: string) => {
      if (!isConnected || !gameState || !publicKey) {
        return false;
      }

      try {
        const gamePDA = getGamePDA();

        // Create move transaction for ephemeral rollup
        // This will be processed instantly without waiting for base layer
        const move = { from, to, promotion };

        // Update local state optimistically
        const newMoves = [...gameState.moves, `${from}${to}${promotion || ""}`];
        const newTurn = gameState.turn === "w" ? "b" : "w";

        setGameState({
          ...gameState,
          moves: newMoves,
          turn: newTurn as "w" | "b",
          lastMoveTime: Date.now(),
        });

        // Send to ephemeral rollup
        // In production, this would call your program's make_move instruction
        // TODO: Implement MagicBlock SDK integration when available
        // await ephemeralConnection.sendInstruction(gamePDA, makeMoveInstruction);

        return true;
      } catch (err) {
        console.error("Failed to make move:", err);
        return false;
      }
    },
    [isConnected, gameState, publicKey, getGamePDA]
  );

  // Update timer (called frequently during game)
  const updateTimer = useCallback(async () => {
    if (!gameState || !gameState.isActive || !gameState.lastMoveTime) return;

    const now = Date.now();
    const elapsed = now - gameState.lastMoveTime;

    const newState = { ...gameState };
    if (gameState.turn === "w") {
      newState.whiteTime = Math.max(0, gameState.whiteTime - elapsed);
      if (newState.whiteTime <= 0) {
        newState.gameResult = { type: "timeout", winner: "black" };
        newState.isActive = false;
      }
    } else {
      newState.blackTime = Math.max(0, gameState.blackTime - elapsed);
      if (newState.blackTime <= 0) {
        newState.gameResult = { type: "timeout", winner: "white" };
        newState.isActive = false;
      }
    }

    newState.lastMoveTime = now;
    setGameState(newState);
  }, [gameState]);

  // End game and commit state back to base layer
  const endGame = useCallback(
    async (result: { type: string; winner?: string }) => {
      if (!isConnected || !gamePDARef.current) return false;

      try {
        // Update game state
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                isActive: false,
                gameResult: result as EphemeralGameState["gameResult"],
              }
            : null
        );

        // TODO: Commit final state from ephemeral rollup back to base layer
        // This settles the game on Solana mainnet/devnet
        // await ephemeralEngine.commitState(gamePDARef.current);

        // Unsubscribe from updates
        await unsubscribeFromGame();

        return true;
      } catch (err) {
        console.error("Failed to end game:", err);
        return false;
      }
    },
    [unsubscribeFromGame]
  );

  // Resign from game
  const resign = useCallback(async () => {
    if (!publicKey || !gameState) return false;

    const winner =
      gameState.whitePlayer === publicKey.toBase58() ? "black" : "white";

    return endGame({ type: "abandoned", winner });
  }, [publicKey, gameState, endGame]);

  // Offer draw
  const offerDraw = useCallback(async () => {
    // In a real implementation, this would send a draw offer through the ephemeral rollup
    console.log("Draw offered");
    return true;
  }, []);

  // Accept draw
  const acceptDraw = useCallback(async () => {
    return endGame({ type: "draw", winner: "draw" });
  }, [endGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeFromGame();
    };
  }, [unsubscribeFromGame]);

  return {
    // State
    gameState,
    isConnected,
    isLoading,
    error,
    ephemeralConnection: getEphemeralConnection(),

    // Game lifecycle
    initializeGame,
    joinGame,
    endGame,

    // Game actions
    makeMove,
    updateTimer,
    resign,
    offerDraw,
    acceptDraw,

    // Utilities
    getGamePDA,
    subscribeToGame,
    unsubscribeFromGame,
  };
};

// Helper function to parse game state from account data
function parseGameState(data: Buffer): EphemeralGameState {
  // This would parse the actual account data according to your program's schema
  // For now, return a default state
  return {
    gameId: "",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    turn: "w",
    whitePlayer: null,
    blackPlayer: null,
    whiteTime: 300000,
    blackTime: 300000,
    lastMoveTime: null,
    isActive: false,
    gameResult: { type: null },
    moves: [],
  };
}

export default useMagicBlockGame;
