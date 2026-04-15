import { Command } from 'commander';
import { ProviderFactory } from './providers/factory.js';
import { TipGenerator } from './tools/tip-generator.js';
import type { NetworkType } from './core/interfaces.js';
import type { IEvmProvider } from './core/interfaces.js';
import { getConfig, setConfig } from './core/config.js';

const program = new Command();

function getResolvedOptions(options: any) {
  const config = getConfig();
  const targetChain = options.chain || config.defaultChain;
  if (!targetChain) {
    console.error('[!] Ошибка: Не указан блокчейн (-c) и нет значения по умолчанию.');
    console.error('    Настройте его через: chainforge config -c <chain>');
    process.exit(1);
  }
  const targetNetwork = options.network || config.defaultNetwork || 'mainnet';
  const targetRpc = options.rpc || (config.rpcUrls && config.rpcUrls[targetChain.toLowerCase()]);
  return { targetChain, targetNetwork, targetRpc };
}

program
  .name('chainforge')
  .description('ChainForge CLI - Web3 multi-chain toolkit')
  .version('1.0.0');

program
  .command('config')
  .description('Настройка параметров по умолчанию (сеть, RPC)')
  .option('-c, --chain <chain>', 'Установить блокчейн по умолчанию')
  .option('-n, --network <network>', 'Установить сеть по умолчанию (mainnet, testnet)')
  .option('-r, --rpc <url>', 'Установить RPC URL для выбранного блокчейна')
  .action((options) => {
    const config = getConfig();
    let updated = false;

    if (options.chain) {
      config.defaultChain = options.chain;
      updated = true;
      console.log(`[Config] Блокчейн по умолчанию: ${options.chain}`);
    }
    if (options.network) {
      config.defaultNetwork = options.network;
      updated = true;
      console.log(`[Config] Сеть по умолчанию: ${options.network}`);
    }
    if (options.rpc) {
      const targetChain = (options.chain || config.defaultChain)?.toLowerCase();
      if (!targetChain) {
        console.error('[!] Для установки RPC необходимо указать блокчейн (-c) или иметь его в конфиге.');
        process.exit(1);
      }
      if (!config.rpcUrls) config.rpcUrls = {};
      config.rpcUrls[targetChain] = options.rpc;
      updated = true;
      console.log(`[Config] RPC URL для ${targetChain}: ${options.rpc}`);
    }

    if (updated) {
      setConfig(config);
      console.log('✅ Конфигурация успешно сохранена!');
    } else {
      console.log('Текущая конфигурация:', JSON.stringify(config, null, 2));
    }
  });

