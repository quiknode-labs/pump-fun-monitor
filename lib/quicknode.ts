import Client from "@triton-one/yellowstone-grpc";
import { env } from "node:process";

// Convert the RPC endpoint to a Yellowstone endpoint and token
export const getYellowstoneEndpointAndToken = (
  clusterName: "mainnet" | "devnet"
) => {
  const environmentVariable =
    clusterName === "mainnet"
      ? "QUICKNODE_SOLANA_MAINNET_ENDPOINT"
      : "QUICKNODE_SOLANA_DEVNET_ENDPOINT";
  const rpcEndpoint = env[environmentVariable];

  if (!rpcEndpoint) {
    throw new Error(
      `Environment variable ${environmentVariable} is not set. Please set it in your environment using the value from https://dashboard.quicknode.com/endpoints. `
    );
  }

  // Convert endpoint to URL object
  const url = new URL(rpcEndpoint);
  const YELLOWSTONE_PORT = 10000;

  // Yellowstone endpoint is the same as the RPC endpoint, but with the port 10000 and no pathname
  const yellowstoneEndpoint = `${url.protocol}//${url.hostname}:${YELLOWSTONE_PORT}`;

  // The token is the pathname of the RPC endpoint, but without the leading slash
  const yellowstoneToken = url.pathname.replace(/\//g, "");

  return { yellowstoneEndpoint, yellowstoneToken };
};

export const getYellowstoneClient = (clusterName: "mainnet" | "devnet") => {
  const { yellowstoneEndpoint, yellowstoneToken } =
    getYellowstoneEndpointAndToken(clusterName);

  return new Client(yellowstoneEndpoint, yellowstoneToken, {});
};
