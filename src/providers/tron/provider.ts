/**
 * TRON Provider — read-only операции через TronWeb.
 * Без приватных ключей. Фокус на USDT/TRC-20.
 */

import { TronWeb } from 'tronweb';

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

const TRON_HOSTS: Record<NetworkType, string> = {
  mainnet: 'https://api.trongrid.io',
  testnet: 'https://api.shasta.trongrid.io',
  devnet: 'https://api.shasta.trongrid.io',
};

// USDT on TRON mainnet
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export class TronProvider implements IBlockchainProvider {
  readonly name = 'TRON';
  readonly chain: ChainInfo = {
    name: 'TRON',
    family: 'tron',
    nativeCurrency: { name: 'TRONIX', symbol: 'TRX', decimals: 6 },
    explorerUrl: 'https://tronscan.org',
  };

  private tronWeb: TronWeb | null = null;

  async connect(network: NetworkType = 'mainnet', rpcUrl?: string): Promise<void> {
    const host = rpcUrl ?? TRON_HOSTS[network];

    try {
      this.tronWeb = new TronWeb({ fullHost: host });

      // Verify connection
      const block = await this.tronWeb.trx.getCurrentBlock();
      if (!block?.block_header) throw new Error('Failed to get current block');

      logger.info(`Connected to TRON (${network})`, { host });
    } catch (err) {
      this.tronWeb = null;
      throw new ConnectionError(
        'TRON',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async disconnect(): Promise<void> {
    this.tronWeb = null;
    logger.info('Disconnected from TRON');
  }

  isConnected(): boolean {
    return this.tronWeb !== null;
  }

  private getTronWeb(): TronWeb {
    if (!this.tronWeb) {
      throw new ConnectionError('TRON', 'Not connected. Call connect() first.');
    }
    return this.tronWeb;
  }

  isValidAddress(address: string): boolean {
    if (!address) return false;
    return TronWeb.isAddress(address);
  }

  private validateAddress(address: string): string {
    if (!this.isValidAddress(address)) {
      throw new InvalidAddressError(address, 'TRON');
    }
    return address;
  }

  async getNativeBalance(address: string): Promise<string> {
    const tw = this.getTronWeb();
    this.validateAddress(address);

    try {
      const sunBalance = await tw.trx.getBalance(address);
      // 1 TRX = 1,000,000 SUN
      return (Number(sunBalance) / 1e6).toFixed(6);
    } catch (err) {
      throw new RpcError(
        'getBalance',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getTokenBalances(_address: string): Promise<TokenBalance[]> {
    // TRON не имеет нативного RPC для получения всех TRC-20 балансов.
    // Для полного списка нужен TronScan API.
    // Используйте getTrc20Balance() для конкретных токенов.
    return [];
  }

  async getTransaction(hash: string): Promise<TransactionInfo | null> {
    const tw = this.getTronWeb();

    try {
      const tx = await tw.trx.getTransaction(hash);
      if (!tx) return null;

      const info = await tw.trx.getTransactionInfo(hash);

      const contract = tx.raw_data?.contract?.[0];
      const params = contract?.parameter?.value as unknown as Record<string, unknown> | undefined;

      const from = params?.owner_address
        ? tw.address.fromHex(params.owner_address as string)
        : '';
      const to = params?.to_address
        ? tw.address.fromHex(params.to_address as string)
        : null;
      const amount = params?.amount ? Number(params.amount) / 1e6 : 0;

      return {
        hash,
        from,
        to,
        value: amount.toFixed(6),
        blockNumber: info.blockNumber ?? null,
        timestamp: info.blockTimeStamp ? Math.floor(info.blockTimeStamp / 1000) : null,
        status: tx.ret?.[0]?.contractRet === 'SUCCESS' ? 'confirmed' : 'failed',
        fee: info.fee ? (info.fee / 1e6).toFixed(6) : undefined,
      };
    } catch {
      return null;
    }
  }

  async getTransactionHistory(
    _address: string,
    _limit?: number,
  ): Promise<TransactionInfo[]> {
    // TronWeb не поддерживает историю через RPC.
    // Нужен TronGrid v1 API или TronScan API.
    logger.warn('getTransactionHistory for TRON requires TronGrid v1 / TronScan API.');
    return [];
  }

  async getGasPrice(): Promise<GasEstimate> {
    // TRON использует Bandwidth + Energy вместо газа.
    // Bandwidth: бесплатно ~1500 BP/день.
    // Energy: стейкинг TRX или burn TRX.
    return {
      slow: '1',
      standard: '1',
      fast: '1',
      unit: 'TRX (bandwidth model)',
    };
  }

  async getBlockHeight(): Promise<number> {
    const tw = this.getTronWeb();

    try {
      const block = await tw.trx.getCurrentBlock();
      return block.block_header?.raw_data?.number ?? 0;
    } catch (err) {
      throw new RpcError(
        'getCurrentBlock',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async generateTipTransaction(
    toAddress: string,
    amount: string,
  ): Promise<TipData> {
    this.validateAddress(toAddress);

    return {
      chain: 'TRON',
      toAddress,
      amount,
      currency: 'TRX',
      deepLink: `tron:${toAddress}?amount=${amount}`,
      qrData: `tron:${toAddress}?amount=${amount}`,
    };
  }

  // --- TRON-specific convenience methods ---

  async getTrc20Balance(
    contractAddress: string,
    walletAddress: string,
  ): Promise<TokenBalance> {
    const tw = this.getTronWeb();
    this.validateAddress(contractAddress);
    this.validateAddress(walletAddress);

    try {
      tw.setAddress(walletAddress);
      const contract = await tw.contract().at(contractAddress);

      const [symbol, decimals, balance] = await Promise.all([
        contract.symbol().call() as Promise<string>,
        contract.decimals().call() as Promise<number | bigint>,
        contract.balanceOf(walletAddress).call() as Promise<number | bigint>,
      ]);

      const dec = Number(decimals);
      const bal = Number(balance) / Math.pow(10, dec);

      return {
        symbol,
        decimals: dec,
        balance: bal.toFixed(dec),
        contractAddress,
      };
    } catch (err) {
      throw new RpcError(
        'getTrc20Balance',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getAccountResources(address: string): Promise<{
    bandwidth: { free: number; used: number };
    energy: { total: number; used: number };
  }> {
    const tw = this.getTronWeb();
    this.validateAddress(address);

    try {
      const resources = await tw.trx.getAccountResources(address);
      return {
        bandwidth: {
          free: (resources.freeNetLimit ?? 0) - (resources.freeNetUsed ?? 0),
          used: resources.freeNetUsed ?? 0,
        },
        energy: {
          total: resources.EnergyLimit ?? 0,
          used: resources.EnergyUsed ?? 0,
        },
      };
    } catch (err) {
      throw new RpcError(
        'getAccountResources',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
