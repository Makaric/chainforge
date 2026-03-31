/**
 * Bitcoin Provider — read-only операции через Mempool.space API.
 * UTXO модель. Без приватных ключей.
 */

import { validate, getAddressInfo } from 'bitcoin-address-validation';

import type {
  IBlockchainProvider,
  NetworkType,
  ChainInfo,
  TokenBalance,
  TransactionInfo,
  GasEstimate,
  TipData,
} from '../../core/interfaces.js';
import {
  ConnectionError,
  InvalidAddressError,
  RpcError,
} from '../../core/errors.js';
import { logger } from '../../core/logger.js';

const MEMPOOL_API: Record<NetworkType, string> = {
  mainnet: 'https://mempool.space/api',
  testnet: 'https://mempool.space/testnet/api',
  devnet: 'https://mempool.space/testnet/api',
};

interface MempoolAddressInfo {
  address: string;
  chain_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
  mempool_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
}

interface MempoolTx {
  txid: string;
  version: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    prevout: { scriptpubkey_address?: string; value: number } | null;
  }>;
  vout: Array<{
    scriptpubkey_address?: string;
    value: number;
  }>;
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
}

interface MempoolFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export class BitcoinProvider implements IBlockchainProvider {
  readonly name = 'Bitcoin';
  readonly chain: ChainInfo = {
    name: 'Bitcoin',
    family: 'bitcoin',
    nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
    explorerUrl: 'https://mempool.space',
  };

  private baseUrl: string | null = null;
  private network: NetworkType = 'mainnet';

  async connect(network: NetworkType = 'mainnet', rpcUrl?: string): Promise<void> {
    this.network = network;
    this.baseUrl = rpcUrl ?? MEMPOOL_API[network];

    try {
      const res = await fetch(`${this.baseUrl}/blocks/tip/height`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.text();
      logger.info(`Connected to Bitcoin (${network})`, { api: this.baseUrl });
    } catch (err) {
      this.baseUrl = null;
      throw new ConnectionError(
        'Bitcoin',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async disconnect(): Promise<void> {
    this.baseUrl = null;
    logger.info('Disconnected from Bitcoin');
  }

  isConnected(): boolean {
    return this.baseUrl !== null;
  }

  private getBaseUrl(): string {
    if (!this.baseUrl) {
      throw new ConnectionError('Bitcoin', 'Not connected. Call connect() first.');
    }
    return this.baseUrl;
  }

  private async apiGet<T>(path: string): Promise<T> {
    const url = `${this.getBaseUrl()}${path}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new RpcError(`GET ${path}`, res.status, `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  isValidAddress(address: string): boolean {
    if (!address) return false;
    const isTestnet = this.network === 'testnet' || this.network === 'devnet';
    return validate(address, isTestnet ? 'testnet' as never : 'mainnet' as never);
  }

  async getNativeBalance(address: string): Promise<string> {
    if (!this.isValidAddress(address)) {
      throw new InvalidAddressError(address, 'Bitcoin');
    }

    const info = await this.apiGet<MempoolAddressInfo>(`/address/${address}`);

    const confirmedBalance =
      info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum;
    const mempoolBalance =
      info.mempool_stats.funded_txo_sum - info.mempool_stats.spent_txo_sum;
    const totalSats = confirmedBalance + mempoolBalance;

    return satsToBtc(totalSats);
  }

  async getTokenBalances(_address: string): Promise<TokenBalance[]> {
    // Bitcoin не имеет нативных токенов.
    // BRC-20/Runes требуют отдельный indexed API (Xverse, Ordiscan).
    return [];
  }

  async getTransaction(hash: string): Promise<TransactionInfo | null> {
    try {
      const tx = await this.apiGet<MempoolTx>(`/tx/${hash}`);

      const from = tx.vin[0]?.prevout?.scriptpubkey_address ?? 'coinbase';
      const to = tx.vout[0]?.scriptpubkey_address ?? null;
      const totalOutput = tx.vout.reduce((sum, out) => sum + out.value, 0);

      return {
        hash: tx.txid,
        from,
        to: to ?? null,
        value: satsToBtc(totalOutput),
        blockNumber: tx.status.block_height ?? null,
        timestamp: tx.status.block_time ?? null,
        status: tx.status.confirmed ? 'confirmed' : 'pending',
        fee: satsToBtc(tx.fee),
      };
    } catch {
      return null;
    }
  }

  async getTransactionHistory(
    address: string,
    limit: number = 25,
  ): Promise<TransactionInfo[]> {
    if (!this.isValidAddress(address)) {
      throw new InvalidAddressError(address, 'Bitcoin');
    }

    const txs = await this.apiGet<MempoolTx[]>(`/address/${address}/txs`);

    return txs.slice(0, limit).map((tx) => {
      const from = tx.vin[0]?.prevout?.scriptpubkey_address ?? 'coinbase';
      const to = tx.vout[0]?.scriptpubkey_address ?? null;
      const totalOutput = tx.vout.reduce((sum, out) => sum + out.value, 0);

      return {
        hash: tx.txid,
        from,
        to: to ?? null,
        value: satsToBtc(totalOutput),
        blockNumber: tx.status.block_height ?? null,
        timestamp: tx.status.block_time ?? null,
        status: tx.status.confirmed ? 'confirmed' : 'pending',
        fee: satsToBtc(tx.fee),
      };
    });
  }

  async getGasPrice(): Promise<GasEstimate> {
    const fees = await this.apiGet<MempoolFees>('/v1/fees/recommended');

    return {
      slow: fees.hourFee.toString(),
      standard: fees.halfHourFee.toString(),
      fast: fees.fastestFee.toString(),
      unit: 'sat/vB',
    };
  }

  async getBlockHeight(): Promise<number> {
    const height = await this.apiGet<number>('/blocks/tip/height');
    return height;
  }

  async generateTipTransaction(
    toAddress: string,
    amount: string,
  ): Promise<TipData> {
    if (!this.isValidAddress(toAddress)) {
      throw new InvalidAddressError(toAddress, 'Bitcoin');
    }

    const deepLink = `bitcoin:${toAddress}?amount=${amount}`;

    return {
      chain: 'Bitcoin',
      toAddress,
      amount,
      currency: 'BTC',
      deepLink,
      qrData: deepLink,
    };
  }

  // --- Bitcoin-specific convenience methods ---

  async getUtxos(address: string): Promise<Array<{
    txid: string;
    vout: number;
    value: string;
    confirmed: boolean;
  }>> {
    if (!this.isValidAddress(address)) {
      throw new InvalidAddressError(address, 'Bitcoin');
    }

    const utxos = await this.apiGet<Array<{
      txid: string;
      vout: number;
      value: number;
      status: { confirmed: boolean };
    }>>(`/address/${address}/utxo`);

    return utxos.map((u) => ({
      txid: u.txid,
      vout: u.vout,
      value: satsToBtc(u.value),
      confirmed: u.status.confirmed,
    }));
  }

  async getMempoolInfo(): Promise<{
    count: number;
    vsize: number;
    totalFee: number;
  }> {
    return this.apiGet('/mempool');
  }

  getAddressType(address: string): string | null {
    if (!validate(address)) return null;
    const info = getAddressInfo(address);
    return info.type; // p2pkh, p2sh, p2wpkh, p2wsh, p2tr
  }
}

function satsToBtc(sats: number): string {
  return (sats / 1e8).toFixed(8);
}
