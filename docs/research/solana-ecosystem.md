# Solana — Research Report

**Дата:** 2026-03-29
**Автор:** Claude (Executor, ChainForge)
**Фокус:** READ-ONLY операции

---

## 1. @solana/web3.js → @solana/kit

### Эволюция

| Событие | Дата |
|---------|------|
| web3.js v2.0.0 stable | Декабрь 2024 |
| Переименование в **@solana/kit** | Начало 2025 |
| v1.x — maintenance mode | 2025 |
| **@solana/kit текущая версия** | **3.0.3** |

Репо: [github.com/anza-xyz/kit](https://github.com/anza-xyz/kit) (Anza, бывш. Solana Labs)

### Модульная архитектура

| Пакет | Назначение |
|-------|-----------|
| `@solana/kit` | Зонтичный — ре-экспортирует всё |
| `@solana/rpc` | RPC клиент (JSON-RPC вызовы) |
| `@solana/rpc-api` | Типы RPC методов |
| `@solana/accounts` | Чтение и декодирование аккаунтов |
| `@solana/codecs` | Сериализация / десериализация |
| `@solana/addresses` | Утилиты адресов |
| `@solana/keys` | Криптографические операции |

### API: v1 → Kit

```
v1: Connection               → Kit: createSolanaRpc(url)
v1: PublicKey                 → Kit: address("...")  (строковый тип)
v1: Keypair.generate()        → Kit: generateKeyPairSigner()
v1: number для lamports       → Kit: BigInt (1_000_000n)
v1: class-based, OOP          → Kit: functional, tree-shakeable
```

### Производительность
- Крипто-операции: **до 10x быстрее** (native Web Crypto API)
- Bundle size: **-26%** (Solana Explorer: 311KB → 226KB)

### Миграция с v1
1. **Полный рерайт** на `@solana/kit` — для новых проектов
2. **@solana/web3-compat** — drop-in совместимость, постепенная миграция
3. **@solana/compat** — мост между v1-объектами и Kit-типами

**Решение для ChainForge:** `@solana/kit` (v3.x) для нового кода.

---

## 2. Solana JSON-RPC API — Read-Only методы

### getBalance
Возвращает баланс в lamports (1 SOL = 1,000,000,000 lamports).

### getTransaction
Детали транзакции по signature. Ответ: `slot`, `transaction`, `meta` (с `preBalances`, `postBalances`, `preTokenBalances`, `postTokenBalances`, `err`), `blockTime`.

### getTokenAccountsByOwner
Все SPL token аккаунты кошелька.
- SPL Token: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
- Token-2022: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

### getSignaturesForAddress
История транзакций адреса. Limit 1-1000, пагинация через `before`/`until`.

### Прочие ключевые методы

| Метод | Назначение |
|-------|-----------|
| `getAccountInfo` | Сырые данные аккаунта |
| `getProgramAccounts` | Все аккаунты программы |
| `getTokenAccountBalance` | Баланс конкретного token account |
| `getTokenSupply` | Total supply SPL токена |
| `getMultipleAccounts` | Батч-чтение аккаунтов |
| `getLatestBlockhash` | Последний blockhash |
| `getSlot` / `getBlockHeight` | Позиция в чейне |

---

## 3. Публичные RPC эндпоинты

### Официальные (НЕ для продакшена)

| Сеть | URL | Лимит |
|------|-----|-------|
| Mainnet | `api.mainnet-beta.solana.com` | 100 req/10s per IP |
| Devnet | `api.devnet.solana.com` | 100 req/10s per IP |
| Testnet | `api.testnet.solana.com` | 100 req/10s per IP |

### Провайдеры

| Провайдер | Free Tier | Free RPS | DAS API | Фокус |
|-----------|-----------|----------|---------|-------|
| **Helius** | 1M credits/мес | 10 | Да (2 req/s) | Solana-only |
| **QuickNode** | 10M credits/мес | 15 | Через add-on | Multi-chain |
| **Alchemy** | 30M CU/мес | — | Да | Multi-chain |
| **Chainstack** | 3M req/мес | — | — | Multi-chain |

### Helius (рекомендуется для Solana)

| План | Цена | Credits/мес | RPS |
|------|------|-------------|-----|
| Free | $0 | 1M | 10 |
| Developer | $49 | 10M | 50 |
| Business | $499 | 100M | 200 |

---

## 4. Стандарты токенов

### SPL Token Program (оригинальный)
- Program ID: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
- Базовый стандарт, наиболее широко поддерживаемый

### Token-2022 (Token Extensions)
- Program ID: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- Drop-in замена с расширениями:

| Extension | Описание |
|-----------|---------|
| Transfer Fees | Автоматическая комиссия на трансфер |
| Transfer Hook | Кастомные проверки |
| Confidential Transfers | ZK-proof скрытые балансы |
| Built-in Metadata | Без Metaplex |
| Non-transferable | Soulbound токены |

### Metaplex NFT стандарты

| Стандарт | Стоимость минта | Особенности |
|----------|----------------|-------------|
| Token Metadata (Legacy) | ~0.022 SOL | Отдельные PDA для метаданных |
| **Metaplex Core** (рек.) | ~0.0029 SOL | Single-account, enforced royalties, плагины |
| Compressed NFTs (cNFTs) | Копейки за миллионы | Merkle tree, требует DAS API |

---

## 5. DeFi протоколы (Read-Only)

### Jupiter (DEX Aggregator)
- $700M+ дневной объём
- **Quote:** `GET https://quote-api.jup.ag/v6/swap/v1/quote?inputMint=...&outputMint=...&amount=...`
- Self-hostable binary

### Raydium (AMM)
- TVL $2.3B
- SDK: `@raydium-io/raydium-sdk-v2`
- Read-only: `fetchPoolByMints()`, `fetchPoolById()`, `getTokenInfo()`

### Orca (Concentrated Liquidity)
- SDK: `@orca-so/whirlpools` (использует @solana/kit)
- Read-only: pool data, positions, swap quotes

### Marinade (Liquid Staking)
- mSOL liquid staking token
- SDK: `marinade-ts-sdk`
- Read-only: mSOL/SOL rate, stake pool state

---

## 6. API и Data сервисы

### DAS API (Digital Asset Standard)
- Единый интерфейс для ВСЕХ digital assets на Solana
- Методы: `getAsset`, `getAssetBatch` (до 1K), `getAssetsByOwner`, `searchAssets`, `getAssetProof`
- **Критически важен для cNFTs** — единственный способ читать compressed NFTs
- Провайдеры: Helius, QuickNode, Alchemy

### Birdeye Data Services
- Реалтайм аналитика, цены, OHLCV
- **Нет бесплатного тира.** Starter: $99/мес

### SolanaFM
- Explorer с бесплатным REST + WebSocket API
- **Free:** 10 RPS, 1 GB bandwidth
- Decoded транзакции, метаданные, SNS domains

---

## 7. Рекомендации для ChainForge

### Стек
```
Core SDK:       @solana/kit (v3.x)
Compat:         @solana/compat (если нужна legacy совместимость)
RPC:            Helius free tier (user-configurable)
Token reads:    RPC getTokenAccountsByOwner (оба program ID)
NFT reads:      DAS API через Helius
DeFi quotes:    Jupiter API /swap/v1/quote
Pool data:      Raydium SDK v2 / Orca Whirlpools
Explorer:       SolanaFM API (free)
```

### Зависимости
```json
{
  "@solana/kit": "^3.0.0"
}
```

### Принципы
- Все операции READ-ONLY по умолчанию
- RPC endpoint — user-configurable
- Проверять оба Token Program ID (SPL + Token-2022)
- BigInt для всех сумм

### Источники
- [@solana/kit GitHub](https://github.com/anza-xyz/kit)
- [Solana JSON-RPC Docs](https://solana.com/docs/rpc)
- [Helius](https://www.helius.dev/)
- [Jupiter Docs](https://dev.jup.ag/)
- [Metaplex Docs](https://developers.metaplex.com/)
- [DAS API Spec](https://github.com/metaplex-foundation/digital-asset-standard-api)
