import {
  createSubscribeRequest,
  handleStreamEvents,
  sendSubscribeRequest,
  getSlotFromTimeAgo,
} from "./lib/yellowstone";
import { getYellowstoneEndpointAndToken } from "./lib/quicknode";
import { env } from "node:process";
import { MINUTES } from "./lib/constants";
import Client from "@triton-one/yellowstone-grpc";
import {
  getInstructionHandlerDiscriminator,
  getAccountsFromIdl,
} from "./lib/helpers";

// Downloaded from https://explorer.solana.com/address/61DFfeTKM7trxYcPQCM78bJ794ddZprZpAwAnLiwTpYH/idl
// (we know that's the address because when you make a swap, the transaction includes this program address)
import programIdl from "./jupiter-order-engine.json";

// IDL has an incorrect programIdl.address value
// See https://solana.stackexchange.com/questions/23189/why-would-the-address-in-a-programs-idl-not-match-where-its-actually-deployed
const JUPITER_ORDER_ENGINE_ADDRESS =
  "61DFfeTKM7trxYcPQCM78bJ794ddZprZpAwAnLiwTpYH";
programIdl.address = JUPITER_ORDER_ENGINE_ADDRESS;

// Monitor my own wallet and Shaq's wallet
const MIKEMACCANA_DOT_SOL = "dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8";
const SHAQ_DOT_SOL = "gacMrsrxNisAhCfgsUAVbwmTC3w9nJB6NychLAnTQFv";

const PROGRAM_ID = programIdl.address;

// We're watching the create() instruction handler
const JUPUTER_ORDER_ENGINE_FILL_INSTRUCTION_HANDLER_DISCRIMINATOR =
  getInstructionHandlerDiscriminator(programIdl, "fill");

// The program and required accounts to watch via Yellowstone gRPC
// See https://github.com/rpcpool/yellowstone-grpc?tab=readme-ov-file#filters-for-streamed-data for full list of filters.
// Any of these accounts must be included in the transaction.
const includedAccounts: Array<string> = [MIKEMACCANA_DOT_SOL, SHAQ_DOT_SOL];
const excludedAccounts: Array<string> = [];
// All of these accounts must be included in the transaction.
const requiredAccounts: Array<string> = [PROGRAM_ID];

// After we get the events from Yellowstone gRPC, we'll filter them by the instruction handler (onchain function) being invoked
const instructionDiscriminators: Array<Uint8Array> = [
  JUPUTER_ORDER_ENGINE_FILL_INSTRUCTION_HANDLER_DISCRIMINATOR,
];

// Get account information from the IDL for the create instruction
// This will include all accounts used in the create instruction with their names and indices
const ACCOUNTS_TO_INCLUDE: Array<{
  name: string;
  index: number;
}> = getAccountsFromIdl(programIdl, "fill", [
  "taker",
  "maker",
  "input_mint",
  "output_mint",
]);

const rpcEndpoint = env["QUICKNODE_SOLANA_MAINNET_ENDPOINT"];
if (!rpcEndpoint) {
  throw new Error(
    "QUICKNODE_SOLANA_MAINNET_ENDPOINT environment variable is required"
  );
}

const { yellowstoneEndpoint, yellowstoneToken } =
  getYellowstoneEndpointAndToken(rpcEndpoint);

const yellowstoneClient = new Client(yellowstoneEndpoint, yellowstoneToken, {});
// Somewhat confusingly, we need to call `subscribe` on the client to get a stream
// and then make a subscribe request to the stream.
const stream = await yellowstoneClient.subscribe();

// Typically, we would record the most recent slot when each event is recieved,
// and then replay from that slot if we need to recover.
// For this demo, let's get the last 5 minutes of transactions
const fromSlot = await getSlotFromTimeAgo(yellowstoneClient, 5 * MINUTES);

// Create subscribe request with fromSlot parameter
const request = createSubscribeRequest(
  includedAccounts,
  excludedAccounts,
  requiredAccounts,
  fromSlot
);

await sendSubscribeRequest(stream, request);
console.log(
  "🔌 Geyser connection established - watching program for events...\n"
);
await handleStreamEvents(
  stream,
  instructionDiscriminators,
  ACCOUNTS_TO_INCLUDE
);