program
  .command('tip')
  .description('Генерация read-only транзакции для чаевых')
  .option('-c, --chain <chain>', 'Блокчейн (например: ethereum, solana)')
  .requiredOption('-t, --to <address>', 'Адрес получателя')
  .requiredOption('-a, --amount <amount>', 'Сумма (в нативной валюте, например ETH или SOL)')
  .option('-n, --network <network>', 'Тип сети (mainnet, testnet, devnet)')
  .option('-r, --rpc <url>', 'Кастомный RPC URL (опционально)')
  .action(async (options) => {
    console.log('🚀 Запуск ChainForge CLI...\n');

    try {
      const { targetChain, targetNetwork, targetRpc } = getResolvedOptions(options);
      const provider = ProviderFactory.create(targetChain);

      console.log(`[CLI] Подключение к сети ${provider.name} (${targetNetwork})...`);
      await provider.connect(targetNetwork as NetworkType, targetRpc);
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
  .option('-c, --chain <chain>', 'Блокчейн (например: ethereum, solana)')
  .requiredOption('-a, --address <address>', 'Адрес кошелька для проверки')
  .option('-n, --network <network>', 'Тип сети (mainnet, testnet, devnet)')
  .option('-r, --rpc <url>', 'Кастомный RPC URL (опционально)')
  .action(async (options) => {
    console.log('🚀 Запуск ChainForge CLI...\n');

    try {
      const { targetChain, targetNetwork, targetRpc } = getResolvedOptions(options);
      const provider = ProviderFactory.create(targetChain);

      console.log(`[CLI] Подключение к сети ${provider.name} (${targetNetwork})...`);
      await provider.connect(targetNetwork as NetworkType, targetRpc);
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
  .option('-c, --chain <chain>', 'Блокчейн (например: ethereum, solana, ton)')
  .requiredOption('-h, --hash <hash>', 'Хеш транзакции')
  .option('-n, --network <network>', 'Тип сети (mainnet, testnet, devnet)')
  .option('-r, --rpc <url>', 'Кастомный RPC URL (опционально)')
  .action(async (options) => {
    console.log('🚀 Запуск ChainForge CLI...\n');

    try {
      const { targetChain, targetNetwork, targetRpc } = getResolvedOptions(options);
      const provider = ProviderFactory.create(targetChain);

      console.log(`[CLI] Подключение к сети ${provider.name} (${targetNetwork})...`);
      await provider.connect(targetNetwork as NetworkType, targetRpc);
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
  .option('-c, --chain <chain>', 'Блокчейн (например: ethereum, solana, ton)')
  .option('-n, --network <network>', 'Тип сети (mainnet, testnet, devnet)')
  .option('-r, --rpc <url>', 'Кастомный RPC URL (опционально)')
  .action(async (options) => {
    console.log('🚀 Запуск ChainForge CLI...\n');

    try {
      const { targetChain, targetNetwork, targetRpc } = getResolvedOptions(options);
      const provider = ProviderFactory.create(targetChain);

      console.log(`[CLI] Подключение к сети ${provider.name} (${targetNetwork})...`);
      await provider.connect(targetNetwork as NetworkType, targetRpc);
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

program
  .command('logs')
  .description('Просмотр последних событий (logs) смарт-контракта (только EVM)')
  .option('-c, --chain <chain>', 'Блокчейн (например: ethereum, polygon, bsc)')
  .requiredOption('-a, --address <address>', 'Адрес смарт-контракта')
  .option('-n, --network <network>', 'Тип сети (mainnet, testnet, devnet)')
  .option('-r, --rpc <url>', 'Кастомный RPC URL (опционально)')
  .action(async (options) => {
    console.log('🚀 Запуск ChainForge CLI...\n');

    try {
      const { targetChain, targetNetwork, targetRpc } = getResolvedOptions(options);
      const provider = ProviderFactory.create(targetChain);

      if (!('getLogs' in provider)) {
        console.error(`[!] Команда logs поддерживается только для EVM-сетей. Сеть ${provider.name} не подходит.`);
        process.exit(1);
      }

      const evmProvider = provider as unknown as IEvmProvider;

      console.log(`[CLI] Подключение к сети ${provider.name} (${targetNetwork})...`);
      await evmProvider.connect(targetNetwork as NetworkType, targetRpc);
      console.log('[CLI] Успешно подключено!\n');

      console.log(`[CLI] Запрос логов для контракта ${options.address}...`);
      const logs = await evmProvider.getLogs({ address: options.address });

      console.log('\n=========================================');
      console.log(` 📋 Логи смарт-контракта`);
      console.log(` 🔗 Сеть: ${evmProvider.name}`);
      console.log('-----------------------------------------');
      if (logs.length === 0) {
        console.log(' 📭 Новых событий не найдено (или контракт не эмитил их в последних блоках).');
      } else {
        logs.slice(0, 10).forEach((log, i) => {
          console.log(` [${i + 1}] Блок: ${log.blockNumber} | Хеш tx: ${log.transactionHash}`);
          console.log(`     Topic 0: ${log.topics[0] || 'Н/Д'}`);
        });
        if (logs.length > 10) console.log(`\n ... и ещё ${logs.length - 10} событий.`);
      }
      console.log('=========================================\n');
    } catch (error) {
      console.error('[CLI] Крит. ошибка выполнения:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('inspect')
  .description('Проверка адреса (EOA или смарт-контракт)')
  .option('-c, --chain <chain>', 'Блокчейн (например: ethereum, polygon, bsc)')
  .requiredOption('-a, --address <address>', 'Адрес для проверки')
  .option('-n, --network <network>', 'Тип сети (mainnet, testnet, devnet)')
  .option('-r, --rpc <url>', 'Кастомный RPC URL (опционально)')
  .action(async (options) => {
    console.log('🚀 Запуск ChainForge CLI...\n');

    try {
      const { targetChain, targetNetwork, targetRpc } = getResolvedOptions(options);
      const provider = ProviderFactory.create(targetChain);

      if (!('getContractCode' in provider)) {
        console.error(`[!] Команда inspect поддерживается только для EVM-сетей. Сеть ${provider.name} не подходит.`);
        process.exit(1);
      }

      const evmProvider = provider as unknown as IEvmProvider;

      console.log(`[CLI] Подключение к сети ${provider.name} (${targetNetwork})...`);
      await evmProvider.connect(targetNetwork as NetworkType, targetRpc);
      console.log('[CLI] Успешно подключено!\n');

      console.log(`[CLI] Проверка адреса ${options.address}...`);
      const code = await evmProvider.getContractCode(options.address);

      console.log('\n=========================================');
      console.log(` 🔍 Инспекция адреса`);
      console.log(` 🔗 Сеть: ${evmProvider.name}`);
      console.log('-----------------------------------------');
      console.log(` 🎯 Адрес: ${options.address}`);
      
      if (code === '0x' || code === '') {
        console.log(` 👤 Тип: Обычный кошелек (EOA - Externally Owned Account)`);
        console.log(` 📄 Код контракта: Отсутствует`);
      } else {
        console.log(` 🤖 Тип: Смарт-контракт`);
        console.log(` 📦 Размер байткода: ${(code.length - 2) / 2} байт`);
        console.log(` 💻 Байткод (превью): ${code.substring(0, 42)}...`);
      }
      console.log('=========================================\n');
    } catch (error) {
      console.error('[CLI] Крит. ошибка выполнения:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('token')
  .description('Проверка баланса конкретного ERC-20 токена (только EVM)')
  .option('-c, --chain <chain>', 'Блокчейн (например: ethereum, polygon, bsc)')
  .requiredOption('-a, --address <address>', 'Адрес кошелька пользователя')
  .requiredOption('-t, --token <token>', 'Адрес смарт-контракта токена (ERC-20)')
  .option('-n, --network <network>', 'Тип сети (mainnet, testnet, devnet)')
  .option('-r, --rpc <url>', 'Кастомный RPC URL (опционально)')
  .action(async (options) => {
    console.log('🚀 Запуск ChainForge CLI...\n');

    try {
      const { targetChain, targetNetwork, targetRpc } = getResolvedOptions(options);
      const provider = ProviderFactory.create(targetChain);

      if (!('getErc20TokenBalance' in provider)) {
        console.error(`[!] Команда token пока поддерживается только для EVM-сетей. Сеть ${provider.name} не подходит.`);
        process.exit(1);
      }

      const evmProvider = provider as unknown as IEvmProvider;

      console.log(`[CLI] Подключение к сети ${provider.name} (${targetNetwork})...`);
      await evmProvider.connect(targetNetwork as NetworkType, targetRpc);
      console.log('[CLI] Успешно подключено!\n');

      console.log(`[CLI] Запрос данных токена ${options.token} для кошелька ${options.address}...`);
      const tokenInfo = await evmProvider.getErc20TokenBalance(options.address, options.token);

      console.log('\n=========================================');
      console.log(` 🪙  Токен-баланс (ERC-20)`);
      console.log(` 🔗 Сеть: ${evmProvider.name}`);
      console.log('-----------------------------------------');
      console.log(` 👤 Кошелек: ${options.address}`);
      console.log(` 📦 Контракт: ${options.token}`);
      console.log(` 💎 Баланс:  ${tokenInfo.balance} ${tokenInfo.symbol}`);
      console.log(` ⚙️  Децималы: ${tokenInfo.decimals}`);
      console.log('=========================================\n');
    } catch (error) {
      console.error('[CLI] Крит. ошибка выполнения:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse(process.argv);