import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { CHESS_PROGRAM_ID, MAGICBLOCK_CONFIG } from "@/lib/solana/config";

// Connection to Solana (devnet by default)
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// MagicBlock ephemeral rollup connection
const ephemeralConnection = new Connection(
  MAGICBLOCK_CONFIG.ephemeralRpcUrl,
  "confirmed"
);

// Relayer keypair from environment variable
// The private key should be base58 encoded or as a JSON array
const getRelayerKeypair = (): Keypair => {
  const privateKey = process.env.SOLANA_RELAYER_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("SOLANA_RELAYER_PRIVATE_KEY environment variable is not set");
  }

  try {
    // Try to parse as base58
    const secretKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(secretKey);
  } catch {
    try {
      // Try to parse as JSON array
      const secretKey = new Uint8Array(JSON.parse(privateKey));
      return Keypair.fromSecretKey(secretKey);
    } catch {
      throw new Error("Invalid SOLANA_RELAYER_PRIVATE_KEY format");
    }
  }
};

// Log relayer address on startup (if key is available)
try {
  const relayer = getRelayerKeypair();
  console.log("Solana Relayer address:", relayer.publicKey.toBase58());
} catch (e) {
  console.log("Solana Relayer not configured:", e);
}

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { gameId, result } = body;

    // Validate parameters
    if (!gameId || typeof gameId !== "string") {
      return NextResponse.json(
        { error: "Game ID is required and must be a string (base58 public key)" },
        { status: 400 }
      );
    }

    if (!result || ![1, 2, 3].includes(Number(result))) {
      return NextResponse.json(
        { error: "Result must be 1 (White wins), 2 (Black wins), or 3 (Draw)" },
        { status: 400 }
      );
    }

    // Parse game ID as PublicKey
    let gamePubkey: PublicKey;
    try {
      gamePubkey = new PublicKey(gameId);
    } catch {
      return NextResponse.json(
        { error: "Invalid game ID format. Must be a valid Solana public key." },
        { status: 400 }
      );
    }

    const resultNumber = Number(result) as 1 | 2 | 3;

    console.log("Solana Relayer: Starting game finish process", {
      gameId: gamePubkey.toBase58(),
      result: resultNumber,
      resultText:
        resultNumber === 1
          ? "WHITE_WINS"
          : resultNumber === 2
          ? "BLACK_WINS"
          : "DRAW",
    });

    // Get relayer keypair
    const relayer = getRelayerKeypair();
    console.log("Relayer address:", relayer.publicKey.toBase58());

    // Check relayer balance
    const relayerBalance = await connection.getBalance(relayer.publicKey);
    console.log(
      "Relayer balance:",
      relayerBalance / LAMPORTS_PER_SOL,
      "SOL"
    );

    if (relayerBalance < 0.01 * LAMPORTS_PER_SOL) {
      return NextResponse.json(
        { error: "Relayer has insufficient balance for transaction fees" },
        { status: 500 }
      );
    }

    // Check if game account exists
    const gameAccountInfo = await connection.getAccountInfo(gamePubkey);
    if (!gameAccountInfo) {
      return NextResponse.json(
        { error: "Game account not found" },
        { status: 404 }
      );
    }

    // In production, you would:
    // 1. Parse the game account data to check its state
    // 2. Build the finish_game instruction for your Solana program
    // 3. Send and confirm the transaction

    // For now, we'll create a placeholder transaction
    // This should be replaced with actual program instruction

    /*
    Example with Anchor:

    const program = new Program(idl, CHESS_PROGRAM_ID, provider);
    const tx = await program.methods
      .finishGame(resultNumber)
      .accounts({
        game: gamePubkey,
        authority: relayer.publicKey,
      })
      .transaction();

    const signature = await sendAndConfirmTransaction(connection, tx, [relayer]);
    */

    // Placeholder response for now
    // In production, replace with actual transaction
    console.log("Game finish requested - program integration pending");

    return NextResponse.json({
      success: true,
      message: "Game finish request processed",
      gameId: gamePubkey.toBase58(),
      result: resultNumber,
      relayerAddress: relayer.publicKey.toBase58(),
      note: "Full Solana program integration pending deployment",
    });
  } catch (error: unknown) {
    console.error("Solana Relayer error:", error);

    let errorMessage = "Failed to finish game via relayer";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// GET endpoint to check relayer status
export const GET = async () => {
  try {
    const relayer = getRelayerKeypair();
    const balance = await connection.getBalance(relayer.publicKey);

    return NextResponse.json({
      status: "active",
      network: "devnet",
      relayerAddress: relayer.publicKey.toBase58(),
      balance: balance / LAMPORTS_PER_SOL,
      programId: CHESS_PROGRAM_ID.toBase58(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};
