import { NextRequest, NextResponse } from "next/server";
import { PublicKey, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { GameState, GameResult } from "@/lib/solana/config";

// Connection to Solana devnet
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Game account data structure (matches Solana program)
interface GameAccountData {
  gameId: string;
  whitePlayer: string;
  blackPlayer: string | null;
  betAmount: number;
  state: number;
  result: number;
  createdAt: number;
  finishedAt: number;
  roomName: string;
  whiteClaimed: boolean;
  blackClaimed: boolean;
}

// Parse game account data from buffer
// This is a placeholder - implement actual parsing based on your Solana program's schema
function parseGameAccountData(data: Buffer): GameAccountData | null {
  try {
    // In production, parse according to your Anchor/program schema
    // For now, return placeholder data
    return null;
  } catch {
    return null;
  }
}

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const gameIdParam = searchParams.get("gameId");

    if (!gameIdParam) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 }
      );
    }

    // Parse as PublicKey
    let gamePubkey: PublicKey;
    try {
      gamePubkey = new PublicKey(gameIdParam);
    } catch {
      return NextResponse.json(
        { error: "Invalid game ID format. Must be a valid Solana public key." },
        { status: 400 }
      );
    }

    // Fetch account info
    const accountInfo = await connection.getAccountInfo(gamePubkey);

    if (!accountInfo) {
      return NextResponse.json(
        { error: "Game account not found" },
        { status: 404 }
      );
    }

    // Parse account data
    const gameData = parseGameAccountData(accountInfo.data);

    if (!gameData) {
      // Return basic account info if parsing fails
      return NextResponse.json({
        gameInfo: {
          gameId: gamePubkey.toBase58(),
          exists: true,
          balance: accountInfo.lamports / LAMPORTS_PER_SOL,
          dataLength: accountInfo.data.length,
          owner: accountInfo.owner.toBase58(),
          note: "Full game data parsing pending program deployment",
        },
      });
    }

    // Return parsed game info
    return NextResponse.json({
      gameInfo: {
        ...gameData,
        stateText:
          gameData.state === GameState.WAITING
            ? "WAITING"
            : gameData.state === GameState.ACTIVE
            ? "ACTIVE"
            : gameData.state === GameState.FINISHED
            ? "FINISHED"
            : "CANCELLED",
        resultText:
          gameData.result === GameResult.NONE
            ? "NONE"
            : gameData.result === GameResult.WHITE_WINS
            ? "WHITE_WINS"
            : gameData.result === GameResult.BLACK_WINS
            ? "BLACK_WINS"
            : "DRAW",
      },
    });
  } catch (error) {
    console.error("Error fetching game info:", error);
    return NextResponse.json(
      { error: "Failed to fetch game info" },
      { status: 500 }
    );
  }
};
