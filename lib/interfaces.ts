export interface CompiledInstruction {
  programIdIndex: number;
  accounts: Uint8Array;
  data: Uint8Array;
}

export interface EventInformation {
  accounts: Record<string, string>;
  transaction: string;
  slot: number;
}
