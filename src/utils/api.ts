import { BLOCKSCOUT_NETWORKS } from './constants.js';

// Helper function to call Dune API
export async function callDuneApi(path: string, queryParams?: URLSearchParams) {
  const DUNE_API_KEY = process.env.DUNE_API_KEY;
  
  if (!DUNE_API_KEY) {
    throw new Error("DUNE_API_KEY is not set in environment variables");
  }

  const baseUrl = path.startsWith("/beta") ? "https://api.sim.dune.com/beta" : "https://api.sim.dune.com/v1";
  const fullPath = path.startsWith("/beta") ? path.substring("/beta".length) : path.substring("/v1".length);
  
  let url = `${baseUrl}${fullPath}`;

  if (queryParams && queryParams.toString()) {
    url += `?${queryParams.toString()}`;
  }

  console.error(`Calling Dune API: ${url}`); // Log the actual call
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      "X-Sim-Api-Key": DUNE_API_KEY!,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Dune API request failed with status ${response.status}: ${errorBody}`);
    throw new Error(`Dune API Error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
  }
  return response.json();
}

// Helper function to call Blockscout API
export async function callBlockscoutApi(chainId: string, path: string, queryParams?: URLSearchParams) {
  const network = BLOCKSCOUT_NETWORKS[chainId];
  if (!network) {
    throw new Error(`Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(BLOCKSCOUT_NETWORKS).join(", ")}`);
  }

  let url = `${network.url}/api/v2${path}`;
  
  if (queryParams && queryParams.toString()) {
    url += `?${queryParams.toString()}`;
  }

  console.error(`Calling Blockscout API (${network.name}): ${url}`); // Log the actual call
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Blockscout API request failed with status ${response.status}: ${errorBody}`);
    throw new Error(`Blockscout API Error (${network.name}): ${response.status} ${response.statusText}. Details: ${errorBody}`);
  }
  return response.json();
}