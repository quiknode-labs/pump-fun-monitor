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

export interface BigFilterConfig {
  idl: any;
  yellowStoneFilter: {
    name: string;
    includedAccounts: Array<string>;
    excludedAccounts: Array<string>;
    requiredAccounts: Array<string>;
  };
  instructionHandler: {
    name: string;
    accountsToIncludeInEvent: Array<string>;
  };
}

// Add a type ExpendedBigFilterConfig based on BigFilterConfig with instructionDiscriminator and accountsToInclude
export interface ExpendedBigFilterConfig extends BigFilterConfig {
  instructionDiscriminator: Uint8Array;
  accountsToInclude: Array<{ name: string; index: number }>;
}
