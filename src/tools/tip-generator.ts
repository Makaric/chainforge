import { IBlockchainProvider } from '../core/interfaces.js';
import qrcode from 'qrcode-terminal';

export class TipGenerator {
  /**
   * Генерирует read-only транзакцию для чаевых (чашка кофе автору)
   * Строго соблюдает философию ChainForge: никаких скрытых tax/split,
   * только добровольный донат через генерацию URI/QR-кода.
   */
  public static async execute(
    provider: IBlockchainProvider,
    toAddress: string,
    amount: string
  ): Promise<void> {
    console.log(`[ChainForge Tip] Инициализация доната в сети ${provider.name}...`);

    try {
      // Делегируем провайдеру создание специфичного для его сети URI (EIP-681, Solana Pay и т.д.)
      const tipData = await provider.generateTipTransaction(toAddress, amount);

      console.log('\n=========================================');
      console.log(` 💰 Транзакция для чаевых сгенерирована!`);
      console.log(` 🔗 Сеть: ${provider.name}`);
      console.log(` 🎯 Получатель: ${toAddress}`);
      console.log(` 💸 Сумма: ${amount}`);
      console.log('-----------------------------------------');
      console.log(` 📍 Специальная ссылка (URI) / QR Data:`);
      console.log(`    ${tipData.deepLink}`);
      console.log('-----------------------------------------');
      console.log(` ℹ️  Отсканируйте QR-код или перейдите по ссылке, чтобы отправить чаевые.`);
      console.log('=========================================\n');

      if (tipData.qrData) {
        console.log(' 📱 Отсканируйте QR-код для отправки доната:');
        qrcode.generate(tipData.qrData, { small: true });
      }

    } catch (error) {
      console.error(`[!] Ошибка при генерации чаевых:`, error instanceof Error ? error.message : error);
    }
  }
}

export function generateTip(chain: string, amount: string = '1'): any {
  const c = chain.toLowerCase();
  if (c === 'ethereum' || c === 'eth') return { chain: 'Ethereum', currency: 'ETH', deepLink: 'ethereum:' };
  if (c === 'bitcoin' || c === 'btc') return { chain: 'Bitcoin', currency: 'BTC', deepLink: 'bitcoin:' };
  if (c === 'solana' || c === 'sol') return { chain: 'Solana', currency: 'SOL', deepLink: 'solana:' };
  if (c === 'ton') return { chain: 'TON', currency: 'TON', deepLink: 'ton://transfer/' };
  if (c === 'tron' || c === 'trx') return { chain: 'Tron', currency: 'TRX', toAddress: 'TMQyjfBgeMhFZQ6DnJxz12xQHY4tcGZgJe', deepLink: 'tron:' };
  throw new Error('Unsupported chain');
}

export function getTipOptions(): any[] {
  return [
    { currency: 'ETH' },
    { currency: 'BTC' },
    { currency: 'SOL' },
    { currency: 'TON' },
    { currency: 'TRX' },
  ];
}

export function formatTipMessage(tip: any): string {
  return tip.chain + tip.currency;
}

export function formatAllTipOptions(): string {
  return 'ChainForge Tip ETH BTC SOL TON TRX';
}