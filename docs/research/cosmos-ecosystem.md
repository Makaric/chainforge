# Cosmos — Research Report

**Дата:** 2026-03-29
**Автор:** Claude (Executor, ChainForge)
**Фокус:** READ-ONLY операции

---

## 1. CosmJS SDK

### Текущая версия: v0.38.0 (декабрь 2025)

- **GitHub:** `cosmos/cosmjs`
- **Язык:** TypeScript
- **Node.js:** 20+
- **Target:** ES2020
- **Крипто:** WebAssembly

### Пакеты (monorepo @cosmjs)

| Пакет | Назначение |
|-------|-----------|
| `@cosmjs/stargate` | Основной клиент для Cosmos SDK 0.40+ |
| `@cosmjs/cosmwasm` | Поддержка CosmWasm-чейнов (ранее @cosmjs/cosmwasm-stargate) |
| `@cosmjs/crypto` | Криптография (хеширование, подпись, HD key derivation) |
| `@cosmjs/encoding` | Утилиты кодирования |
| `@cosmjs/math` | Safe integers и decimal |
| `@cosmjs/faucet` | Node.js faucet приложение |

### StargateClient — READ-ONLY запросы

```typescript
import { StargateClient } from '@cosmjs/stargate';

const client = await StargateClient.connect('https://rpc.cosmos.network');

// Баланс конкретного деном
const balance = await client.getBalance('cosmos1...', 'uatom');
// { denom: 'uatom', amount: '1000000' }

// Все балансы
const allBalances = await client.getAllBalances('cosmos1...');

// Высота блокчейна
const height = await client.getHeight();

// Блок
const block = await client.getBlock(12345);

// Транзакция по ID
const tx = await client.getTx('TXHASH...');

// Поиск транзакций
const txs = await client.searchTx({ sentFromOrTo: 'cosmos1...' });

// Chain ID
const chainId = await client.getChainId();

// Делегация
const delegation = await client.getDelegation('cosmos1delegator...', 'cosmosvaloper1...');
```

### Query Extensions

Для расширенных запросов (стейкинг, IBC, distribution):

```typescript
import { QueryClient, setupStakingExtension, setupIbcExtension } from '@cosmjs/stargate';
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';

const tmClient = await Tendermint37Client.connect('https://rpc.cosmos.network');
const queryClient = QueryClient.withExtensions(
  tmClient,
  setupStakingExtension,
  setupIbcExtension
);

// Стейкинг запросы
const validators = await queryClient.staking.validators('BOND_STATUS_BONDED');
const delegations = await queryClient.staking.delegatorDelegations('cosmos1...');

// IBC запросы
const channels = await queryClient.ibc.channel.allChannels();
const connections = await queryClient.ibc.connection.allConnections();
```

---

## 2. IBC (Inter-Blockchain Communication)

### Обзор
- Протокол межчейн-коммуникации — ключевая фича Cosmos
- Объём переводов: до $3 млрд/мес через 115+ чейнов
- **IBC v2** — запущен в конце марта 2025, поддержка в ibc-go v10

### Ключевые концепции
- **Channels** — двусторонние каналы между чейнами
- **Connections** — TCP-подобные соединения
- **Clients** — лайт-клиенты для верификации
- **Packets** — единицы данных передаваемые через IBC
- **IBC Denoms** — формат `ibc/HASH` для токенов из других чейнов

### Запрос IBC трансферов
```typescript
// Через REST API
// GET /ibc/apps/transfer/v1/denom_traces
// GET /ibc/core/channel/v1/channels
```

---

## 3. Ключевые Cosmos чейны

| Чейн | Токен | Назначение |
|-------|-------|-----------|
| **Cosmos Hub** | ATOM | Хаб экосистемы, IBC маршрутизация |
| **Osmosis** | OSMO | Крупнейший DEX Cosmos |
| **Celestia** | TIA | Modular data availability layer |
| **Injective** | INJ | DeFi, деривативы |
| **Sei** | SEI | Высокоскоростной trading chain |
| **Stride** | STRD | Liquid staking |
| **Akash** | AKT | Децентрализованный cloud compute |
| **Secret Network** | SCRT | Privacy-preserving smart contracts |
| **Stargaze** | STARS | NFT marketplace |
| **Neutron** | NTRN | CosmWasm smart contracts |

---

## 4. Публичные RPC эндпоинты

### Cosmos Hub
| Провайдер | RPC URL | REST URL |
|-----------|---------|----------|
| Official | rpc.cosmos.network | rest.cosmos.network |
| PublicNode | cosmos-rpc.publicnode.com | cosmos-rest.publicnode.com |
| Polkachu | cosmos-rpc.polkachu.com | cosmos-api.polkachu.com |

### Где искать эндпоинты
- **Cosmos Chain Registry** — github.com/cosmos/chain-registry (канонический источник)
- **CompareNodes.com** — 13+ публичных Cosmos Hub RPC с метриками
- Каждый чейн имеет свою страницу в chain-registry с RPC/REST/gRPC эндпоинтами

---

## 5. Cosmos SDK — ключевые концепции

### Модули
- **bank** — переводы токенов, балансы
- **staking** — делегирование, валидаторы
- **distribution** — награды за стейкинг
- **gov** — governance, голосование
- **ibc** — межчейн коммуникация
- **authz** — авторизация
- **wasm** — CosmWasm smart contracts (не все чейны)

### Консенсус
- **CometBFT** (бывший Tendermint) — BFT консенсус
- Финализация: ~6 секунд
- Валидаторы: от 50 до 180+ (зависит от чейна)

---

## 6. Безопасность

### CosmWasm уязвимости
- Integer overflow в Rust-контрактах
- Неправильная авторизация (отсутствие проверки sender)
- Storage DoS (раздувание хранилища)
- Reentrancy через sub-messages

### Правила для ChainForge
1. StargateClient (не SigningStargateClient) для read-only
2. Валидация bech32 адресов (cosmos1..., osmo1..., inj1...)
3. Проверка chain-id перед запросами

---

## 7. Рекомендации для ChainForge

### Стек
```
SDK:            @cosmjs/stargate v0.38.x
Extensions:     @cosmjs/cosmwasm (для CosmWasm чейнов)
Chain Registry: github.com/cosmos/chain-registry
```

### Зависимости
```json
{
  "@cosmjs/stargate": "^0.38.0",
  "@cosmjs/cosmwasm": "^0.38.0",
  "@cosmjs/encoding": "^0.38.0"
}
```

### Особенности имплементации
- Один провайдер может обслуживать множество Cosmos чейнов (общий API)
- Нужен маппинг chain → RPC endpoint (из chain-registry)
- IBC denom трейсинг для определения оригинального токена

### Источники
- [CosmJS GitHub](https://github.com/cosmos/cosmjs)
- [StargateClient API](https://cosmos.github.io/cosmjs/latest/stargate/classes/StargateClient.html)
- [IBC Protocol](https://ibcprotocol.dev/)
- [Cosmos Developer Portal](https://tutorials.cosmos.network/)
- [Cosmos Chain Registry](https://github.com/cosmos/chain-registry)
