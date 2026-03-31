/**
 * TON Provider — read-only операции через @ton/ton + TON Center API.
 * Акторная модель, Jettons, асинхронные сообщения.
 * Без приватных ключей.
 */

import { TonClient, Address, JettonMaster, fromNano } from '@ton/ton';

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

const TON_ENDPOINTS: Record<NetworkType, string> = {
  mainnet: 'https://toncenter.com/api/v2/jsonRPC',
  testnet: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  devnet: 'https://testnet.toncenter.com/api/v2/jsonRPC',
};

export class TonProvider implements IBlockchainProvider {
  readonly name = 'TON';
  readonly chain: ChainInfo = {
    name: 'TON',
    family: 'ton',
    nativeCurrency: { name: 'Toncoin', symbol: 'TON', decimals: 9 },
    explorerUrl: 'https://tonviewer.com',
  };

  private client: TonClient | null = null;
  private apiBaseUrl = 'https://toncenter.com/api/v2';

  async connect(network: NetworkType = 'mainnet', rpcUrl?: string): Promise<void> {
    const endpoint = rpcUrl ?? TON_ENDPOINTS[network];

    try {
      this.client = new TonClient({ endpoint });

      // Verify connection by getting masterchain info
      await this.client.getMasterchainInfo();

      if (network === 'testnet' || network === 'devnet') {
        this.apiBaseUrl = 'https://testnet.toncenter.com/api/v2';
      }

      logger.info(`Connected to TON (${network})`, { endpoint });
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
    logger.info('Disconnected from TON');
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  private getClient(): TonClient {
    if (!this.client) {
      throw new ConnectionError('TON', 'Not connected. Call connect() first.');
    }
    return this.client;
  }

  private parseAddress(address: string): Address {
    try {
      return Address.parse(address);
    } catch {
      throw new InvalidAddressError(address, 'TON');
    }
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
    const client = this.getClient();
    const addr = this.parseAddress(address);

    try {
      const balance = await client.getBalance(addr);
      return fromNano(balance);
    } catch (err) {
      throw new RpcError(
        'getBalance',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getTokenBalances(_address: string): Promise<TokenBalance[]> {
    // Jettons на TON — распределённая архитектура.
    // Для получения всех Jetton-балансов нужен indexed API (TONAPI).
    // Используйте getJettonBalance() для конкретных Jetton.
    logger.warn('getTokenBalances for TON requires TONAPI. Use getJettonBalance() for specific jettons.');
    return [];
  }

  async getTransaction(hash: string): Promise<TransactionInfo | null> {
    // TON использует (address, lt, hash) для идентификации транзакций,
    // а не единый hash. Для поиска по hash нужен indexed API.
    logger.warn('TON transaction lookup by hash requires TONAPI indexed API.');
    return null;
  }

  async getTransactionHistory(
    address: string,
    limit: number = 20,
  ): Promise<TransactionInfo[]> {
    const addr = this.parseAddress(address);

    try {
      const res = await fetch(
        `${this.apiBaseUrl}/getTransactions?address=${addr.toString()}&limit=${limit}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as { ok: boolean; result: TonApiTx[] };
      if (!data.ok || !data.result) return [];

      return data.result.map((tx) => ({
        hash: tx.transaction_id?.hash ?? '',
        from: tx.in_msg?.source ?? '',
        to: tx.in_msg?.destination ?? null,
        value: fromNano(BigInt(tx.in_msg?.value ?? '0')),
        blockNumber: null,
        timestamp: tx.utime ?? null,
        status: 'confirmed' as const,
        fee: fromNano(BigInt(tx.fee ?? '0')),
      }));
    } catch (err) {
      throw new RpcError(
        'getTransactions',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getGasPrice(): Promise<GasEstimate> {
    // TON gas — внутренний механизм на основе gas units.
    // Типичная простая транзакция: ~0.005-0.01 TON.
    return {
      slow: '0.005',
      standard: '0.01',
      fast: '0.05',
      unit: 'TON',
    };
  }

  async getBlockHeight(): Promise<number> {
    const client = this.getClient();

    try {
      const info = await client.getMasterchainInfo();
      return info.latestSeqno;
    } catch (err) {
      throw new RpcError(
        'getMasterchainInfo',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async generateTipTransaction(
    toAddress: string,
    amount: string,
  ): Promise<TipData> {
    const addr = this.parseAddress(toAddress);

    // ton:// deep link format
    const deepLink = `ton://transfer/${addr.toString()}?amount=${BigInt(Math.round(parseFloat(amount) * 1e9))}`;

    return {
      chain: 'TON',
      toAddress: addr.toString(),
      amount,
      currency: 'TON',
      deepLink,
      qrData: deepLink,
    };
  }

  // --- TON-specific convenience methods ---

  async getJettonBalance(
    jettonMasterAddress: string,
    walletAddress: string,
  ): Promise<TokenBalance> {
    const client = this.getClient();
    const masterAddr = this.parseAddress(jettonMasterAddress);
    const userAddr = this.parseAddress(walletAddress);

    try {
      const master = client.open(JettonMaster.create(masterAddr));
      const data = await master.getJettonData();

      const userWalletAddr = await master.getWalletAddress(userAddr);

      // Read balance from user's jetton wallet contract
      const walletState = await client.getContractState(userWalletAddr);

      let balance = 0n;
      if (walletState.state === 'active') {
        // Call get_wallet_data on the jetton wallet
        const result = await client.runMethod(userWalletAddr, 'get_wallet_data');
        balance = result.stack.readBigNumber();
      }

      // Jettons typically use 9 decimals, but can vary
      const decimals = 9;
      const formattedBalance = fromNano(balance);

      return {
        symbol: jettonMasterAddress.slice(0, 8) + '...',
        balance: formattedBalance,
        decimals,
        contractAddress: jettonMasterAddress,
      };
    } catch (err) {
      throw new RpcError(
        'getJettonBalance',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getAccountState(address: string): Promise<'active' | 'uninitialized' | 'frozen'> {
    const client = this.getClient();
    const addr = this.parseAddress(address);

    try {
      const state = await client.getContractState(addr);
      return state.state as 'active' | 'uninitialized' | 'frozen';
    } catch (err) {
      throw new RpcError(
        'getContractState',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

// Types for TON Center API v2 response
interface TonApiTx {
  transaction_id?: { hash: string };
  in_msg?: {
    source: string;
    destination: string;
    value: string;
  };
  utime?: number;
  fee?: string;
}
