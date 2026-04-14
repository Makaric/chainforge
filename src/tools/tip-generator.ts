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