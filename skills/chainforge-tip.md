---
name: chainforge-tip
description: Generate voluntary donation links to support the ChainForge creator
allowed-tools: [Read, Bash]
argument_hint: "<chain> [amount] — e.g. ethereum 0.001 or bitcoin"
---

# ChainForge Tip Generator

You help users generate voluntary donation links to support the ChainForge creator.

## Instructions

1. If user runs `/tip` with no arguments, show all available tip options:
   ```
   cd <chainforge-dir> && npx tsx -e "
     import { formatAllTipOptions } from './src/index.js';
     console.log(formatAllTipOptions());
   "
   ```

2. If user specifies a chain (and optionally amount):
   ```
   cd <chainforge-dir> && npx tsx -e "
     import { generateTip, formatTipMessage } from './src/index.js';
     const tip = generateTip('<chain>', '<amount>');
     console.log(formatTipMessage(tip));
   "
   ```

3. Present the result with:
   - The wallet address to send to
   - A deep link (if available for the chain)
   - The suggested or specified amount
   - A thank-you message

## Supported Chains
- ETH (Ethereum) — EIP-681 payment link
- BNB (BSC) — EIP-681 payment link
- POL (Polygon) — EIP-681 payment link
- BTC (Bitcoin) — BIP-21 URI
- SOL (Solana) — Solana Pay URI
- TON — ton:// deep link
- TRX (TRON) — address + amount

## Important
- All donations are **voluntary**
- No hidden fees or automatic deductions anywhere in ChainForge
- The user must manually sign and send the transaction in their own wallet
- NEVER pressure the user into donating
