# Bitcoin — Research Report

**Дата:** 2026-03-29
**Автор:** Claude (Executor, ChainForge)
**Фокус:** READ-ONLY операции

---

## 1. bitcoinjs-lib

**Версия:** v7.0.1
**npm:** [bitcoinjs-lib](https://www.npmjs.com/package/bitcoinjs-lib)

### Поддержка типов адресов

| Тип | Префикс | Encoding | Payment функция |
|-----|---------|----------|----------------|
| **P2PKH** (Legacy) | `1...` | Base58Check | `payments.p2pkh()` |
| **P2SH** (Script Hash) | `3...` | Base58Check | `payments.p2sh()` |
| **P2WPKH** (Native SegWit) | `bc1q...` (42 char) | Bech32 | `payments.p2wpkh()` |
| **P2WSH** (SegWit Script) | `bc1q...` (62 char) | Bech32 | `payments.p2wsh()` |
| **P2TR** (Taproot) | `bc1p...` (62 char) | Bech32m | `payments.p2tr()` |

### v7 Breaking Changes
1. **ECPair вынесен** — отдельный пакет `ecpair`
2. **ECC library injectable** — требуется `TinySecp256k1Interface`
3. **HD keys вынесены** — `bip32` отдельный пакет

### Необходимые пакеты
```
bitcoinjs-lib       — core (транзакции, скрипты, адреса)
ecpair              — ECPair класс
bip32               — HD key derivation
tiny-secp256k1      — ECC реализация (WASM)
```

### Read-Only использование
```typescript
import * as bitcoin from 'bitcoinjs-lib';

// Декодирование адреса (не требует ECC)
const output = bitcoin.address.toOutputScript('bc1q...', bitcoin.networks.bitcoin);

// Декодирование транзакции
const tx = bitcoin.Transaction.fromHex(rawTxHex);

// Инспекция PSBT
const psbt = bitcoin.Psbt.fromHex(hexString);
```

---

## 2. Bitcoin RPC API (Read-Only)

JSON-RPC, порт 8332 по умолчанию.

### Blockchain
| Метод | Описание |
|-------|---------|
| `getblockchaininfo` | Chain, block count, difficulty, softforks |
| `getblock <hash> [verbosity]` | 0=hex, 1=JSON+txids, 2=JSON+full tx |
| `getblockhash <height>` | Hash блока по высоте |
| `getblockcount` | Текущая высота |
| `getdifficulty` | Текущая сложность |
| `getbestblockhash` | Hash верхнего блока |

### Mempool
| Метод | Описание |
|-------|---------|
| `getmempoolinfo` | Размер, bytes, usage, min fee |
| `getrawmempool [verbose]` | Список txid или полные объекты |
| `getmempoolentry <txid>` | Данные tx в mempool |

### Транзакции
| Метод | Описание |
|-------|---------|
| `getrawtransaction <txid> [verbose]` | Raw hex или decoded JSON |
| `decoderawtransaction <hex>` | Декодирование raw tx |
| `decodescript <hex>` | Декодирование скрипта |

### Комиссии и сеть
| Метод | Описание |
|-------|---------|
| `estimatesmartfee <conf_target>` | Fee rate (BTC/kB) для подтверждения в N блоках |
| `getnetworkinfo` | P2P состояние, версия, соединения |

---

## 3. Публичные API провайдеры

### Mempool.space API — РЕКОМЕНДУЕТСЯ (Primary)

**Base URL:** `https://mempool.space/api`
**Авторизация:** Не требуется
**Open source:** Да, self-hostable
**JS client:** `mempool.js`

**Адреса:**
```
GET /address/:address        — Детали адреса
GET /address/:address/txs    — История (50 mempool + 25 confirmed)
GET /address/:address/utxo   — Список UTXO
```

**Транзакции:**
```
GET /tx/:txid                — Детали транзакции
GET /tx/:txid/status         — Статус подтверждения
GET /tx/:txid/hex            — Raw hex
GET /tx/:txid/outspends      — Статус потраченных выходов
```

**Блоки:**
```
GET /block/:hash             — Детали блока
GET /block/:hash/txs/:start  — Транзакции (25/page)
GET /block-height/:height    — Hash блока по высоте
GET /block/tip/height        — Текущая высота
```

**Комиссии:**
```
GET /v1/fees/recommended     — { fastestFee, halfHourFee, hourFee, economyFee, minimumFee }
GET /v1/fees/mempool-blocks  — Распределение fee по блокам mempool
```

**Mempool:**
```
GET /mempool                 — Статистика (count, vsize, total_fee)
GET /mempool/recent          — Последние 10 tx
```

### Blockstream Esplora API — Fallback

**Base URL:** `https://blockstream.info/api`
**Open source:** MIT, self-hostable

```
GET /address/:address        — Info (funded_txo_count, spent_txo_count)
GET /address/:address/utxo   — Список UTXO
GET /tx/:txid                — Детали транзакции
GET /block/:hash             — Детали блока
GET /fee-estimates           — { target: feerate_sat_per_vbyte }
```

### BlockCypher API

**Base URL:** `https://api.blockcypher.com/v1/btc/main`

| Тир | Rate | Daily |
|-----|------|-------|
| Free | 3 req/sec, 100 req/hr | 2,000/day |

### Сравнение провайдеров

| Фича | Mempool.space | Blockstream | BlockCypher |
|------|---------------|-------------|-------------|
| Free tier | Да | Да | Да (limited) |
| Open source | Да | Да (MIT) | Нет |
| Self-hostable | Да | Да | Нет |
| Lightning data | Да | Нет | Нет |
| Лучшие fee данные | **Да** | Хорошие | Базовые |

---

## 4. Ordinals & BRC-20

### Текущее состояние
- **~97.4M** Ordinal inscriptions
- **~92.5M** BRC-20 транзакций
- **>5,000 BTC** в комиссиях от BRC-20

BRC-20 использует JSON inscriptions: `deploy`, `mint`, `transfer` — не smart-contract based.

### API для запросов

**Xverse API (рекомендуется)**
- [docs.xverse.app/api](https://docs.xverse.app/api/)
- Заменяет deprecated Hiro Ordinals API (deprecated 9 марта 2026)
- Inscriptions, BRC-20 balances, Runes

**Ordiscan API**
- [ordiscan.com/docs/api](https://ordiscan.com/docs/api)
- npm: `ordiscan` (TypeScript SDK)
- Inscriptions by address, BRC-20 balances, rune balances, rare sats

**ord Server (Self-Hosted)**
- `ord server --index-addresses`
- `/inscriptions`, `/inscription/:id`, `/sat/:number`, `/output/:outpoint`

---

## 5. Lightning Network

### Mempool.space Lightning API (Free, без авторизации)

**Статистика сети:**
```
GET /v1/lightning/statistics/latest     — Ноды, каналы, capacity, fees
GET /v1/lightning/statistics/:interval  — Историческая (24h, 1w, 1m, 1y, 3y)
```

**Ноды:**
```
GET /v1/lightning/nodes/rankings/connectivity  — Top 100 по каналам
GET /v1/lightning/nodes/rankings/liquidity     — Top 100 по capacity
GET /v1/lightning/nodes/:pubkey                — Детали ноды
GET /v1/lightning/nodes/:pubkey/channels       — Каналы (10/page)
```

**Каналы:**
```
GET /v1/lightning/channels/:channelId          — Детали канала
```

### LND REST API (Self-Hosted)
Требует TLS + macaroon auth.
```
GET /v1/getinfo          — Info ноды
GET /v1/graph            — Полный граф сети
GET /v1/channels         — Каналы ноды
GET /v1/network/info     — Обзор сети
```

---

## 6. Валидация адресов

### bitcoin-address-validation v3.0.0 (рекомендуется)

```typescript
import { validate, getAddressInfo, Network } from 'bitcoin-address-validation';

validate('17VZNX1SN5NtKa8UQFxwQbFeFc3iqRYhem');           // true (P2PKH)
validate('bc1qw508d6qejxtdg4y5r3zarvar...');              // true (P2WPKH)
validate('bc1p5d7rjq7g6rdk2yhzks9sml...');                // true (P2TR)
validate('invalid');                                        // false
validate('tb1q...', Network.testnet);                      // network-specific

const info = getAddressInfo('bc1q...');
// { address, type: 'p2wpkh', network: 'mainnet', bech32: true }
```

### Альтернатива: через bitcoinjs-lib
```typescript
function validateAddress(addr: string): boolean {
  try { bitcoin.address.toOutputScript(addr, bitcoin.networks.bitcoin); return true; }
  catch { return false; }
}
```

---

## 7. Рекомендации для ChainForge

### Стек
```
Core:           bitcoinjs-lib v7 (парсинг tx, скрипты, адреса)
Validation:     bitcoin-address-validation v3
Primary API:    Mempool.space (free, no auth, Lightning, лучшие fee)
Fallback API:   Blockstream Esplora (free, open-source)
Ordinals:       Xverse API
```

### Зависимости
```json
{
  "bitcoinjs-lib": "^7.0.1",
  "bitcoin-address-validation": "^3.0.0",
  "ecpair": "latest",
  "tiny-secp256k1": "latest"
}
```

### Принципы
- UTXO модель — баланс = сумма unspent outputs
- Не переиспользовать адреса (приватность)
- Проверять все типы адресов (P2PKH, P2SH, P2WPKH, P2WSH, P2TR)
- Mempool.space как primary — лучшие fee estimates, Lightning data

### Источники
- [bitcoinjs-lib GitHub](https://github.com/bitcoinjs/bitcoinjs-lib)
- [Mempool.space API Docs](https://mempool.space/docs/api/rest)
- [Blockstream Esplora API](https://github.com/Blockstream/esplora/blob/master/API.md)
- [Xverse Ordinals API](https://docs.xverse.app/api/)
- [bitcoin-address-validation](https://www.npmjs.com/package/bitcoin-address-validation)
