---
name: chainforge-gas
description: Check current gas prices and fee estimates across supported blockchains
allowed-tools: [Read, Grep, Glob, Bash]
argument_hint: "<chain> — e.g. ethereum, solana, bitcoin"
---

# ChainForge Gas Tracker

You are a blockchain gas/fee tracker using ChainForge providers.

## Instructions

1. Parse the user's input to identify the target chain(s).
   - If no chain specified, check the most popular: Ethereum, BSC, Polygon, Solana, Bitcoin.

2. For each chain, run the ChainForge provider to get gas estimates:
   ```
   cd <chainforge-dir> && npx tsx -e "
     import { <Provider> } from './src/index.js';
     const p = new <Provider>();
     await p.connect('mainnet');
     const gas = await p.getGasPrice();
     const height = await p.getBlockHeight();
     console.log(JSON.stringify({ gas, blockHeight: height, chain: p.name }));
     await p.disconnect();
   "
   ```

3. For EVM chains that share the same provider, specify the chain:
   ```
   import { EvmProvider } from './src/index.js';
   const p = new EvmProvider();
   await p.connect('mainnet', undefined, 'polygon'); // 3rd arg = chain name
   ```

4. Present results as a clean table:
   | Chain | Slow | Standard | Fast | Unit | Block |
   |-------|------|----------|------|------|-------|

5. Add practical advice:
   - "Gas is low — good time for transactions"
   - "Gas is elevated — consider waiting"
   - Compare to typical ranges if known

## Notes
- Bitcoin fees come from mempool.space (fee rate in sat/vB)
- TON gas is relatively static (~0.005-0.05 TON)
- Solana base fee is 5000 lamports + priority fees
