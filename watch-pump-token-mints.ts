import {
  createSubscribeRequest,
  getYellowstoneClient,
  handleStreamEvents,
  sendSubscribeRequest,
} from "./lib/helpers";

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

// Get current slot and calculate fromSlot (1000 slots ago)
const currentSlot = Number(await yellowstoneClient.getSlot());
const fromSlot = (currentSlot - 1000).toString();

console.log(`Current slot: ${currentSlot}`);
console.log(`Starting from slot: ${fromSlot} (1000 slots ago)`);

const stream = await yellowstoneClient.subscribe();

// Create subscribe request with fromSlot parameter
const request = createSubscribeRequest(programIds, requiredAccounts, fromSlot);

await sendSubscribeRequest(stream, request);
console.log(
  "🔌 Geyser connection established - watching new Pump.fun token mints with fromSlot replay...\n"
);
await handleStreamEvents(
  stream,
  instructionDiscriminators,
  ACCOUNTS_TO_INCLUDE
);
