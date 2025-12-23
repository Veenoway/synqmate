import { NextRequest, NextResponse } from "next/server";
import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";
import { CHESS_PROGRAM_ID } from "@/lib/solana/config";

// Connection to Solana devnet
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get("roomName");

    if (!roomName) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 }
      );
    }

    // Derive the game PDA from room name
    const [gamePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), Buffer.from(roomName)],
      CHESS_PROGRAM_ID
    );

    // Check if the account exists
    const accountInfo = await connection.getAccountInfo(gamePDA);

    return NextResponse.json({
      gameId: gamePDA.toBase58(),
      exists: accountInfo !== null,
      roomName,
    });
  } catch (error) {
    console.error("Error fetching game ID:", error);
    return NextResponse.json(
      { error: "Failed to fetch game ID" },
      { status: 500 }
    );
  }
};
