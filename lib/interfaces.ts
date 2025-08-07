export interface CompiledInstruction {
  programIdIndex: number;
  accounts: Uint8Array;
  data: Uint8Array;
}

export interface MintInformation {
  mint: string;
  transaction: string;
  slot: number;
}
