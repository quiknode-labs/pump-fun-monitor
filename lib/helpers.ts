import { getBase58Decoder } from "@solana/kit";

// Was named 'convertSignature'
// Used for both transaction signatures and token addresses
export const bufferToBase58 = (buffer: Uint8Array): string => {
  return getBase58Decoder().decode(buffer);
};
