import Client, {
  CommitmentLevel,
  SubscribeRequest,
  SubscribeUpdate,
  SubscribeUpdateTransaction,
} from "@triton-one/yellowstone-grpc";
import { ClientDuplexStream } from "@grpc/grpc-js";
import bs58 from "bs58";
import { env } from "node:process";
import {
  CompiledInstruction,
  FormattedTransactionData,
  Message,
} from "./interfaces";

export const getYellowstoneClient = (clusterName: "mainnet" | "devnet") => {
  const { yellowstoneEndpoint, yellowstoneToken } =
    getYellowstoneEndpointAndToken(clusterName);

  return new Client(yellowstoneEndpoint, yellowstoneToken, {});
};

// Convert the RPC endpoint to a Yellowstone endpoint and token
export const getYellowstoneEndpointAndToken = (
  clusterName: "mainnet" | "devnet"
) => {
  const environmentVariable =
    clusterName === "mainnet"
      ? "QUICKNODE_SOLANA_MAINNET_ENDPOINT"
      : "QUICKNODE_SOLANA_DEVNET_ENDPOINT";
  const rpcEndpoint = env[environmentVariable];

  if (!rpcEndpoint) {
    throw new Error(
      `Environment variable ${environmentVariable} is not set. Please set it in your environment using the value from https://dashboard.quicknode.com/endpoints. `
    );
  }

  // Convert endpoint to URL object
  const url = new URL(rpcEndpoint);
  const YELLOWSTONE_PORT = 10000;

  // Yellowstone endpoint is the same as the RPC endpoint, but with the port 10000 and no pathname
  const yellowstoneEndpoint = `${url.protocol}//${url.hostname}:${YELLOWSTONE_PORT}`;

  // The token is the pathname of the RPC endpoint, but without the leading slash
  const yellowstoneToken = url.pathname.replace(/\//g, "");

  return { yellowstoneEndpoint, yellowstoneToken };
};

export const createSubscribeRequest = (
  programIds: Array<string>,
  requiredAccounts: Array<string>
): SubscribeRequest => {
  return {
    accounts: {},
    slots: {},
    transactions: {
      pumpFun: {
        accountInclude: programIds,
        accountExclude: [],
        accountRequired: requiredAccounts,
      },
    },
    transactionsStatus: {},
    entry: {},
    blocks: {},
    blocksMeta: {},
    commitment: CommitmentLevel.CONFIRMED,
    accountsDataSlice: [],
    ping: undefined,
  };
};

export const sendSubscribeRequest = (
  stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>,
  request: SubscribeRequest
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    stream.write(request, (error: Error | null) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

// Was named 'convertSignature'
const bufferToBase58 = (signature: Uint8Array): string => {
  return bs58.encode(Buffer.from(signature));
};

export const isSubscribeUpdateTransaction = (
  data: SubscribeUpdate
): data is SubscribeUpdate & { transaction: SubscribeUpdateTransaction } => {
  return (
    "transaction" in data &&
    typeof data.transaction === "object" &&
    data.transaction !== null &&
    "slot" in data.transaction &&
    "transaction" in data.transaction
  );
};

export const formatData = (
  message: Message,
  transactionSignature: string,
  slot: string,
  instructionDiscriminators: Array<Uint8Array>,
  accountsToInclude: Array<{ name: string; index: number }>
): FormattedTransactionData | null => {
  const matchingInstruction = message.instructions.find((instruction) =>
    matchesInstructionDiscriminator(instruction, instructionDiscriminators)
  );

  if (!matchingInstruction) {
    return null;
  }

  const accountKeys = message.accountKeys;
  const includedAccounts = accountsToInclude.reduce<Record<string, string>>(
    (accumulator, { name, index }) => {
      const accountIndex = matchingInstruction.accounts[index];
      const address = bufferToBase58(accountKeys[accountIndex]);
      accumulator[name] = address;
      return accumulator;
    },
    {}
  );

  return {
    transaction: transactionSignature,
    slot,
    ...includedAccounts,
  };
};

export const matchesInstructionDiscriminator = (
  instruction: CompiledInstruction,
  instructionDiscriminators: Array<Uint8Array>
): boolean => {
  return (
    instruction?.data &&
    instructionDiscriminators.some((discriminator) =>
      Buffer.from(discriminator).equals(instruction.data.slice(0, 8))
    )
  );
};

export const handleData = (
  data: SubscribeUpdate,
  instructionDiscriminators: Array<Uint8Array>,
  accountsToInclude: Array<{ name: string; index: number }>
): void => {
  if (
    !isSubscribeUpdateTransaction(data) ||
    !data.filters.includes("pumpFun")
  ) {
    return;
  }

  const transaction = data.transaction?.transaction;
  const message = transaction?.transaction?.message;

  if (!transaction || !message) {
    return;
  }

  const matchingInstruction = message.instructions.find((instruction) =>
    matchesInstructionDiscriminator(instruction, instructionDiscriminators)
  );
  if (!matchingInstruction) {
    return;
  }

  const base58TransactionSignature = bufferToBase58(transaction.signature);
  const formattedData = formatData(
    message,
    base58TransactionSignature,
    data.transaction.slot,
    instructionDiscriminators,
    accountsToInclude
  );

  if (formattedData) {
    console.log("💊 New Pump.fun Mint Detected!");
    console.table(formattedData);
    console.log("\n");
  }
};

export const handleStreamEvents = (
  stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>,
  instructionDiscriminators: Array<Uint8Array>,
  accountsToInclude: Array<{ name: string; index: number }>
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    stream.on("data", (data: SubscribeUpdate) =>
      handleData(data, instructionDiscriminators, accountsToInclude)
    );
    stream.on("error", (error: Error) => {
      console.error("Stream error:", error);
      reject(error);
      stream.end();
    });
    stream.on("end", () => {
      console.log("Stream ended");
      resolve();
    });
    stream.on("close", () => {
      console.log("Stream closed");
      resolve();
    });
  });
};
