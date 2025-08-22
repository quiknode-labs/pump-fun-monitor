import Client, {
  CommitmentLevel,
  SubscribeRequest,
  SubscribeUpdate,
} from "@triton-one/yellowstone-grpc";
import { ClientDuplexStream } from "@grpc/grpc-js";
import { bufferToBase58, getExplorerUrl } from "./helpers";
import { CompiledInstruction, EventInformation } from "./interfaces";
import {
  MAX_SLOTS_TO_REPLAY,
  MAX_TIME_TO_REPLAY_MINUTES,
  SOLANA_SLOT_TIME_MS,
} from "./constants";

// Yellowstone natively returns the slot as a string, so let's fix that.
export const getCurrentSlot = async (
  yellowstoneClient: Client
): Promise<number> => {
  const currentSlotString = await yellowstoneClient.getSlot();
  return Number(currentSlotString);
};

// Allow us to get the slot from a given time in the past
export const getSlotFromTimeAgo = async (
  yellowstoneClient: Client,
  timeAgo: number
) => {
  const now = Date.now();
  const fromTime = now - timeAgo;

  const slotsAgo = Math.ceil(timeAgo / SOLANA_SLOT_TIME_MS);
  if (slotsAgo > MAX_SLOTS_TO_REPLAY) {
    throw new Error(
      `From time ${new Date(
        fromTime
      ).toISOString()} is too far in the past. Maximum time to replay is ${MAX_TIME_TO_REPLAY_MINUTES} minutes.`
    );
  }

  const currentSlot = await getCurrentSlot(yellowstoneClient);
  const fromSlot = currentSlot - slotsAgo;

  return fromSlot;
};

export const createSubscribeRequest = (
  includedAccounts: Array<string>,
  excludedAccounts: Array<string>,
  requiredAccounts: Array<string>,
  fromSlot: number | null = null
): SubscribeRequest => {
  // See https://github.com/rpcpool/yellowstone-grpc?tab=readme-ov-file#filters-for-streamed-data for full list of filters.
  const request: SubscribeRequest = {
    commitment: CommitmentLevel.CONFIRMED,
    accounts: {},
    slots: {},
    transactions: {
      // We can have multiple filters here, but for this demo, we'll only have one.
      // When we get events, we can check which filter was matched.
      // https://github.com/rpcpool/yellowstone-grpc?tab=readme-ov-file#transactions
      myFilter: {
        vote: false,
        failed: false,
        accountInclude: includedAccounts,
        accountExclude: excludedAccounts,
        accountRequired: requiredAccounts,
      },
    },
    transactionsStatus: {},
    entry: {},
    blocks: {},
    blocksMeta: {},
    accountsDataSlice: [],
    ping: undefined,
  };

  if (fromSlot) {
    // Yellowstone expects the slot as a string, so let's fix that.
    request.fromSlot = String(fromSlot);
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

export const checkInstructionMatchesInstructionHandlers = (
  instruction: CompiledInstruction,
  instructionHandlerDiscriminators: Array<Uint8Array>
): boolean => {
  return (
    instruction?.data &&
    instructionHandlerDiscriminators.some((instructionHandlerDiscriminator) =>
      Buffer.from(instructionHandlerDiscriminator).equals(
        instruction.data.slice(0, 8)
      )
    )
  );
};

export const getAccountsByName = (
  accountsToInclude: Array<{ name: string; index: number }>,
  instruction: CompiledInstruction,
  accountKeys: Array<Uint8Array>
): Record<string, string> => {
  return accountsToInclude.reduce<Record<string, string>>(
    (accumulator, account) => {
      const accountIndex = instruction.accounts[account.index];
      const address = bufferToBase58(accountKeys[accountIndex]);
      accumulator[account.name] = address;
      return accumulator;
    },
    {}
  );
};

export const getEventInfoFromUpdate = (
  update: SubscribeUpdate,
  instructionHandlerDiscriminators: Array<Uint8Array>,
  accountsToInclude: Array<{ name: string; index: number }>
): null | EventInformation => {
  // Check the filter name that was matched
  // (Yellowstone also sends other things like 'ping' updates, but we don't care about those)
  if (!update.filters.includes("myFilter")) {
    return null;
  }

  // These should never happen in this demo,
  // since our filter's matches will include the right properties.
  // but let's satisfy the type checker.
  const transaction = update.transaction?.transaction;
  const message = transaction?.transaction?.message;
  const slot = update.transaction?.slot;
  if (!transaction || !message || !slot) {
    return null;
  }

  // Find the instruction that matches our target instruction handler
  const instruction =
    message.instructions.find((instruction) =>
      checkInstructionMatchesInstructionHandlers(
        instruction,
        instructionHandlerDiscriminators
      )
    ) || null;
  if (!instruction) {
    return null;
  }

  // Make a nice Object of account value/address pairs, so we can get the address
  // values this instruction used for each account name.
  const accountsByName = getAccountsByName(
    accountsToInclude,
    instruction,
    message.accountKeys
  );

  const base58TransactionSignature = bufferToBase58(transaction.signature);

  // Make a object with the account name and the explorer url
  const accountsByNameWithExplorerUrls: Record<string, string> = {};
  Object.entries(accountsByName).forEach(([key, value]) => {
    accountsByNameWithExplorerUrls[key] = getExplorerUrl(value, "address");
  });

  return {
    transaction: getExplorerUrl(base58TransactionSignature, "tx"),
    slot: Number(slot),
    accounts: accountsByNameWithExplorerUrls,
  };
};

export const handleStreamEvents = (
  stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>,
  instructionDiscriminators: Array<Uint8Array>,
  accountsToInclude: Array<{ name: string; index: number }>
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    stream.on("data", (update: SubscribeUpdate) => {
      const eventInfo = getEventInfoFromUpdate(
        update,
        instructionDiscriminators,
        accountsToInclude
      );

      if (eventInfo) {
        console.log("✅ Event Detected!");
        console.table(eventInfo);
        console.log("\n");
      }
    });
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
