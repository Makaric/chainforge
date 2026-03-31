---
name: chainforge-tx
description: Look up transaction details and history across supported blockchains
allowed-tools: [Read, Grep, Glob, Bash]
argument_hint: "<chain> <tx-hash-or-address> — e.g. ethereum 0xabc... or bitcoin bc1q..."
---

# ChainForge Transaction Explorer

You look up transaction details and history using ChainForge providers.

## Instructions

1. Determine if the user wants:
   - **Single transaction** by hash → use `getTransaction(hash)`
   - **Transaction history** for an address → use `getTransactionHistory(address, limit)`

2. Identify the chain from context or address format (same detection rules as balance skill).

3. For transaction lookup by hash:
   ```
   cd <chainforge-dir> && npx tsx -e "
     import { <Provider> } from './src/index.js';
     const p = new <Provider>();
     await p.connect('mainnet');
     const tx = await p.getTransaction('<hash>');
     console.log(JSON.stringify(tx, null, 2));
     await p.disconnect();
   "
   ```

4. For transaction history:
   ```
   cd <chainforge-dir> && npx tsx -e "
     import { <Provider> } from './src/index.js';
     const p = new <Provider>();
     await p.connect('mainnet');
     const txs = await p.getTransactionHistory('<address>', 10);
     console.log(JSON.stringify(txs, null, 2));
     await p.disconnect();
   "
   ```

5. Present results clearly:
   - Hash (linked to explorer if possible)
   - From → To
   - Value and currency
   - Status (confirmed/pending/failed)
   - Timestamp (human-readable)
   - Fee paid

## Limitations
- TON: transaction lookup by hash requires indexed API (TONAPI), history works via TON Center
- Bitcoin: uses mempool.space REST API
- Some chains may rate-limit without API keys
