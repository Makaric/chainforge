# Chia — Research Report

**Дата:** 2026-03-29
**Автор:** Claude (Executor, ChainForge)
**Фокус:** READ-ONLY операции

---

## 1. Обзор Chia

### Proof of Space and Time
- Вместо PoW/PoS — доказательство выделенного дискового пространства
- **Proof of Space:** Фермеры предварительно записывают ("plot") криптографические данные на диски
- **Proof of Time:** Timelord'ы генерируют VDF (Verifiable Delay Functions) для верификации
- Экологичный: не требует мощных GPU/ASIC

### Chialisp / CLVM
- **Chialisp** — язык смарт-контрактов Chia (LISP-подобный)
- **CLVM** (ChiaLisp Virtual Machine) — виртуальная машина для выполнения программ
- Модель: coins (не accounts) — каждая монета = отдельная программа (puzzle)
- Уникальный подход: "coin set model" (похож на UTXO Bitcoin, но программируемый)

---

## 2. TypeScript/JavaScript SDK

### Ключевые пакеты

| Пакет | Назначение |
|-------|-----------|
| `chia-agent` | RPC/WebSocket клиент для Node.js (поддержка всех API до v2.5.5) |
| `chia-client` | TypeScript клиент для Chia RPC |
| `chia-bls` | BLS подписи (реализация `chia keys`) |
| `clvm-lib` | Компиляция и десериализация Chialisp |
| `chia-rpc` | HTTP запросы к localhost RPC |
| `chia-wallet-lib` | Управление кошельком, деривация ключей |
| `bip39` | Мнемоники → криптографические сиды |

### Установка

```bash
npm install chia-bls clvm-lib chia-rpc chia-wallet-lib bip39
# или
npm install chia-agent  # всё-в-одном RPC клиент
```

### Пример: чтение coin records

```typescript
import { FullNode } from 'chia-rpc';

const node = new FullNode({ host: 'localhost', port: 8555 });

// Получить записи монет по puzzle hash
const coinRecords = await node.getCoinRecordsByPuzzleHash(puzzleHash);
const record = coinRecords.coin_records[0];
// record.coin.amount, record.coin.parent_coin_info, record.coin.puzzle_hash
```

---

## 3. RPC API

### Архитектура
- JSON RPC через HTTPS
- Аутентификация: самоподписанные TLS сертификаты (mutual TLS)
- Порт НЕ должен быть открыт публично
- Формат: POST запросы с JSON payload

### Порты сервисов

| Сервис | Порт |
|--------|------|
| Daemon | 55400 |
| Full Node | 8555 |
| Farmer | 8559 |
| Harvester | 8560 |
| Wallet | 9256 |
| DataLayer | 8562 |
| Crawler | 8561 |
| Timelord | 8557 |

### Full Node RPC — READ-ONLY эндпоинты

#### Блоки
| Метод | Описание |
|-------|---------|
| `get_blockchain_state` | Состояние блокчейна (peak height, difficulty, mempool) |
| `get_block` | Блок по header hash |
| `get_blocks` | Блоки по диапазону высот |
| `get_block_record` | Запись блока по header hash |
| `get_block_record_by_height` | Запись блока по высоте |
| `get_block_records` | Записи блоков в диапазоне |
| `get_block_count_metrics` | Метрики блоков |

#### Монеты и транзакции
| Метод | Описание |
|-------|---------|
| `get_additions_and_removals` | State transitions для блока (coin records) |
| `get_block_spends` | Все потраченные монеты в блоке |
| `get_coin_records_by_puzzle_hash` | Монеты по puzzle hash |
| `get_coin_record_by_name` | Монета по coin ID |

#### Mempool
| Метод | Описание |
|-------|---------|
| `get_all_mempool_items` | Все элементы мемпула |
| `get_all_mempool_tx_ids` | Все TX ID в мемпуле |

#### Прочее
| Метод | Описание |
|-------|---------|
| `get_aggsig_additional_data` | AGG_SIG данные для текущей сети |

### Пример curl запроса

```bash
curl --insecure --cert ~/.chia/mainnet/config/ssl/full_node/private_full_node.crt \
     --key ~/.chia/mainnet/config/ssl/full_node/private_full_node.key \
     -d '{"header_hash": "..."}' \
     -H "Content-Type: application/json" \
     https://localhost:8555/get_block
```

---

## 4. CAT (Chia Asset Tokens)

### Стандарт
- **CAT1** — устаревший
- **CAT2** — текущий стандарт токенов на Chia
- Аналог ERC-20, но на coin set model
- Каждый CAT = обёртка вокруг стандартной монеты с дополнительной логикой

### Ключевые особенности
- Inner puzzle определяет владение
- Outer puzzle (CAT puzzle) обеспечивает правила токена
- TAIL (Token And Issuance Limiter) — контролирует эмиссию

### Чтение CAT данных
- Через wallet RPC: `get_wallets`, `get_wallet_balance`
- Через full node: coin records с CAT puzzle hash

---

## 5. Безопасность

### Chialisp/CLVM паттерны
- **Coin set model** — каждая монета потребляется целиком (нет частичных трат)
- **Puzzle hash** — определяет условия траты
- **Announcements** — межмонетная коммуникация
- **Conditions** — AGG_SIG_ME, CREATE_COIN, ASSERT_MY_AMOUNT и др.

### Распространённые проблемы
1. **Rebinding attacks** — неправильная привязка announcements
2. **Puzzle reveal issues** — утечка puzzle при трате
3. **Amount overflow** — целочисленные переполнения в CLVM
4. **Missing assertions** — отсутствие ASSERT условий

### Правила для ChainForge
1. Только read-only RPC вызовы
2. Валидация puzzle hash формата
3. Требуется локальная нода для RPC (mTLS)

---

## 6. Особенности для ChainForge

### Отличия от других чейнов
- **Нет публичных API эндпоинтов** — Chia RPC требует локальную ноду с mTLS
- **Coin set model** — принципиально отличается от account-based (EVM, TON) и даже от UTXO (Bitcoin)
- **Puzzle-based** — баланс = сумма всех unspent coins с matching puzzle hash

### Ограничения
- Для полноценной работы нужна синхронизированная нода
- Нет аналога Etherscan/TronGrid с публичным API (есть chia explorer, но API ограничен)
- JS/TS экосистема менее зрелая чем у EVM/Solana

### Рекомендации
```
SDK:         chia-agent (всё-в-одном) или chia-rpc + chia-bls + clvm-lib
Требование:  Локальная Chia нода (mainnet или testnet)
Приоритет:   Низкий (из-за требования локальной ноды)
```

### Зависимости
```json
{
  "chia-agent": "latest"
}
```

### Источники
- [Chia Documentation](https://docs.chia.net/)
- [Full Node RPC Reference](https://docs.chia.net/reference-client/rpc-reference/full-node-rpc/)
- [RPC Overview](https://docs.chia.net/reference-client/rpc-reference/rpc/)
- [Chialisp & TypeScript Guide](https://docs.chia.net/guides/crash-course/chialisp-and-typescript/)
- [chia-agent npm](https://www.npmjs.com/package/chia-agent)
- [chia-client GitHub](https://github.com/freddiecoleman/chia-client)
