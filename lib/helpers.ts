import { getBase58Decoder } from "@solana/kit";

// Convert transaction signatures and token addresses (given as Uint8Array) to base58
export const bufferToBase58 = (buffer: Uint8Array): string => {
  return getBase58Decoder().decode(buffer);
};

export const getExplorerUrl = (address: string, type: "address" | "tx") => {
  return `https://explorer.solana.com/${type}/${address}`;
};

// Get the discriminator for an instruction handler
// We can use this later to find instructions that called this instruction handler
export const getInstructionHandlerDiscriminator = (
  programIdl: any,
  instructionName: string
) => {
  // IDLs use the term 'instruction' when they mean instruction handler.
  const instructionHandlers = programIdl.instructions;
  const instruction = programIdl.instructions.find(
    (instruction: any) => instruction.name === instructionName
  );
  const discriminatorBytes = instruction.discriminator;
  return Buffer.from(discriminatorBytes);
};

// Get the account names and indices for the accounts used in an instruction handler
export const getAccountsFromIdl = (
  programIdl: any,
  instructionName: string,
  includeAccountNames?: Array<string>
): Array<{ name: string; index: number }> => {
  const instruction = programIdl.instructions.find(
    (instruction: any) => instruction.name === instructionName
  );

  if (!instruction) {
    throw new Error(`Instruction '${instructionName}' not found in IDL`);
  }

  const accountsWithIndices: Array<{ name: string; index: number }> =
    instruction.accounts.map((account: any, index: number) => ({
      name: account.name,
      index,
    }));

  if (!includeAccountNames || includeAccountNames.length === 0) {
    return accountsWithIndices;
  }

  const includeSet = new Set(includeAccountNames);
  return accountsWithIndices.filter(({ name }) => includeSet.has(name));
};
