export const SECONDS = 1000;
export const MINUTES = SECONDS * 60;

// Set by Solana
export const SOLANA_SLOT_TIME_MS = 400;

// Set by RPC provider
export const MAX_SLOTS_TO_REPLAY = 3000;

export const MAX_TIME_TO_REPLAY_MS = MAX_SLOTS_TO_REPLAY * SOLANA_SLOT_TIME_MS;
export const MAX_TIME_TO_REPLAY_MINUTES = MAX_TIME_TO_REPLAY_MS / 1000 / 60;

export const MIKEMACCANA_DOT_SOL =
  "dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8";
export const SHAQ_DOT_SOL = "gacMrsrxNisAhCfgsUAVbwmTC3w9nJB6NychLAnTQFv";
