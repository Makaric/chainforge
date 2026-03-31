# TON (The Open Network) — Research Report

**Дата:** 2026-03-29
**Автор:** Claude (Executor, ChainForge)
**Фокус:** READ-ONLY операции

---

## 1. SDK Options

### @ton/ton (ton-core) — РЕКОМЕНДУЕТСЯ

- **npm:** `@ton/ton`
- **GitHub:** `ton-org/ton`
- **Язык:** TypeScript (нативная поддержка)
- **Статус:** Активная разработка, официально рекомендуемый SDK

**Пакеты экосистемы @ton:**

| Пакет | Назначение |
|-------|-----------|
| `@ton/ton` | Основной SDK — клиент, контракты, сообщения |
| `@ton/core` | Низкоуровневые примитивы (Cell, Slice, Builder, Address) |
| `@ton/crypto` | Криптографические функции (Ed25519, SHA256) |
| `@ton/blueprint` | Фреймворк разработки (тестирование, деплой) |
| `@ton/sandbox` | Локальный эмулятор блокчейна |

**Пример чтения баланса:**
```typescript
import { TonClient, Address } from '@ton/ton';

const client = new TonClient({
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  apiKey: 'YOUR_API_KEY' // опционально, но рекомендуется
});

const balance = await client.getBalance(
  Address.parse('EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2')
);
// 1 TON = 10^9 nanoton
```

### tonweb — Legacy

- **npm:** `tonweb`
- **Язык:** JavaScript (нет нативных TS типов)
- **Статус:** Поддерживается, но считается устаревшим. Новые проекты → @ton/ton

---

## 2. TON HTTP API

### TON Center API v2

**Base URL:** `https://toncenter.com/api/v2/`
**JSON-RPC:** `https://toncenter.com/api/v2/jsonRPC`
**Авторизация:** API key через `X-API-Key` заголовок

**Ключевые READ-ONLY эндпоинты:**

| Эндпоинт | Описание |
|----------|---------|
| `/getAddressInformation` | Баланс, состояние, код, данные аккаунта |
| `/getAddressBalance` | Только баланс |
| `/getTransactions` | История транзакций адреса |
| `/getAddressState` | Состояние (uninitialized/active/frozen) |
| `/getMasterchainInfo` | Последний блок мастерчейна |
| `/getBlockTransactions` | Транзакции в конкретном блоке |
| `/runGetMethod` | Вызов get-метода смарт-контракта |
| `/getTokenData` | Метаданные Jetton/NFT |
| `/detectAddress` | Определение формата адреса |

### TON Center API v3

**Base URL:** `https://toncenter.com/api/v3/`
**Статус:** Индексированный API с расширенными запросами

**Эндпоинты v3:**

| Эндпоинт | Описание |
|----------|---------|
| `/jetton/masters` | Мастер-контракты джеттонов |
| `/jetton/wallets` | Данные кошельков джеттонов |
| `/jetton/transfers` | История трансферов джеттонов |
| `/nft/collections` | NFT коллекции |
| `/nft/items` | NFT предметы |
| `/nft/transfers` | История трансферов NFT |

### TONAPI (tonapi.io) — Альтернатива

**Base URL:** `https://tonapi.io/v2/`
**Провайдер:** Команда Tonkeeper
**Авторизация:** Bearer token (tonconsole.com)

Высокоуровневый индексированный API: аккаунты, джеттоны, NFT, трассировка транзакций, DNS, стейкинг, SSE/WebSocket стриминг.

---

## 3. Архитектурные отличия от EVM

| Аспект | EVM (Ethereum) | TON |
|--------|----------------|-----|
| Модель аккаунтов | Глобальное дерево состояний | Акторная модель |
| Адресация | 20-byte hex (0x...) | 36-byte (workchain + hash), base64 |
| Смарт-контракты | Общий EVM, синхронные вызовы | Независимые TVM, асинхронные сообщения |
| Шардинг | Нет (L1) | Встроенный бесконечный шардинг |
| Структура блоков | Линейная цепь | Masterchain + workchains + shardchains |
| Формат данных | ABI-encoded (bytes) | TL-B (Cells, Slices, Builders) |
| RPC | JSON-RPC (стандарт) | ADNL (кастомный P2P) |
| Токены | ERC-20 (один контракт) | Jetton (master + wallet на каждого юзера) |

### ADNL (Abstract Datagram Network Layer)

TON НЕ использует стандартный JSON-RPC нативно. ADNL — UDP-based зашифрованный P2P протокол.

**Для ChainForge:** Используем HTTP API (toncenter), который транслирует запросы в ADNL. Прямой ADNL не нужен.

### Формат адресов

```
Raw:            0:4a1c08...b3c7a  (workchain:hex_hash)
User-friendly:  EQBKHAj...8Neq   (base64url с флагами)
```

Флаги: Bounceable (EQ...) для контрактов, Non-bounceable (UQ...) для первичных переводов.

---

## 4. Jettons — Токены TON

### Стандарты
- **TEP-74** — Fungible Token (Jetton) Standard
- **TEP-89** — Jetton metadata standard

### Архитектура (ключевое отличие от ERC-20)

ERC-20 = один контракт с `balanceOf`. Jettons = распределённая архитектура:

