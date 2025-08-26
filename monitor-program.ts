import {
  createSubscribeRequest,
  handleStreamEvents,
  sendSubscribeRequest,
  getSlotFromTimeAgo,
} from "./lib/yellowstone";
import { getYellowstoneEndpointAndToken } from "./lib/quicknode";
import { env } from "node:process";
import { MIKEMACCANA_DOT_SOL, MINUTES, SHAQ_DOT_SOL } from "./lib/constants";
import Client from "@triton-one/yellowstone-grpc";
import {
  getInstructionHandlerDiscriminator,
  getAccountsFromIdl,
} from "./lib/helpers";

// Downloaded from https://explorer.solana.com/address/61DFfeTKM7trxYcPQCM78bJ794ddZprZpAwAnLiwTpYH/idl
// (we know that's the address because when you make a swap, the transaction includes this program address)
// IDL has an incorrect programIdl.address value
// See https://solana.stackexchange.com/questions/23189/why-would-the-address-in-a-programs-idl-not-match-where-its-actually-deployed
import jupiterOrderEngine from "./jupiter-order-engine.json";
import { BigFilterConfig } from "./lib/interfaces";
const JUPITER_ORDER_ENGINE_ADDRESS =
  "61DFfeTKM7trxYcPQCM78bJ794ddZprZpAwAnLiwTpYH";
jupiterOrderEngine.address = JUPITER_ORDER_ENGINE_ADDRESS;

const bigFiltersConfig: Array<BigFilterConfig> = [
  {
    idl: jupiterOrderEngine,
    yellowStoneFilter: {
      name: "myFilter",

      // The program and required accounts to watch via Yellowstone gRPC
      // See https://github.com/rpcpool/yellowstone-grpc?tab=readme-ov-file#filters-for-streamed-data for full list of filters.
      // Any of these accounts must be included in the transaction.
      // Monitor my own wallet and Shaq's wallet
      includedAccounts: [MIKEMACCANA_DOT_SOL, SHAQ_DOT_SOL],
      // Any of these accounts must be excluded in the transaction.
      excludedAccounts: [],
      // All of these accounts must be included in the transaction.
      requiredAccounts: [jupiterOrderEngine.address],
    },
    instructionHandler: {
      name: "fill",
      accountsToIncludeInEvent: ["taker", "maker", "input_mint", "output_mint"],
    },
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
// Somewhat confusingly, we need to call `subscribe` on the client to get a stream
// and then make a subscribe request to the stream.
const stream = await yellowstoneClient.subscribe();

// Typically, we would record the most recent slot when each event is recieved,
// and then replay from that slot if we need to recover.
// For this demo, let's get the last 5 minutes of transactions
const fromSlot = await getSlotFromTimeAgo(yellowstoneClient, 5 * MINUTES);

// Create subscribe request with fromSlot parameter
const request = createSubscribeRequest(bigFiltersConfig, fromSlot);

await sendSubscribeRequest(stream, request);
console.log(
  "🔌 Geyser connection established - watching program for events...\n"
);
await handleStreamEvents(stream, bigFiltersConfig);
