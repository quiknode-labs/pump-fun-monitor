import {
  CommitmentLevel,
  SubscribeRequest,
  SubscribeUpdate,
  SubscribeUpdateTransaction,
} from "@triton-one/yellowstone-grpc";
import { ClientDuplexStream } from "@grpc/grpc-js";
import { formatData, matchesInstructionDiscriminator } from "./format";
import { bufferToBase58 } from "./helpers";

export const createSubscribeRequest = (
  programIds: Array<string>,
  requiredAccounts: Array<string>,
  fromSlot: string | null = null
): SubscribeRequest => {
  const request: SubscribeRequest = {
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

  if (fromSlot) {
    request.fromSlot = fromSlot;
  }

  return request;
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
