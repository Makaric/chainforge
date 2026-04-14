import { TronWeb } from 'tronweb';
import type {
  IBlockchainProvider,
  NetworkType,
  TokenBalance,
  GasEstimate,
  TipData,
  TransactionInfo,
} from '../../core/interfaces.js';
import { ConnectionError, RpcError } from '../../core/errors.js';
import { logger } from '../../core/logger.js';

const RPC_URLS: Record<NetworkType, string> = {
  mainnet: 'https://api.trongrid.io',
  testnet: 'https://api.shasta.trongrid.io',
  devnet: 'https://api.nileex.io',
};

export class TronProvider implements IBlockchainProvider {
  readonly name = 'Tron';
  private tronWeb: any = null; // Используем any, так как типы tronweb могут отличаться

  async connect(network: NetworkType = 'mainnet', rpcUrl?: string): Promise<void> {
    const fullHost = rpcUrl ?? RPC_URLS[network];
    try {
      this.tronWeb = new TronWeb({ fullHost });
      logger.info(`[Tron] Connected to ${network}`, { rpcUrl: fullHost });
    } catch (err) {
      throw new ConnectionError('Tron', err instanceof Error ? err.message : String(err));
    }
  }

  async disconnect(): Promise<void> {
    this.tronWeb = null;
    logger.info(`[Tron] Disconnected`);
  }

  isConnected(): boolean {
    return this.tronWeb !== null;
  }

  isValidAddress(address: string): boolean {
    if (!this.tronWeb) {
      // Базовая офлайн валидация (начинается на T, 34 символа)
      return address.startsWith('T') && address.length === 34;
    }
    return this.tronWeb.isAddress(address);
  }

  async getNativeBalance(address: string): Promise<string> {
    if (!this.tronWeb) throw new ConnectionError('Tron', 'Not connected');
    try {
      const balanceSun = await this.tronWeb.trx.getBalance(address);
      return this.tronWeb.fromSun(balanceSun).toString();
    } catch (err) {
      throw new RpcError('getBalance', undefined, err instanceof Error ? err.message : String(err));
    }
  }

  async getTokenBalances(address: string): Promise<TokenBalance[]> {
    logger.warn('[Tron] getTokenBalances requires an indexer API for TRC20. Returning empty array.');
    return [];
  }

  async getGasPrice(): Promise<GasEstimate> {
    // В Tron плата зачисляется в Bandwidth/Energy
    return {
      slow: '268',
      standard: '268',
      fast: '268',
      unit: 'Bandwidth',
    };
  }

  async generateTipTransaction(toAddress: string, amount: string): Promise<TipData> {
    const deepLink = `tron:transfer?to=${toAddress}&amount=${amount}`;
    return {
      chain: this.name,
      toAddress,
      amount,
      currency: 'TRX',
      deepLink,
      qrData: deepLink,
    };
  }

  async getTransaction(hash: string): Promise<TransactionInfo | null> {
    if (!this.tronWeb) throw new ConnectionError('Tron', 'Not connected');
    try {
      const tx = await this.tronWeb.trx.getTransaction(hash);
      if (!tx || !tx.raw_data) return null;
      
      let from = '';
      let to = null;
      let value = '0';
      
      if (tx.raw_data.contract && tx.raw_data.contract.length > 0) {
        const contract = tx.raw_data.contract[0];
        if (contract.type === 'TransferContract') {
          from = this.tronWeb.address.fromHex(contract.parameter.value.owner_address);
          to = this.tronWeb.address.fromHex(contract.parameter.value.to_address);
          value = this.tronWeb.fromSun(contract.parameter.value.amount).toString();
        }
      }

      return {
        hash: tx.txID,
        from,
        to,
        value,
        blockNumber: null, // REST API не всегда возвращает высоту блока здесь
        timestamp: tx.raw_data.timestamp || null,
        status: tx.ret && tx.ret[0].contractRet === 'SUCCESS' ? 'confirmed' : 'pending',
      };
    } catch (err) {
      throw new RpcError('getTransaction', undefined, err instanceof Error ? err.message : String(err));
    }
  }
}