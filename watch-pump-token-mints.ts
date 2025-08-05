import {
  createSubscribeRequest,
  getYellowstoneClient,
  handleStreamEvents,
  sendSubscribeRequest,
} from "./helpers";

const PUMP_FUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const PUMP_FUN_MINT_AUTHORITY = "TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM";

const PUMP_FUN_CREATE_INSTRUCTION_HANDLER_DISCRIMINATOR = Buffer.from([
  24, 30, 200, 40, 5, 28, 7, 119,
]);

// Configuration
const programIds: Array<string> = [PUMP_FUN_PROGRAM_ID];
const requiredAccounts: Array<string> = [
  PUMP_FUN_PROGRAM_ID,
  PUMP_FUN_MINT_AUTHORITY,
];
const instructionDiscriminators: Array<Uint8Array> = [
  PUMP_FUN_CREATE_INSTRUCTION_HANDLER_DISCRIMINATOR,
];

const ACCOUNTS_TO_INCLUDE = [
  {
    name: "mint",
    index: 0,
  },
];

const yellowstoneClient = getYellowstoneClient("mainnet");
const stream = await yellowstoneClient.subscribe();
const request = createSubscribeRequest(programIds, requiredAccounts);
await sendSubscribeRequest(stream, request);
console.log(
  "🔌 Geyser connection established - watching new Pump.fun token mints...\n"
);
await handleStreamEvents(
  stream,
  instructionDiscriminators,
  ACCOUNTS_TO_INCLUDE
);
