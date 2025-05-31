import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerComprehensiveWalletAnalysisPrompt } from './comprehensiveWalletAnalysis.js';
import { registerSmartContractDeepDivePrompt } from './smartContractDeepDive.js';
import { registerTokenRiskAssessmentPrompt } from './tokenRiskAssessment.js';
import { registerTransactionPostMortemPrompt } from './transactionPostMortem.js';
import { registerCompareNetworksPrompt } from './compareNetworks.js';
import { registerDefiProtocolInvestigationPrompt } from './defiProtocolInvestigation.js';
import { registerTokenLaunchInvestigationPrompt } from './tokenLaunchInvestigation.js';
import { registerWhaleMovementAnalysisPrompt } from './whaleMovementAnalysis.js';
import { registerNftCollectionForensicsPrompt } from './nftCollectionForensics.js';
import { registerBridgeTransactionVerificationPrompt } from './bridgeTransactionVerification.js';
import { registerMevActivityDetectionPrompt } from './mevActivityDetection.js';
import { registerGasOptimizationAuditPrompt } from './gasOptimizationAudit.js';
import { registerDaoTreasuryAuditPrompt } from './daoTreasuryAudit.js';
import { registerSecurityVulnerabilityScanPrompt } from './securityVulnerabilityScan.js';
import { registerYieldStrategyComparisonPrompt } from './yieldStrategyComparison.js';
import { registerEvmWalletOverviewPrompt } from './evmWalletOverview.js';
import { registerAnalyzeErc20TokenPrompt } from './analyzeErc20Token.js';
import { registerSvmAddressCheckPrompt } from './svmAddressCheck.js';

export function registerAllPrompts(server: McpServer) {
  registerComprehensiveWalletAnalysisPrompt(server);
  registerSmartContractDeepDivePrompt(server);
  registerTokenRiskAssessmentPrompt(server);
  registerTransactionPostMortemPrompt(server);
  registerCompareNetworksPrompt(server);
  registerDefiProtocolInvestigationPrompt(server);
  registerTokenLaunchInvestigationPrompt(server);
  registerWhaleMovementAnalysisPrompt(server);
  registerNftCollectionForensicsPrompt(server);
  registerBridgeTransactionVerificationPrompt(server);
  registerMevActivityDetectionPrompt(server);
  registerGasOptimizationAuditPrompt(server);
  registerDaoTreasuryAuditPrompt(server);
  registerSecurityVulnerabilityScanPrompt(server);
  registerYieldStrategyComparisonPrompt(server);
  registerEvmWalletOverviewPrompt(server);
  registerAnalyzeErc20TokenPrompt(server);
  registerSvmAddressCheckPrompt(server);
}