import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

// Network configurations
export const NETWORKS = {
  devnet: {
    name: "Solana Devnet",
    endpoint: clusterApiUrl("devnet"),
    wsEndpoint: "wss://api.devnet.solana.com",
  },
  mainnet: {
    name: "Solana Mainnet",
    endpoint: clusterApiUrl("mainnet-beta"),
    wsEndpoint: "wss://api.mainnet-beta.solana.com",
  },
  // MagicBlock Ephemeral Rollup endpoints
  magicblock: {
    name: "MagicBlock Ephemeral Rollup",
    endpoint: "https://devnet.magicblock.app",
    wsEndpoint: "wss://devnet.magicblock.app",
  },
} as const;

// Current active network
export const ACTIVE_NETWORK = NETWORKS.devnet;

// MagicBlock configuration
export const MAGICBLOCK_CONFIG = {
  // Ephemeral Rollup RPC endpoint
  ephemeralRpcUrl: "https://devnet.magicblock.app",
  // Base layer (Solana devnet)
  baseLayerRpcUrl: NETWORKS.devnet.endpoint,
};

// Chess game program ID (to be deployed)
// This will be the program ID of your Solana program for chess betting
export const CHESS_PROGRAM_ID = new PublicKey(
  // Replace with your actual program ID after deployment
  "ChessXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

// Create connection instances
export const createConnection = (network: keyof typeof NETWORKS = "devnet") => {
  return new Connection(NETWORKS[network].endpoint, {
    commitment: "confirmed",
    wsEndpoint: NETWORKS[network].wsEndpoint,
  });
};

// MagicBlock ephemeral rollup connection
export const createEphemeralConnection = () => {
  return new Connection(MAGICBLOCK_CONFIG.ephemeralRpcUrl, {
    commitment: "confirmed",
  });
};

// Default connection
export const connection = createConnection("devnet");

// Game state enum matching Solana program
export const GameState = {
  WAITING: 0,
  ACTIVE: 1,
  FINISHED: 2,
  CANCELLED: 3,
} as const;

// Game result enum matching Solana program
export const GameResult = {
  NONE: 0,
  WHITE_WINS: 1,
  BLACK_WINS: 2,
  DRAW: 3,
} as const;

// Lamports per SOL
export const LAMPORTS_PER_SOL = 1_000_000_000;

// Format SOL amount
export const formatSOL = (lamports: number | bigint): string => {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  return sol.toFixed(4);
};

// Parse SOL to lamports
export const parseSOL = (sol: string | number): number => {
  return Math.floor(Number(sol) * LAMPORTS_PER_SOL);
};
