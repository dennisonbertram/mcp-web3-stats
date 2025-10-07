const fs = require('fs');
const path = require('path');

// Read the main index.ts file
const content = fs.readFileSync('./index.ts', 'utf8');

// Regular expressions to match different components
const toolRegex = /server\.tool\(\s*"([^"]+)"/g;
const resourceRegex = /server\.resource\(\s*"([^"]+)"/g;
const promptRegex = /server\.prompt\(\s*"([^"]+)"/g;

// Extract tool names
const tools = [];
let match;
while ((match = toolRegex.exec(content)) !== null) {
  tools.push(match[1]);
}

// Extract resource names
const resources = [];
while ((match = resourceRegex.exec(content)) !== null) {
  resources.push(match[1]);
}

// Extract prompt names
const prompts = [];
while ((match = promptRegex.exec(content)) !== null) {
  prompts.push(match[1]);
}

console.log(`Found ${tools.length} tools:`);
tools.forEach(tool => console.log(`  - ${tool}`));

console.log(`\nFound ${resources.length} resources:`);
resources.forEach(resource => console.log(`  - ${resource}`));

console.log(`\nFound ${prompts.length} prompts:`);
prompts.forEach(prompt => console.log(`  - ${prompt}`));

// Function to extract a server.tool() block
function extractServerBlock(content, type, name) {
  const regex = new RegExp(`server\\.${type}\\(\\s*"${name}"[\\s\\S]*?^\\);`, 'gm');
  const matches = content.match(regex);
  
  if (matches && matches.length > 0) {
    // Find the most complete match (sometimes there are nested parentheses)
    let bestMatch = matches[0];
    let openCount = 0;
    let closeCount = 0;
    
    for (let i = 0; i < content.length; i++) {
      if (content.substr(i, `server.${type}(`.length) === `server.${type}(` && 
          content.indexOf(`"${name}"`, i) === i + `server.${type}(`.length + 1) {
        // Found the start
        let j = i;
        openCount = 0;
        closeCount = 0;
        while (j < content.length) {
          if (content[j] === '(') openCount++;
          if (content[j] === ')') closeCount++;
          if (openCount > 0 && openCount === closeCount && content.substr(j, 2) === ');') {
            bestMatch = content.substring(i, j + 2);
            break;
          }
          j++;
        }
        break;
      }
    }
    
    return bestMatch;
  }
  return null;
}

// Create extraction info
const extractionInfo = {
  tools: {
    dune: [
      'ping_dune_server',
      'get_evm_balances',
      'get_evm_activity', 
      'get_evm_collectibles',
      'get_evm_transactions',
      'get_evm_token_info',
      'get_evm_token_holders',
      'get_svm_balances',
      'get_svm_transactions'
    ],
    blockscout: [
      'ping_blockscout',
      'blockscout_search',
      'blockscout_address_info',
      'blockscout_address_transactions',
      'blockscout_address_internal_txs',
      'blockscout_address_logs',
      'blockscout_address_token_balances',
      'blockscout_transaction_details',
      'blockscout_transaction_logs',
      'blockscout_transaction_internal_txs',
      'blockscout_transaction_raw_trace',
      'blockscout_transaction_state_changes',
      'blockscout_block_details',
      'blockscout_block_transactions',
      'blockscout_latest_blocks',
      'blockscout_contract_info',
      'blockscout_contract_methods',
      'blockscout_read_contract',
      'blockscout_verified_contracts',
      'blockscout_token_info',
      'blockscout_token_transfers',
      'blockscout_token_holders',
      'blockscout_nft_instances',
      'blockscout_nft_metadata'
    ],
    compound: [
      'investigate_smart_contract',
      'analyze_transaction_impact',
      'token_deep_analysis',
      'profile_wallet_behavior'
    ]
  },
  resources: resources,
  prompts: prompts
};

// Save extraction info
fs.writeFileSync('./extraction-info.json', JSON.stringify(extractionInfo, null, 2));
console.log('\nExtraction info saved to extraction-info.json');

// Example: Extract one tool to show the pattern
const exampleTool = 'get_evm_balances';
const toolBlock = extractServerBlock(content, 'tool', exampleTool);
if (toolBlock) {
  console.log(`\nExample extraction for ${exampleTool}:`);
  console.log(toolBlock.substring(0, 200) + '...');
}