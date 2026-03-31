# ⛓️ ChainForge

**A secure, read-only blockchain toolkit and skill set for Claude Code.**

ChainForge is a public open-source plugin/toolkit designed to equip Claude Code with instant blockchain interaction capabilities. Created by the Void Nomad Tandem, this tool is built for wanderers and developers who need quick, secure, and reliable blockchain data directly in their CLI workflow.

## 🛡️ The Sacred Rule (Security First)

**ZERO PRIVATE KEYS. ZERO SIGNERS.**

ChainForge operates strictly in **read-only** mode. We use public RPCs, indexed APIs, and read-only clients (`viem`, `web3.js`, etc.). There is absolutely no code here that asks for, stores, or uses your seed phrases or private keys.

Transactions (like tips or payments) are generated purely as standard deep links (EIP-681, BIP-21, Solana Pay, `ton://`) for you to securely scan and confirm in your own mobile or hardware wallet.

## 🪐 Supported Ecosystems (6 Providers)

Provider | Networks | Native | Library
--- | --- | --- | ---
EVM | Ethereum, BSC, Polygon, Arbitrum One, Optimism, Avalanche C-Chain | ETH / BNB / POL / AVAX | `viem`
Bitcoin | Mainnet, Testnet | BTC | `mempool.space` API
Solana | Mainnet, Testnet, Devnet | SOL | `@solana/web3.js`
TON | Mainnet, Testnet | TON | `@ton/ton` + TON Center
TRON | Mainnet, Nile Testnet | TRX | `tronweb`
Cosmos | Cosmos Hub, Osmosis, Celestia, Injective | ATOM / OSMO / TIA / INJ | `@cosmjs/stargate`

## 📦 Install

```bash
git clone https://github.com/Makaric/chainforge
cd chainforge
npm install
npm run build
```

Requires Node.js >= 20.

## 🛠️ Usage

### As a library

```typescript
import { EvmProvider, SolanaProvider, BitcoinProvider } from './src/index.js';

// EVM — check ETH balance
const eth = new EvmProvider('ethereum');
await eth.connect('mainnet');
const balance = await eth.getNativeBalance('0x4A88CEA080F9A2e60324799EF91400d13aEE439a');
console.log(balance); // "0.042"
await eth.disconnect();

// EVM — read ERC-20 token info
const info = await eth.getErc20Info('0xdAC17F958D2ee523a2206206994597C13D831ec7');
// { symbol: 'USDT', name: 'Tether USD', decimals: 6, totalSupply: '...' }

// EVM — gas estimate
const gas = await eth.getGasPrice();
// { slow: '8.40', standard: '10.50', fast: '12.60', unit: 'gwei' }

// EVM — read arbitrary contract
const result = await eth.readContract(contractAddress, abi, 'balanceOf', [wallet]);

// Solana — native balance + SPL tokens
const sol = new SolanaProvider();
await sol.connect('mainnet');
const solBalance = await sol.getNativeBalance('HxV7H5fkYdoXBv6PhaR538xcMqSQFD7hVbBWdb3H5CHF');
const tokens = await sol.getTokenBalances('HxV7H5fkYdoXBv6PhaR538xcMqSQFD7hVbBWdb3H5CHF');
await sol.disconnect();
```

### Via Claude Code skills

Install skills by copying the `.md` files from `skills/` into your Claude Code skills directory, or reference them directly.

**Check a balance:**

```bash
/chainforge-balance ethereum 0x4A88CEA080F9A2e60324799EF91400d13aEE439a
/chainforge-balance solana HxV7H5fkYdoXBv6PhaR538xcMqSQFD7hVbBWdb3H5CHF
/chainforge-balance bitcoin bc1q6gdlptzwhdqnrt2n96hjfws50seplkmmxurh3v
```

**Gas prices:**

```bash
/chainforge-gas ethereum
/chainforge-gas                  # checks Ethereum, BSC, Polygon, Solana, Bitcoin
```

**Transaction lookup:**

```bash
/chainforge-tx ethereum 0xabc123...   # by tx hash
/chainforge-tx solana <address>        # tx history
```

**Tip / donate:**

