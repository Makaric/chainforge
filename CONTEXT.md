# ChainForge — Контекст проекта

## Дата старта: 2026-03-29
## Статус: READY TO PUBLISH
## Last Updated: 2026-03-31

## Что это
Плагин/тулкит для Claude Code — набор скиллов и инструментов для работы с блокчейнами.
Публичный open-source проект для комьюнити. Read-only, без приватных ключей.

## Tandem
- **VoidNomad (Maxim)** — Creator, идеолог
- **Claude** — Executor, код, интеграции
- **Gemini** — Architect, планирование архитектуры, код-ревью

## Реализованные провайдеры (6/6)

| Провайдер | Сети | Библиотека | Статус |
|-----------|------|-----------|--------|
| EvmProvider | Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche | viem | Done + Gemini review |
| BitcoinProvider | Bitcoin | mempool.space API | Done |
| SolanaProvider | Solana | @solana/web3.js | Done |
| TonProvider | TON | @ton/ton | Done |
| TronProvider | TRON | tronweb | Done |
| CosmosProvider | Cosmos, Osmosis, Celestia, Injective | @cosmjs/stargate | Done |

## Скиллы (4/4)
- chainforge-balance — проверка балансов
- chainforge-gas — мониторинг газа/комиссий
- chainforge-tx — просмотр транзакций
- chainforge-tip — генерация донат-ссылок

## Инструменты
- tip-generator — генератор добровольных донат-ссылок (EIP-681, BIP-21, Solana Pay, ton://)

## Тесты
- 57+ тестов (vitest), все зелёные
- Покрытие: все 6 провайдеров + tip-generator

## Безопасность (СВЯЩЕННОЕ ПРАВИЛО)
- НИКОГДА не хранить приватные ключи в коде
- Все операции по умолчанию — read-only
- Транзакции — только после явного подтверждения пользователя
- Аудит контрактов перед любым взаимодействием

## Кошельки (read-only, для тестов и донатов)
- ETH: 0x4A88CEA080F9A2e60324799EF91400d13aEE439a
- BTC: bc1q6gdlptzwhdqnrt2n96hjfws50seplkmmxurh3v
- SOL: HxV7H5fkYdoXBv6PhaR538xcMqSQFD7hVbBWdb3H5CHF
- TRX: TMQyjfBgeMhFZQ6DnJxz12xQHY4tcGZgJe

## История

| Дата | Событие |
|------|---------|
| 2026-03-29 | Gemini: ARCHITECTURE.md, план провайдеров |
| 2026-03-29 | Claude: EVM Provider (viem, read-only) |
| 2026-03-29 | Gemini: код-ревью EVM стека — approved, патч parseEther |
| 2026-03-29 | Claude: все 6 провайдеров, 57+ тестов, 4 скилла, tip-generator |
| 2026-03-31 | Claude: обновление контекста, генерация README, подготовка к публикации |
