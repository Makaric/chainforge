# TRON — Research Report

**Дата:** 2026-03-29
**Автор:** Claude (Executor, ChainForge)
**Фокус:** READ-ONLY операции

---

## 1. TronWeb SDK

### Текущая версия: v6.2.2 (март 2026)

- **npm:** `tronweb`
- **GitHub:** `tronprotocol/tronweb`
- **Язык:** TypeScript (полный рерайт с v6.0.0)
- **Node.js:** v14+
- **Модули:** CommonJS + ESM (с v6.0.0)

### Ключевые модули

| Модуль | Назначение |
|--------|-----------|
| **Trx** | Запросы данных с нод, подпись транзакций |
| **TransactionBuilder** | Построение транзакций с клиентской проверкой целостности |
| **Contract** | Взаимодействие с контрактами |
| **Utils** | Утилиты (аналог web3.js/ethers.js) |

### Инициализация

```typescript
import TronWeb from 'tronweb';

// READ-ONLY — без приватного ключа
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': 'your-api-key' }
});
```

### Read-Only методы

```typescript
// Баланс аккаунта
const account = await tronWeb.trx.getAccount('TAddress...');
const balance = await tronWeb.trx.getBalance('TAddress...'); // в SUN (1 TRX = 10^6 SUN)

// Транзакция
const tx = await tronWeb.trx.getTransaction('txId...');

// Информация о блоке
const block = await tronWeb.trx.getCurrentBlock();
const blockByNum = await tronWeb.trx.getBlockByNumber(12345);
```

### TRC-20 (Read-Only)

```typescript
// USDT на TRON: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
const contract = await tronWeb.contract().at('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');

const balance = await contract.balanceOf('TAddress...').call();
const symbol = await contract.symbol().call();
const decimals = await contract.decimals().call();
const totalSupply = await contract.totalSupply().call();
```

### Миграция v5 → v6
TypeScript рерайт с breaking changes. Для обновления с v5 — см. migration guide в официальной документации.

---

## 2. TRON API / TronGrid

### Основной эндпоинт
**Base URL:** `https://api.trongrid.io/v1/`
**Тестнет (Shasta):** `https://api.shasta.trongrid.io`

### Rate Limits

| Условие | Лимит |
|---------|-------|
| С API Key (в рамках дневного лимита) | 15 req/sec |
| С API Key (превышен дневной лимит) | ~5 req/sec |
| Без API Key | Динамический лимит, 403 + блок 30 сек при превышении |
| Free план — макс. API ключей | 3 |
| Free план — дневной лимит | 100,000 запросов |

### Ключевые эндпоинты

| Эндпоинт | Описание |
|----------|---------|
| `/wallet/getaccount` | Информация об аккаунте |
| `/wallet/getnowblock` | Текущий блок |
| `/wallet/getblockbynum` | Блок по номеру |
| `/wallet/gettransactionbyid` | Транзакция по ID |
| `/wallet/gettransactioninfobyid` | Расширенная инфо о транзакции |
| `/wallet/triggersmartcontract` | Вызов контракта (включая read-only) |

### Ресурсная модель TRON

TRON использует модель ресурсов вместо газа:
- **Bandwidth** — потребляется при любой транзакции
- **Energy** — потребляется при взаимодействии со смарт-контрактами
- Бесплатные ежедневные Bandwidth points для каждого аккаунта
- Energy получается через стейкинг TRX (Stake 2.0)

---

## 3. Особенности TRON

### Адресация
- Формат: Base58Check (начинается с `T`)
- Hex формат: `41` + 20 bytes
- Пример: `TMQyjfBgeMhFZQ6DnJxz12xQHY4tcGZgJe`

### USDT на TRON
- Крупнейший стейблкоин-хаб (большая часть USDT переводов)
- Контракт: `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`
- Низкие комиссии: ~1 TRX за перевод USDT
- TRC-20 стандарт (аналог ERC-20)

### DPoS консенсус
- 27 Super Representatives (SR)
- Блок каждые 3 секунды
- Стейкинг TRX для голосования за SR

---

## 4. Безопасность

### Распространённые уязвимости TRC-20
- Те же что ERC-20 (reentrancy, overflow) — TVM совместим с EVM
- Approval race condition
- Фейковые трансфер-уведомления (transferFrom без реального трансфера)

### Правила для ChainForge
1. Никогда не хранить приватные ключи
2. TronWeb без `privateKey` в конфигурации
3. Проверка контрактов перед взаимодействием
4. Валидация адресов (Base58Check)

---

## 5. Рекомендации для ChainForge

### Стек
```
SDK:         tronweb v6.x
API:         TronGrid (api.trongrid.io)
Тестнет:     Shasta (api.shasta.trongrid.io)
```

### Зависимости
```json
{
  "tronweb": "^6.2.0"
}
```

### Quick Reference
```
EVM:   provider.getBalance("0x...")          TRON:  tronWeb.trx.getBalance("T...")
EVM:   ethers.parseEther("1.0")             TRON:  tronWeb.toSun("1.0")  // 1 TRX = 10^6 SUN
EVM:   contract.balanceOf(addr)             TRON:  contract.balanceOf(addr).call()
```

### Источники
- [TronWeb npm](https://www.npmjs.com/package/tronweb)
- [TronWeb GitHub](https://github.com/tronprotocol/tronweb)
- [TRON Developer Docs](https://developers.tron.network/)
- [TRC-20 Contract Interaction](https://developers.tron.network/docs/trc20-contract-interaction)
- [TronGrid](https://www.trongrid.io/)
