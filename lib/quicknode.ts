// Convert the RPC endpoint to a Yellowstone endpoint and token
export const getYellowstoneEndpointAndToken = (rpcEndpoint: string) => {
  // Convert endpoint to URL object
  const url = new URL(rpcEndpoint);
  const YELLOWSTONE_PORT = 10000;

  // Yellowstone endpoint is the same as the RPC endpoint, but with the port 10000 and no pathname
  const yellowstoneEndpoint = `${url.protocol}//${url.hostname}:${YELLOWSTONE_PORT}`;

  // The token is the pathname of the RPC endpoint, but without the leading slash
  const yellowstoneToken = url.pathname.replace(/\//g, "");

  return { yellowstoneEndpoint, yellowstoneToken };
};
