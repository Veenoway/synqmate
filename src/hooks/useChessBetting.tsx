// Re-export everything from useSolanaBetting for backward compatibility
// This file maintains API compatibility with existing code that imports from useChessBetting

export {
  useSolanaBetting as useChessBetting,
  useSolanaBetting,
  useGameInfo,
  useGameIdByRoom,
  usePlayerStats,
  formatSolAmount,
  parseSolAmount,
  finishGameWithResult,
  GameState,
  GameResult,
} from "./useSolanaBetting";

export type { GameInfo, PlayerStats } from "./useSolanaBetting";
