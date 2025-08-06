export interface CompiledInstruction {
  programIdIndex: number;
  accounts: Uint8Array;
  data: Uint8Array;
}

export interface FormattedTransactionData {
  transaction: string;
  slot: string;
  [accountName: string]: string;
}

export interface Message {
  header: MessageHeader | undefined;
  accountKeys: Array<Uint8Array>;
  recentBlockhash: Uint8Array;
  instructions: Array<CompiledInstruction>;
  versioned: boolean;
  addressTableLookups: Array<MessageAddressTableLookup>;
}

export interface MessageHeader {
  numRequiredSignatures: number;
  numReadonlySignedAccounts: number;
  numReadonlyUnsignedAccounts: number;
}

export interface MessageAddressTableLookup {
  accountKey: Uint8Array;
  writableIndexes: Uint8Array;
  readonlyIndexes: Uint8Array;
}
