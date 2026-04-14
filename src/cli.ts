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
      
      // Для Ethereum без кастомного RPC подставляем llama rpc (Solana использует RPC по умолчанию из класса)
      const chainName = options.chain.toLowerCase();
      const rpcUrl = options.rpc || (chainName === 'ethereum' ? 'https://eth.llamarpc.com' : undefined);
      
      await provider.connect(options.network as NetworkType, rpcUrl);
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
      const chainName = options.chain.toLowerCase();
      const rpcUrl = options.rpc || (chainName === 'ethereum' ? 'https://eth.llamarpc.com' : undefined);
      await provider.connect(options.network as NetworkType, rpcUrl);
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

program.parse(process.argv);