```bash
/chainforge-tip                  # show all options
/chainforge-tip ETH              # generate EIP-681 link
/chainforge-tip bitcoin 0.0001   # custom amount, BIP-21 URI
```

## 🤖 Skills

Skill | File | Does
--- | --- | ---
chainforge-balance | `skills/chainforge-balance.md` | Native + token balances across all chains
chainforge-gas | `skills/chainforge-gas.md` | Gas/fee estimates, current block height
chainforge-tx | `skills/chainforge-tx.md` | Transaction lookup by hash or address history
chainforge-tip | `skills/chainforge-tip.md` | Generate voluntary donation links

## 📖 API Reference

### IBlockchainProvider (all providers)

```typescript
connect(network: 'mainnet' | 'testnet' | 'devnet', rpcUrl?: string): Promise<void>
disconnect(): Promise<void>
isConnected(): boolean

getNativeBalance(address: string): Promise<string>
getTokenBalances(address: string): Promise<TokenBalance[]>
getTransaction(hash: string): Promise<TransactionInfo | null>
getTransactionHistory(address: string, limit?: number): Promise<TransactionInfo[]>
isValidAddress(address: string): boolean
getGasPrice(): Promise<GasEstimate>
getBlockHeight(): Promise<number>
generateTipTransaction(toAddress: string, amount: string): Promise<TipData>
```

### IEvmProvider (EVM only)

```typescript
readContract(address: string, abi: readonly unknown[], method: string, args?: unknown[]): Promise<unknown>
getContractCode(address: string): Promise<string>
getLogs(filter: EvmLogFilter): Promise<EvmLog[]>
getErc20Info(contractAddress: string): Promise<{ name, symbol, decimals, totalSupply }>
getErc20Balance(contractAddress: string, walletAddress: string): Promise<TokenBalance>
```

### Tip generator (standalone)

```typescript
import { generateTip, formatTipMessage, formatAllTipOptions } from './src/index.js';

const tip = generateTip('ETH');           // default amount: 0.001 ETH
const tip = generateTip('bitcoin', '0.0005');

formatTipMessage(tip);
// Chain: Bitcoin
// Amount: 0.0005 BTC
// Address: bc1q6gdlptzwhdqnrt2n96hjfws50seplkmmxurh3v
// Link: bitcoin:bc1q6gdlptzwhdqnrt2n96hjfws50seplkmmxurh3v?amount=0.0005

formatAllTipOptions();  // formatted table of all chains + addresses
```

Supported tip chains: ETH, BNB, POL, BTC, SOL, TON, TRX. Deep link formats: EIP-681, BIP-21, Solana Pay, ton://.

## 🧪 Quality Assurance

- **60+ tests** (via `vitest`) covering all providers, error handlers, and utilities. All green.
- Strict architectural adherence to the `IBlockchainProvider` unified interface.
- Code reviewed by the AI Tandem (Claude + Gemini) — all 6 providers passed security and architecture audit.

```bash
npm test
# Test Files  6 passed (6)
# Tests       60 passed (60)
```

Tests cover: provider instantiation, address validation, live RPC calls (balance, gas, block height, tx lookup), ERC-20 reads, tip generation.

## 🥞 Stack

- TypeScript 5, ESM, Node >= 20
- `viem` — EVM providers
- `@solana/web3.js` — Solana
- `bitcoinjs-lib` + mempool.space API — Bitcoin
- `@ton/ton` — TON
- `tronweb` — TRON
- `@cosmjs/stargate` — Cosmos SDK chains
- `vitest` — testing

## 📄 License

MIT

## ⚡ Energy Exchange (Support the Creator)

Every project from the Void is a gift. If ChainForge saved your time or helped you build something great in the wasteland, consider a voluntary energy exchange:

- **ETH:** `0x4A88CEA080F9A2e60324799EF91400d13aEE439a`
- **BTC:** `bc1q6gdlptzwhdqnrt2n96hjfws50seplkmmxurh3v`
- **SOL:** `HxV7H5fkYdoXBv6PhaR538xcMqSQFD7hVbBWdb3H5CHF`
- **TRX:** `TMQyjfBgeMhFZQ6DnJxz12xQHY4tcGZgJe`

---

Crafted in the Void by [Maxim G. (VoidNomad)](https://github.com/Makaric) & the AI Tandem.
