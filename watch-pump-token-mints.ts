import {
  createSubscribeRequest,
  handleStreamEvents,
  sendSubscribeRequest,
  getCurrentSlot,
  getSlotFromNow,
} from "./lib/yellowstone";
import { getYellowstoneEndpointAndToken } from "./lib/quicknode";
import { env } from "node:process";
import { MINUTES } from "./lib/constants";
import { connect } from "solana-kite";
import Client from "@triton-one/yellowstone-grpc";

// We're watching the pump.fun program
const PUMP_FUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
// We're watching the createToken() instruction handler
const PUMP_FUN_CREATE_INSTRUCTION_HANDLER_DISCRIMINATOR = Buffer.from([
  24, 30, 200, 40, 5, 28, 7, 119,
]);

const PUMP_FUN_MINT_AUTHORITY = "TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM";

// The program, instruction handler, and required accounts to watch
const programIds: Array<string> = [PUMP_FUN_PROGRAM_ID];
const instructionDiscriminators: Array<Uint8Array> = [
  PUMP_FUN_CREATE_INSTRUCTION_HANDLER_DISCRIMINATOR,
];
const requiredAccounts: Array<string> = [
  PUMP_FUN_PROGRAM_ID,
  PUMP_FUN_MINT_AUTHORITY,
];

const ACCOUNTS_TO_INCLUDE = [
  {
    name: "mint",
    index: 0,
  },
];

const rpcEndpoint = env["QUICKNODE_SOLANA_MAINNET_ENDPOINT"];
if (!rpcEndpoint) {
  throw new Error(
    "QUICKNODE_SOLANA_MAINNET_ENDPOINT environment variable is required"
  );
}

const { yellowstoneEndpoint, yellowstoneToken } =
  getYellowstoneEndpointAndToken(rpcEndpoint);

const yellowstoneClient = new Client(yellowstoneEndpoint, yellowstoneToken, {});

const stream = await yellowstoneClient.subscribe();

// Typically, we would record the most recent slot
// const fromSlot = 358347908;

// If we want to get the last 5 minutes of transactions
const fromSlot = await getSlotFromNow(yellowstoneClient, 5 * MINUTES);

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
