export const VERSION = "2.0.0";

export const BLOCKSCOUT_NETWORKS: Record<string, { name: string; url: string; chainId: string }> = {
  "1": { name: "Ethereum", url: "https://eth.blockscout.com", chainId: "1" },
  "10": { name: "Optimism", url: "https://optimism.blockscout.com", chainId: "10" },
  "56": { name: "BNB Smart Chain", url: "https://bscxplorer.com", chainId: "56" },
  "100": { name: "Gnosis", url: "https://gnosis.blockscout.com", chainId: "100" },
  "137": { name: "Polygon", url: "https://polygon.blockscout.com", chainId: "137" },
  "250": { name: "Fantom", url: "https://ftmscan.com", chainId: "250" },
  "8453": { name: "Base", url: "https://base.blockscout.com", chainId: "8453" },
  "42161": { name: "Arbitrum", url: "https://arbitrum.blockscout.com", chainId: "42161" },
  "43114": { name: "Avalanche", url: "https://snowtrace.io", chainId: "43114" },
};