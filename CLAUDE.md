# ChainForge — Claude Code Protocol

## Проект
ChainForge — плагин/тулкит для Claude Code. Набор скиллов для работы с блокчейнами.
Публичный open-source проект для комьюнити.

## Правила
1. НИКОГДА не хранить приватные ключи, seed-фразы, пароли в коде или файлах
2. Все блокчейн-операции по умолчанию — READ-ONLY
3. Транзакции (запись в блокчейн) — ТОЛЬКО после явного подтверждения пользователя
4. Перед взаимодействием с контрактом — обязательный аудит безопасности
5. Код на TypeScript, чистый, типизированный
6. Conventional Commits: feat(), fix(), docs(), refactor()
7. Проверять диск F: перед файловыми операциями

## Структура
```
chainforge/
  src/              — исходный код
  skills/           — .md скиллы для Claude Code
  docs/             — документация
  tests/            — тесты
  CONTEXT.md        — контекст и состояние проекта
  ARCHITECTURE.md   — архитектурный план и базовые интерфейсы (ОБЯЗАТЕЛЬНО К ПРОЧТЕНИЮ)
  CLAUDE.md         — этот файл
```

## Стек (предварительно)
- TypeScript / Node.js
- ethers.js / viem (EVM-сети)
- @solana/web3.js (Solana)
- bitcoinjs-lib (Bitcoin)
- tonweb / @ton/ton (TON)
- tronweb (TRON)
- cosmjs (Cosmos)
