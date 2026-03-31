# EVM Blockchain Development Tools — Research Report

**Дата:** 2026-03-29
**Автор:** Claude (Executor, ChainForge)
**Фокус:** READ-ONLY операции

---

## 1. ethers.js

**Версия:** 6.16.0 (npm, ~ноябрь 2025)
**Downloads:** ~2,056,000/неделю
**Bundle:** ~130 kB

### Ключевые фичи v6
- **Native BigInt** — вместо старого `BigNumber`
- **ES6 Proxy Contracts** — динамический резолв методов
- **Модульные провайдеры** — `JsonRpcProvider`, `InfuraProvider`, `AlchemyProvider`, `AnkrProvider`, `EtherscanProvider`

### Read-Only API

```typescript
import { JsonRpcProvider, formatEther, Contract } from "ethers";

const provider = new JsonRpcProvider("https://rpc.ankr.com/eth");

// Баланс
const balance = await provider.getBalance("0x...");
console.log(`Balance: ${formatEther(balance)} ETH`);

// Блок
const block = await provider.getBlock("latest");

// Логи (фильтрация событий)
const logs = await provider.getLogs({
  address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
  fromBlock: block!.number - 100,
  toBlock: "latest",
});

// Чтение контракта
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

const usdt = new Contract("0xdAC17F958D2ee523a2206206994597C13D831ec7", ERC20_ABI, provider);
const name = await usdt.name();        // "Tether USD"
const decimals = await usdt.decimals(); // 6n
```

### Ключевые методы провайдера (Read-Only)

| Метод | Описание |
|-------|---------|
| `getBalance(address)` | Баланс в wei |
| `getBlock(tag)` | Данные блока |
| `getBlockNumber()` | Текущая высота |
| `getTransactionCount(address)` | Nonce |
| `getCode(address)` | Байткод контракта |
| `getLogs(filter)` | Логи событий |
| `call(tx)` | Симуляция вызова |
| `getNetwork()` | Chain ID и имя |
| `getFeeData()` | Gas price, maxFeePerGas |

---

## 2. viem

**Версия:** 2.47.6 (npm, март 2026, активно обновляется)
**Downloads:** ~1,914,000/неделю
**Bundle:** ~35 kB (tree-shakeable)

### Почему viem вместо ethers?

| Аспект | viem | ethers.js |
|--------|------|-----------|
| Типобезопасность | Полная ABI-level inference | Слабая типизация |
| Bundle size | 35 kB, tree-shakeable | ~130 kB, монолитный |
| API стиль | Функциональный, composable | OOP (классы) |
| Зрелость | С 2023, быстрое внедрение | С 2016, проверенный |

**Вердикт:** viem предпочтителен для новых TS-проектов. ethers.js остаётся для совместимости.

### Read-Only API

```typescript
import { createPublicClient, http, formatEther, parseAbi } from "viem";
import { mainnet, polygon, arbitrum } from "viem/chains";

const client = createPublicClient({
  chain: mainnet,
  transport: http("https://rpc.ankr.com/eth"),
});

// Баланс
const balance = await client.getBalance({
  address: "0x388C818CA8B9251b393131C08a736A67ccB19297",
});

// Блок
const block = await client.getBlock();

// Чтение контракта (типобезопасно!)
const abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
]);

const name = await client.readContract({
  address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  abi,
  functionName: "name",
});
// TypeScript ЗНАЕТ что это string

// Мультичейн — просто другой клиент
const polygonClient = createPublicClient({
  chain: polygon,
  transport: http("https://rpc.ankr.com/polygon"),
});
```

---

## 3. Публичные RPC эндпоинты (Free)

| Чейн | Chain ID | RPC (без ключа) |
|-------|----------|-----------------|
| Ethereum | 1 | `https://rpc.ankr.com/eth` |
| BSC | 56 | `https://rpc.ankr.com/bsc` |
| Polygon | 137 | `https://rpc.ankr.com/polygon` |
| Arbitrum | 42161 | `https://rpc.ankr.com/arbitrum` |
| Optimism | 10 | `https://rpc.ankr.com/optimism` |
| Avalanche | 43114 | `https://rpc.ankr.com/avalanche` |

### Бесплатные RPC агрегаторы

| Сервис | Без ключа | Сетей | Примечание |
|--------|-----------|-------|-----------|
| Ankr | Да | 80+ | Лучший free tier (30M/мес), единый URL паттерн |
| PublicNode | Да | 30+ | Community-run |
| Pocket Network | Да | 60+ | Децентрализованный |
| dRPC | Да | 200+ | Load-balanced |

