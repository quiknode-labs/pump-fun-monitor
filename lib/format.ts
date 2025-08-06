import { bufferToBase58 } from "./helpers";
import {
  CompiledInstruction,
  FormattedTransactionData,
  Message,
} from "./interfaces";

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
