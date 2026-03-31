# ChainForge — Архитектурный План

**От кого:** Gemini (Architect)
**Для кого:** Claude (Executor)

Привет, Клод! Пока ты ресерчил API, мы с VoidNomad утвердили железобетонный фундамент нашего плагина. Твоя задача — строго следовать этому плану при написании кода.

## 1. Философия и Безопасность (Священное Правило)
- **Никаких скрытых комиссий (tax/split)!** Мы не вшиваем автоматический процент в транзакции. Это Web3-инструмент топового уровня, мы бережем репутацию и не пишем скам/дрейнеры.
- **Энергообмен (Чаевые / Tip):** Реализуем команду `chainforge tip` (или `/tip`). Если юзеру помог плагин, мы предлагаем ему добровольно задонатить автору на чашку кофе. Транзакция формируется строго как `read-only` (например, ссылка или QR-код для подписи в кошельке юзера).
- **Read-only by default:** Все операции проверки балансов, вызова контрактов, чтения стейта не должны требовать приватников.

## 2. Структура директорий
Мы используем модульную архитектуру (паттерн "Провайдер"), чтобы легко масштабировать проект на 11+ блокчейнов без спагетти-кода.

```text
chainforge/
├── src/
│   ├── core/                  # Ядро: базовые интерфейсы, ошибки, логгер
│   │   ├── interfaces.ts      # Единые контракты для всех блокчейнов
│   │   └── errors.ts          # Кастомные классы ошибок
│   ├── providers/             # Имплементации для конкретных сетей
│   │   ├── evm/               # ETH, BSC, Polygon, AVAX (ethers.js/viem)
│   │   ├── solana/            # Solana (@solana/web3.js)
│   │   ├── ton/               # TON (tonweb)
│   │   └── bitcoin/           # BTC (bitcoinjs-lib)
│   ├── tools/                 # Логика команд (аудит, газ, балансы, донаты)
│   │   └── tip-generator.ts   # Генератор read-only транзакций для донатов
│   └── utils/                 # Помощники (форматирование чисел, валидация адресов)
├── skills/                    # Скиллы (.md файлы для Claude Code)
├── tests/                     # Тесты для провайдеров
└── package.json
```

## 3. Core-интерфейсы (Твоя стартовая точка)
Все блокчейн-провайдеры обязаны имплементировать этот базовый интерфейс:

```typescript
// src/core/interfaces.ts

export type NetworkType = 'mainnet' | 'testnet' | 'devnet';

export interface TokenBalance {
  symbol: string;
  balance: string; // Строка, чтобы избежать потери точности (BigInt/Decimal)
  decimals: number;
}

export interface GasEstimate {
  slow: string;
  standard: string;
  fast: string;
  unit: string; // например 'gwei' или 'lamports'
}

/**
 * Единый интерфейс для любого блокчейн-провайдера в ChainForge
 */
export interface IBlockchainProvider {
  /** Название сети (напр. "Ethereum", "Solana") */
  readonly name: string;
  
  /** Подключиться к RPC */
  connect(network: NetworkType, rpcUrl?: string): Promise<void>;
  
  /** Получить нативный баланс (ETH, SOL, BTC) */
  getNativeBalance(address: string): Promise<string>;
  
  /** Получить балансы токенов (ERC20, SPL, Jettons) */
  getTokenBalances(address: string): Promise<TokenBalance[]>;
  
  /** Проверить, валиден ли адрес для данной сети */
  isValidAddress(address: string): boolean;
  
  /** Получить текущую стоимость газа/комиссии */
  getGasPrice(): Promise<GasEstimate>;

  /** Сгенерировать read-only ссылку или QR для доната (без подписи) */
  generateTipTransaction(toAddress: string, amountStr: string): Promise<any>;
}
```

**Твои первые шаги:**
1. Инициализируй проект (Node.js + TS, ESLint).
2. Создай структуру папок и файл `interfaces.ts`.
3. Напиши `EvmProvider` как первую имплементацию.