### Ограничения
- Публичные RPC без SLA — могут упасть
- Archive data (исторические состояния) часто недоступны на бесплатных
- `debug_*` / `trace_*` namespace — редко бесплатно

---

## 4. API провайдеры

| Провайдер | Free Tier | Модель | WebSocket | Archive |
|-----------|-----------|--------|-----------|---------|
| Alchemy | ~300M CU/мес (~40 req/min) | Compute Units | Да | Да |
| Infura | 100,000 req/день | Количество запросов | Да (limited) | Нет |
| QuickNode | 100,000 req/день | Количество запросов | Да | Нет |
| Ankr | ~30M req/мес | Flat, generous | Premium only | Да (limited) |

### Рекомендация
- **Ankr** — бесплатный дефолт, без регистрации, 80+ чейнов
- **Alchemy** — если нужен дашборд и enhanced API

---

## 5. Безопасность смарт-контрактов

### OWASP Smart Contract Top 10 (2026)

1. **Access Control Failures** — по-прежнему #1
2. **Business Logic Vulnerabilities** — поднялся на #2
3. **Flash Loan Attacks**
4. **Oracle Manipulation**
5. **Unchecked External Calls**
6. **Integer Overflow/Underflow** — митигирован Solidity 0.8+
7. **Denial of Service**
8. **Reentrancy** — упал с #2 на #8 (nonReentrant повсеместен)
9. **Insufficient Gas Griefing**
10. **Proxy & Upgradeability Bugs** — НОВОЕ

### Инструменты аудита

| Инструмент | Тип | Что делает |
|-----------|-----|-----------|
| Slither | Статический анализ | 90+ детекторов, By Trail of Bits |
| Mythril | Symbolic execution | SMT solving на EVM байткоде |
| Echidna | Fuzzer | Property-based fuzz testing |
| Foundry | Testing framework | forge test с фаззингом |
| Aderyn | Статический анализ | Быстрая альтернатива Slither |

```bash
# Slither
pip install slither-analyzer
slither .

# Mythril
pip install mythril
myth analyze MyContract.sol
```

### Best Practices для Read-Only
1. Проверять `getCode != "0x"` перед запросом к контракту
2. Multicall для батчинга read-операций
3. Фиксировать block number при связанных запросах
4. Обрабатывать revert — даже view функции могут revert'ить

---

## 6. ERC стандарты

### ERC-20 (Fungible Tokens)
```solidity
function name() view returns (string)
function symbol() view returns (string)
function decimals() view returns (uint8)
function totalSupply() view returns (uint256)
function balanceOf(address) view returns (uint256)
function allowance(address owner, address spender) view returns (uint256)
```

### ERC-721 (NFTs)
```solidity
function balanceOf(address owner) view returns (uint256)
function ownerOf(uint256 tokenId) view returns (address)
function tokenURI(uint256 tokenId) view returns (string)
```

### ERC-1155 (Multi-Token)
```solidity
function balanceOf(address account, uint256 id) view returns (uint256)
function balanceOfBatch(address[], uint256[]) view returns (uint256[])
function uri(uint256 id) view returns (string)
```

### ERC-4626 (Tokenized Vault)
```solidity
function asset() view returns (address)
function totalAssets() view returns (uint256)
function convertToShares(uint256 assets) view returns (uint256)
function convertToAssets(uint256 shares) view returns (uint256)
function previewDeposit(uint256 assets) view returns (uint256)
function previewRedeem(uint256 shares) view returns (uint256)
```

---

## 7. Рекомендации для ChainForge

### Стек
```
Primary:     viem (типобезопасность, малый bundle, современный API)
Fallback:    ethers.js v6 (совместимость с экосистемой)
Free RPC:    Ankr (rpc.ankr.com/{chain}, 30M/мес, 80+ чейнов)
Paid RPC:    Alchemy (лучший дашборд, enhanced APIs)
Security:    Slither + Mythril (статический + символьный анализ)
```

### Зависимости
```json
{
  "viem": "^2.47.0",
  "ethers": "^6.16.0"
}
```

### Источники
- [ethers.js v6 Docs](https://docs.ethers.org/v6/)
- [viem.sh Docs](https://viem.sh/)
- [Ankr RPC](https://www.ankr.com/rpc/)
- [ChainList.org](https://chainlist.org/)
- [OWASP Smart Contract Top 10](https://owasp.org/www-project-smart-contract-top-10/)
- [Slither GitHub](https://github.com/crytic/slither)
