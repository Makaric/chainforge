## Context Package for Gemini Review — ChainForge
**Date:** 2026-04-14 | **Branch:** main | **Status:** BUILD ✅ | Tests 76/76 ✅

### Recent commits
```
8baf87a fix: TON provider test - use raw address format, fix tip-generator tests
83ea497 fix: unify interfaces, fix SolanaProvider, add missing types, fix imports
7009979 fix(providers): apply Gemini review patches for TON, TRON, Bitcoin, Cosmos
529d4aa fix(solana): improve error handling in getTransaction
f6a97b6 fix(evm): add timestamp to getTransaction via parallel getBlock call
```

### Build Status
✅ `npm run build` — 0 ошибок

### Test Status
✅ `npm run test` — 76/76 passed (14 test files)
- Unit тесты: EVM, Solana, TON — все зелёные
- Integration тесты: live RPC для всех 6 сетей — все проходят

---

### ✅ DONE (СДЕЛАНО)

**1. interfaces.ts** — единый контракт для всех провайдеров
- `ChainFamily`, `ChainInfo`, `TransactionInfo`, `TipData`, `EvmLogFilter`, `EvmLog`
- `IEvmProvider extends IBlockchainProvider`
- `TokenBalance` имеет `contractAddress?`
- `TransactionInfo.blockNumber` допускает `null`

**2. SolanaProvider** (`src/providers/solana/provider.ts`) — ГОТОВ
- connect → Connection + getSlot() проверка
- getNativeBalance → lamports → SOL
- getTokenBalances → SPL Token + Token-2022 ✅
- getGasPrice → getRecentPrioritizationFees + base 5000 lamports
- generateTipTransaction → `solana:<addr>?amount=<N>&message=Tip`
- logger + кастомные ошибки

**3. TonProvider** (`src/providers/ton/provider.ts`) — ГОТОВ
- getNativeBalance → fromNano()
- getTokenBalances → warning + [] (нужен TONAPI)
- getGasPrice → 0.005 / 0.01 / 0.05 TON
- generateTipTransaction → `ton://transfer/<addr>?amount=<nanoTON>&text=Tip`

**4. EvmProvider** (`src/providers/evm/provider.ts`) — viem версия
- getLogs, getTransaction, getTransactionHistory
- EIP-681 deep links

**5. Все 6 провайдеров** имплементируют `IBlockchainProvider`:
- EVM, Solana, TON, Bitcoin, Tron, Cosmos

**6. TipGenerator** — TipGenerator class, делегирует провайдерам

**7. Factory** — создает провайдеров по chain name

---

### 🔨 В РАБОТЕ / НУЖНО СДЕЛАТЬ

**1. Дубликат EvmProvider**
- `src/providers/evm/EvmProvider.ts` — старый на ethers
- `src/providers/evm/provider.ts` — новый на viem
- Вопрос: убрать старый или оставить как fallback?

**2. TokenBalances**
- EVM: требует индексатор (Alchemy/Moralis) → `[]`
- TON: требует TONAPI → `[]`
- Solana: ✅ работает нативно

**3. CLI tool** (`src/cli.ts`)
- Добавлен, нужен тест `npm link` + запуск

**4. Factory coverage**
- Расширить тесты factory

**5. TypeScript warnings**
- `punycode` deprecation от `bitcoinjs-lib` — не критично

---

### 📁 Структура проекта
```
src/
├── core/
│   ├── interfaces.ts    ← единый контракт ✅
│   ├── errors.ts        ← кастомные ошибки ✅
│   └── logger.ts        ← логгер ✅
├── providers/
│   ├── evm/provider.ts      ← новый viem ✅
│   ├── evm/EvmProvider.ts   ← старый ethers (дубликат?)
│   ├── evm/chains.ts        ← конфиги сетей ✅
│   ├── solana/provider.ts   ← ✅ ГОТОВ
│   ├── ton/provider.ts      ← ✅ ГОТОВ
│   ├── bitcoin/
│   ├── tron/
│   └── cosmos/
├── tools/tip-generator.ts   ← TipGenerator class ✅
├── cli.ts                   ← CLI entry point
├── factory.ts               ← Provider factory
└── index.ts                 ← Public API
```

---

Gemini, если нужны конкретные файлы — скажи, Qwen подготовит context package!
