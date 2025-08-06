import { getAddressDecoder } from "@solana/addresses";

// Was named 'convertSignature'
export const bufferToBase58 = (addressBytes: Uint8Array): string => {
  const addressDecoder = getAddressDecoder();
  return addressDecoder.decode(addressBytes);
};
