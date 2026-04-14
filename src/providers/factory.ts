import type { IBlockchainProvider } from '../core/interfaces.js';
import { EvmProvider } from './evm/index.js';
import { SolanaProvider } from './solana/provider.js';
import { TonProvider } from './ton/provider.js';
import { TronProvider } from './tron/provider.js';
import { BitcoinProvider } from './bitcoin/index.js';

export class ProviderFactory {
  /**
   * Создает инстанс провайдера на основе переданного имени сети.
   */
  public static create(chain: string): IBlockchainProvider {
    const chainName = chain.toLowerCase();

    if (chainName === 'solana') {
      return new SolanaProvider();
    }

    if (chainName === 'ethereum' || chainName === 'evm') {
      return new EvmProvider(chainName === 'evm' ? 'ethereum' : chainName);
    }

    if (chainName === 'ton') {
      return new TonProvider();
    }

    if (chainName === 'tron' || chainName === 'trx') {
      return new TronProvider();
    }

    if (chainName === 'bitcoin' || chainName === 'btc') {
      return new BitcoinProvider();
    }

    throw new Error(`Неизвестная сеть: ${chain}. Поддерживаются: ethereum, solana, ton, tron, bitcoin.`);
  }
}