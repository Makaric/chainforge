import { Command } from 'commander';
import { ProviderFactory } from './providers/factory.js';
import { TipGenerator } from './tools/tip-generator.js';
import type { NetworkType } from './core/interfaces.js';

const program = new Command();

program
  .name('chainforge')
  .description('ChainForge CLI - Web3 multi-chain toolkit')
  .version('1.0.0');

program
  .command('tip')
  .description('Генерация read-only транзакции для чаевых')
  .requiredOption('-c, --chain <chain>', 'Блокчейн (например: ethereum, solana)')
  .requiredOption('-t, --to <address>', 'Адрес получателя')
  .requiredOption('-a, --amount <amount>', 'Сумма (в нативной валюте, например ETH или SOL)')
  .option('-n, --network <network>', 'Тип сети (mainnet, testnet, devnet)', 'mainnet')
  .option('-r, --rpc <url>', 'Кастомный RPC URL (опционально)')
  .action(async (options) => {
    console.log('🚀 Запуск ChainForge CLI...\n');

    try {
      const provider = ProviderFactory.create(options.chain);

      console.log(`[CLI] Подключение к сети ${provider.name} (${options.network})...`);
      
      await provider.connect(options.network as NetworkType, options.rpc);
      console.log('[CLI] Успешно подключено!\n');

      await TipGenerator.execute(provider, options.to, options.amount);
    } catch (error) {
      console.error('[CLI] Крит. ошибка выполнения:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('balance')
  .description('Проверка баланса нативной валюты и токенов (ERC20/SPL)')
  .requiredOption('-c, --chain <chain>', 'Блокчейн (например: ethereum, solana)')
  .requiredOption('-a, --address <address>', 'Адрес кошелька для проверки')
  .option('-n, --network <network>', 'Тип сети (mainnet, testnet, devnet)', 'mainnet')
  .option('-r, --rpc <url>', 'Кастомный RPC URL (опционально)')
  .action(async (options) => {
    console.log('🚀 Запуск ChainForge CLI...\n');

    try {
      const provider = ProviderFactory.create(options.chain);

      console.log(`[CLI] Подключение к сети ${provider.name} (${options.network})...`);
      await provider.connect(options.network as NetworkType, options.rpc);
      console.log('[CLI] Успешно подключено!\n');

      console.log(`[CLI] Запрос балансов для ${options.address}...`);
      const nativeBalance = await provider.getNativeBalance(options.address);
      const tokens = await provider.getTokenBalances(options.address);

      console.log('\n=========================================');
      console.log(` 💼 Баланс кошелька: ${options.address}`);
      console.log(` 🔗 Сеть: ${provider.name}`);
      console.log('-----------------------------------------');
      console.log(` 🪙  Нативный баланс: ${nativeBalance}`);
      
      if (tokens.length > 0) {
        console.log('\n 💎 Токены:');
        tokens.forEach(t => console.log(`    - ${t.balance} ${t.symbol}`));
      } else {
        console.log('\n 💎 Токены: не найдены (или сеть требует индексатор)');
      }
      console.log('=========================================\n');
    } catch (error) {
      console.error('[CLI] Крит. ошибка выполнения:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('tx')
  .description('Просмотр деталей транзакции по хешу')
  .requiredOption('-c, --chain <chain>', 'Блокчейн (например: ethereum, solana, ton)')
  .requiredOption('-h, --hash <hash>', 'Хеш транзакции')
  .option('-n, --network <network>', 'Тип сети (mainnet, testnet, devnet)', 'mainnet')
  .option('-r, --rpc <url>', 'Кастомный RPC URL (опционально)')
  .action(async (options) => {
    console.log('🚀 Запуск ChainForge CLI...\n');

    try {
      const provider = ProviderFactory.create(options.chain);

      console.log(`[CLI] Подключение к сети ${provider.name} (${options.network})...`);
      await provider.connect(options.network as NetworkType, options.rpc);
      console.log('[CLI] Успешно подключено!\n');

      console.log(`[CLI] Запрос данных транзакции: ${options.hash}...`);
      const tx = await provider.getTransaction(options.hash);

      if (!tx) {
        console.log(`\n[!] Транзакция не найдена или еще не добыта.`);
        return;
      }

      console.log('\n=========================================');
      console.log(` 📜 Детали транзакции`);
      console.log(` 🔗 Сеть: ${provider.name}`);
      console.log('-----------------------------------------');
      console.log(` 🆔 Хеш: ${tx.hash}`);
      console.log(` 🚥 Статус: ${tx.status.toUpperCase()}`);
      console.log(` 📤 Отправитель: ${tx.from}`);
      console.log(` 📥 Получатель: ${tx.to || 'Н/Д (Создание контракта)'}`);
      console.log(` 💰 Сумма: ${tx.value}`);
      if (tx.fee) console.log(` 💸 Комиссия: ${tx.fee}`);
      if (tx.blockNumber) console.log(` 📦 Блок: ${tx.blockNumber}`);
      if (tx.timestamp) console.log(` ⏱️  Время: ${new Date(tx.timestamp * 1000).toLocaleString()}`);
      console.log('=========================================\n');
    } catch (error) {
      console.error('[CLI] Крит. ошибка выполнения:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('gas')
  .description('Проверка текущей стоимости газа/комиссии')
  .requiredOption('-c, --chain <chain>', 'Блокчейн (например: ethereum, solana, ton)')
  .option('-n, --network <network>', 'Тип сети (mainnet, testnet, devnet)', 'mainnet')
  .option('-r, --rpc <url>', 'Кастомный RPC URL (опционально)')
  .action(async (options) => {
    console.log('🚀 Запуск ChainForge CLI...\n');

    try {
      const provider = ProviderFactory.create(options.chain);

      console.log(`[CLI] Подключение к сети ${provider.name} (${options.network})...`);
      await provider.connect(options.network as NetworkType, options.rpc);
      console.log('[CLI] Успешно подключено!\n');

      console.log(`[CLI] Запрос стоимости газа...`);
      const gas = await provider.getGasPrice();

      console.log('\n=========================================');
      console.log(` ⛽ Оценка стоимости газа / комиссии`);
      console.log(` 🔗 Сеть: ${provider.name}`);
      console.log('-----------------------------------------');
      console.log(` 🐢 Медленно:  ${gas.slow} ${gas.unit}`);
      console.log(` 🚶 Стандарт:  ${gas.standard} ${gas.unit}`);
      console.log(` 🚀 Быстро:    ${gas.fast} ${gas.unit}`);
      console.log('=========================================\n');
    } catch (error) {
      console.error('[CLI] Крит. ошибка выполнения:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse(process.argv);