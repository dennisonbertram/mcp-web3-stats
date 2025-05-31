// Helper function to determine wallet type
export function determineWalletType(txPatterns: any, portfolio: any): string {
  if (portfolio.nftCount > portfolio.tokenCount * 0.5) return "NFT Collector";
  if (portfolio.defiTokens > 2) return "DeFi User";
  if (txPatterns.contractInteractions > txPatterns.totalTransactions * 0.7) return "Smart Contract Power User";
  if (portfolio.stablecoins > portfolio.tokenCount * 0.5) return "Stablecoin Holder";
  if (txPatterns.totalTransactions < 10) return "New/Inactive Wallet";
  return "General User";
}

// Helper function to determine primary wallet use
export function determinePrimaryUse(txPatterns: any, portfolio: any): string {
  const uses = [];
  if (portfolio.nftCount > 0) uses.push("NFT Trading");
  if (portfolio.defiTokens > 0) uses.push("DeFi");
  if (portfolio.stablecoins > 0) uses.push("Stablecoin Transactions");
  if (txPatterns.contractInteractions > 10) uses.push("dApp Interactions");
  if (uses.length === 0) uses.push("Basic Transfers");
  return uses.join(", ");
}