# ChainForge — Blockchain Research Index

**Дата:** 2026-03-29
**Статус:** Первичный ресёрч завершён

---

## Отчёты по экосистемам

| Файл | Блокчейны | SDK | Статус |
|------|-----------|-----|--------|
| [evm-ecosystem.md](evm-ecosystem.md) | Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche | viem 2.47.6, ethers.js 6.16.0 | Ready |
| [solana-ecosystem.md](solana-ecosystem.md) | Solana | @solana/kit 3.0.3 | Ready |
| [bitcoin-ecosystem.md](bitcoin-ecosystem.md) | Bitcoin | bitcoinjs-lib 7.0.1 | Ready |
| [ton-ecosystem.md](ton-ecosystem.md) | TON | @ton/ton ~15.x | Ready |
| [tron-ecosystem.md](tron-ecosystem.md) | TRON | tronweb 6.2.2 | Ready |
| [cosmos-ecosystem.md](cosmos-ecosystem.md) | Cosmos Hub, Osmosis, Celestia, Injective... | @cosmjs/stargate 0.38.0 | Ready |
| [chia-ecosystem.md](chia-ecosystem.md) | Chia | chia-agent | Ready |

---

## Сводка по рекомендуемому стеку

### EVM (6 чейнов)
- **Primary:** viem (типобезопасность, 35kB bundle)
- **Fallback:** ethers.js v6 (совместимость)
- **RPC:** Ankr (30M/мес free, 80+ чейнов)

### Solana
- **SDK:** @solana/kit v3.x (бывш. web3.js v2)
- **RPC:** Helius (1M credits/мес free)
- **NFTs:** DAS API

### Bitcoin
- **SDK:** bitcoinjs-lib v7 + bitcoin-address-validation
- **API:** Mempool.space (free, Lightning, лучшие fee)
- **Ordinals:** Xverse API

### TON
- **SDK:** @ton/ton + @ton/core (НЕ tonweb)
- **API:** TON Center v2/v3 + TONAPI fallback
- **Reliability:** @orbs-network/ton-access

### TRON
- **SDK:** tronweb v6.x (TypeScript rewrite)
- **API:** TronGrid (100K req/day free)
- **Фокус:** USDT на TRON

### Cosmos (10+ чейнов)
- **SDK:** @cosmjs/stargate v0.38
- **RPC:** chain-registry endpoints
- **IBC:** встроенные query extensions

### Chia
- **SDK:** chia-agent
- **Ограничение:** Требует локальную ноду (mTLS)
- **Приоритет:** Низкий (из-за требования ноды)

---

## Ключевые выводы

1. **viem > ethers.js** для нового кода (типобезопасность, bundle size)
2. **@solana/kit заменил @solana/web3.js** — v1 в maintenance mode
3. **@ton/ton заменил tonweb** — ARCHITECTURE.md следует обновить
4. **Chia** самый сложный для интеграции — нет публичных API
5. **Ankr** — лучший бесплатный RPC для EVM (80+ чейнов, единый URL паттерн)
6. **Mempool.space** — лучший бесплатный API для Bitcoin
7. Все SDK поддерживают TypeScript из коробки
