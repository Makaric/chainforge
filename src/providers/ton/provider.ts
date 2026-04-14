import { TonClient, Address, toNano } from '@ton/ton';

import type {
  IBlockchainProvider,
  NetworkType,
  TokenBalance,
  GasEstimate,
  TipData,
  TransactionInfo,
} from '../../core/interfaces.js';
import {
  ConnectionError,
  InvalidAddressError,
  RpcError,
} from '../../core/errors.js';
import { logger } from '../../core/logger.js';

const RPC_URLS: Record<NetworkType, string> = {
  mainnet: 'https://toncenter.com/api/v2/jsonRPC',
  testnet: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  devnet: 'https://testnet.toncenter.com/api/v2/jsonRPC',
};

export class TonProvider implements IBlockchainProvider {
  readonly name = 'TON';

  private client: TonClient | null = null;
  private network: NetworkType = 'mainnet';

  async connect(network: NetworkType = 'mainnet', rpcUrl?: string): Promise<void> {
    this.network = network;
    const endpoint = rpcUrl ?? RPC_URLS[network];

    try {
      this.client = new TonClient({ endpoint });
      // Проверяем доступность ноды запросом информации о мастерчейне
      await this.client.getMasterchainInfo();
      logger.info(`[TON] Connected to ${network}`, { rpcUrl: endpoint });
    } catch (err) {
      this.client = null;
      throw new ConnectionError(
        'TON',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    logger.info(`[TON] Disconnected`);
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  async getBlockHeight(): Promise<number> {
    const client = this.ensureConnected();
    try {
      const info = await client.getMasterchainInfo();
      return info.latestSeqno;
    } catch (err) {
      throw new RpcError('getMasterchainInfo', undefined, err instanceof Error ? err.message : String(err));
    }
  }

  async getAccountState(address: string): Promise<string> {
    const client = this.ensureConnected();
    if (!this.isValidAddress(address)) {
      throw new InvalidAddressError(address, 'TON');
    }
    try {
      const state = await client.getContractState(Address.parse(address));
      return state.state;
    } catch (err) {
      throw new RpcError('getContractState', undefined, err instanceof Error ? err.message : String(err));
    }
  }

  private ensureConnected(): TonClient {
    if (!this.client) {
      throw new ConnectionError('TON', 'Not connected. Call connect() first.');
    }
    return this.client;
  }

  isValidAddress(address: string): boolean {
    try {
      Address.parse(address);
      return true;
    } catch {
      return false;
    }
  }

  async getNativeBalance(address: string): Promise<string> {
    const client = this.ensureConnected();
    
    if (!this.isValidAddress(address)) {
      throw new InvalidAddressError(address, 'TON');
    }

    try {
      const balance = await client.getBalance(Address.parse(address));
      // Конвертируем из нанотонов (bigint) в TON
      return (Number(balance) / 1e9).toString();
    } catch (err) {
      throw new RpcError(
        'getBalance',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getTokenBalances(address: string): Promise<TokenBalance[]> {
    this.ensureConnected();
    // Без индексатора или TONAPI получить все Jetton-кошельки адреса невозможно.
    logger.warn('[TON] getTokenBalances requires an indexer API (e.g., TONAPI). Returning empty array.');
    return [];
  }

  async getGasPrice(): Promise<GasEstimate> {
    this.ensureConnected();
    // Эвристическая оценка базовой комиссии за простой перевод
    const baseFee = 0.005;

    return {
      slow: baseFee.toString(),
      standard: baseFee.toString(),
      fast: (baseFee + 0.002).toString(),
      unit: 'TON',
    };
  }

  async generateTipTransaction(toAddress: string, amount: string): Promise<TipData> {
    if (!this.isValidAddress(toAddress)) {
      throw new InvalidAddressError(toAddress, 'TON');
    }

    const amountNano = toNano(amount).toString();
    const deepLink = `ton://transfer/${toAddress}?amount=${amountNano}&text=Tip`;

    return {
      chain: this.name,
      toAddress,
      amount,
      currency: 'TON',
      deepLink,
      qrData: deepLink,
    };
  }

  async getTransaction(hash: string): Promise<TransactionInfo | null> {
    this.ensureConnected();
    // TON v2 API (TonClient) не поддерживает получение транзакции только по хешу.
    logger.warn('[TON] getTransaction requires an indexer API (e.g., TONAPI v3) or logical time. Not supported in base TonClient.');
    throw new Error('Опция просмотра транзакции по хешу в TON временно недоступна (требуется API индексатора)');
  }
}