```
Jetton Master Contract (metadata, total supply)
  ├── Jetton Wallet (User A) — отдельный контракт
  ├── Jetton Wallet (User B) — отдельный контракт
  └── Jetton Wallet (User C) — отдельный контракт
```

### Чтение данных Jetton (READ-ONLY)

```typescript
import { TonClient, Address, JettonMaster } from '@ton/ton';

const client = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });

// Метаданные из мастер-контракта
const jettonMaster = client.open(
  JettonMaster.create(Address.parse('EQ...'))
);
const data = await jettonMaster.getJettonData();
// data.totalSupply, data.mintable, data.adminAddress, data.content

// Баланс пользователя
const userWallet = await jettonMaster.getWalletAddress(Address.parse('USER_ADDRESS'));
const balance = await client.open(JettonWallet.create(userWallet)).getBalance();
```

### Известные Jettons
USDT (нативный на TON), jUSDC, SCALE (DeDust), STON (Ston.fi), NOT (Notcoin), DOGS.

---

## 5. NFT на TON

### Стандарты
- **TEP-62** — NFT Standard
- **TEP-64** — Token Data Standard (metadata)
- **TEP-66** — NFT Royalty Standard
- **TEP-85** — SBT (Soulbound Token)

### Чтение NFT данных

```typescript
// Через get-methods
const result = await client.runMethod(collectionAddress, 'get_collection_data');
// next_item_index, collection_content, owner_address

// Через TONAPI
// GET https://tonapi.io/v2/accounts/{address}/nfts
```

---

## 6. TON Connect

**Версия:** TON Connect 2.0
**Пакеты:** `@tonconnect/sdk`, `@tonconnect/ui`

**Для ChainForge CLI:** TON Connect предназначен для web/mobile dApps, НЕ для CLI. При добавлении write-операций — генерировать deep links для Tonkeeper/MyTonWallet.

---

## 7. Публичные API эндпоинты

| Провайдер | URL | Auth | Free Tier |
|-----------|-----|------|-----------|
| TON Center v2 | toncenter.com/api/v2/jsonRPC | API key | ~10 rps |
| TON Center v3 | toncenter.com/api/v3/ | API key | То же |
| TONAPI | tonapi.io/v2/ | Bearer | Ограниченный free |
| TON Access (Orbs) | Автовыбор | Нет | Без троттлинга |
| GetBlock | go.getblock.io/ | API key | ~40k req/day |
| Testnet | testnet.toncenter.com/api/v2/jsonRPC | API key | Free |

**TON Access:**
```typescript
import { getHttpEndpoint } from '@orbs-network/ton-access';
const endpoint = await getHttpEndpoint(); // автовыбор лучшего
const client = new TonClient({ endpoint });
```

---

## 8. Безопасность

### Языки контрактов
- **FunC** — Зрелый, C-подобный (оригинальный)
- **Tact** — Высокоуровневый, TypeScript-подобный (рекомендуется для новых проектов)
- **Fift** — Низкоуровневый, ассемблер-подобный

### Распространённые уязвимости
1. **Unbounded Message Chains** — состояние может стать неконсистентным между отправками
2. **Bounce Handling** — отсутствие bounce-обработчиков = заблокированные средства
3. **Storage Fee Attacks** — раздувание хранилища контракта
4. **Insufficient Gas Checks** — операции fail mid-chain
5. **Replay Attacks** — без seqno возможен replay
6. **Unauthorized Access** — нет встроенного msg.sender как в Solidity

### Правила безопасности для ChainForge
1. Никогда не хранить приватные ключи / мнемоники
2. Все операции READ-ONLY по умолчанию
3. Перед взаимодействием с контрактом: проверка верификации, стандартов, паттернов скама
4. Валидация всех адресов
5. Rate-limiting API вызовов

---

## 9. Telegram интеграция

- **@wallet** бот — нативная интеграция TON в Telegram
- **Fragment** — маркетплейс (юзернеймы как NFT на TON)
- **Telegram Mini Apps (TMA)** — веб-приложения внутри Telegram
- **TON DNS** — `.ton` домены, резолв on-chain

### Релевантность для ChainForge
- TON DNS резолв — полезно для поиска адресов
- Fragment NFT — стандартный NFT API
- TMA — не напрямую (фронтенд)

---

## 10. Рекомендации для ChainForge

### Стек
```
Primary SDK:     @ton/ton + @ton/core
HTTP API:        TON Center v2 (default) + v3 (indexed queries)
Fallback API:    TONAPI (tonapi.io)
Reliability:     @orbs-network/ton-access
```

### Зависимости
```json
{
  "@ton/ton": "^15.0.0",
  "@ton/core": "^0.56.0",
  "@ton/crypto": "^3.2.0",
  "@orbs-network/ton-access": "^2.3.0"
}
```

### Quick Reference: TON vs EVM
```
EVM:  provider.getBalance("0x...")         TON:  client.getBalance(Address.parse("EQ..."))
EVM:  contract.balanceOf("0x...")          TON:  master.getWalletAddress(addr) -> wallet.getBalance()
EVM:  ethers.parseEther("1.0")            TON:  toNano("1.0")  // 1 TON = 10^9 nanoton
EVM:  JSON-RPC over HTTP                  TON:  ADNL (native) / HTTP API (wrapper)
```
