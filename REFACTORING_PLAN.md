# Refactoring Plan for web3-stats-server

## Current State
- Single 3097-line index.ts file
- Contains everything: server setup, tools, resources, prompts, helpers

## Target Structure
```
src/
├── index.ts                # Main server setup and initialization
├── types/
│   └── index.ts           # Type definitions and interfaces
├── utils/
│   ├── api.ts             # API helper functions (callDuneApi, callBlockscoutApi)
│   ├── constants.ts       # Constants like BLOCKSCOUT_NETWORKS
│   └── helpers.ts         # Helper functions (determineWalletType, etc.)
├── tools/
│   ├── dune/              # Dune API tools
│   │   ├── evm.ts         # EVM-related tools
│   │   └── svm.ts         # SVM-related tools
│   ├── blockscout/        # Blockscout API tools
│   │   ├── address.ts     # Address-related tools
│   │   ├── transaction.ts # Transaction tools
│   │   ├── block.ts       # Block tools
│   │   ├── contract.ts    # Smart contract tools
│   │   └── token.ts       # Token & NFT tools
│   ├── compound/          # Compound tools
│   │   └── index.ts       # All compound tools
│   └── index.ts           # Tool registration
├── resources/
│   ├── contracts.ts       # DEX routers, bridges
│   ├── tokens.ts          # Stablecoins, token categories
│   ├── security.ts        # Security patterns
│   └── index.ts           # Resource registration
└── prompts/
    ├── analysis.ts        # Advanced analysis prompts
    ├── legacy.ts          # Legacy prompts
    └── index.ts           # Prompt registration
```

## Refactoring Steps
1. Create type definitions
2. Extract constants and utilities
3. Split tools by category
4. Split resources into separate files
5. Split prompts into separate files
6. Update imports and exports
7. Test everything still works