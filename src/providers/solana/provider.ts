/**
 * SolanaProvider — read-only операции с Solana через @solana/web3.js.
 * Имплементирует IBlockchainProvider для ChainForge.
 */

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

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
  mainnet: 'https://api.mainnet-beta.solana.com',
  testnet: 'https://api.testnet.solana.com',
  devnet: 'https://api.devnet.solana.com',
};

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

export class SolanaProvider implements IBlockchainProvider {
  readonly name = 'Solana';

  private connection: Connection | null = null;
  private network: NetworkType = 'mainnet';

  async connect(network: NetworkType = 'mainnet', rpcUrl?: string): Promise<void> {
    this.network = network;
    const url = rpcUrl ?? RPC_URLS[network];

    try {
      this.connection = new Connection(url, 'confirmed');
      await this.connection.getSlot();
      logger.info(`[Solana] Connected to ${network}`, { rpcUrl: url });
    } catch (err) {
      this.connection = null;
      throw new ConnectionError(
        'Solana',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async disconnect(): Promise<void> {
    this.connection = null;
    logger.info(`[Solana] Disconnected`);
  }

  isConnected(): boolean {
    return this.connection !== null;
  }

  async getBlockHeight(): Promise<number> {
    const conn = this.ensureConnected();
    try {
      return await conn.getSlot();
    } catch (err) {
      throw new RpcError('getSlot', undefined, err instanceof Error ? err.message : String(err));
    }
  }

  private ensureConnected(): Connection {
    if (!this.connection) {
      throw new ConnectionError('Solana', 'Not connected. Call connect() first.');
    }
    return this.connection;
  }

  private toPublicKey(address: string): PublicKey {
    try {
      return new PublicKey(address);
    } catch {
      throw new InvalidAddressError(address, 'Solana');
    }
  }

  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  async getNativeBalance(address: string): Promise<string> {
    const conn = this.ensureConnected();
    const pubkey = this.toPublicKey(address);

    try {
      const lamports = await conn.getBalance(pubkey);
      return (lamports / LAMPORTS_PER_SOL).toFixed(9);
    } catch (err) {
      throw new RpcError(
        'getBalance',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getTokenBalances(address: string): Promise<TokenBalance[]> {
    const conn = this.ensureConnected();
    const pubkey = this.toPublicKey(address);

    try {
      const [splAccounts, token2022Accounts] = await Promise.all([
        conn.getParsedTokenAccountsByOwner(pubkey, { programId: TOKEN_PROGRAM_ID }),
        conn.getParsedTokenAccountsByOwner(pubkey, { programId: TOKEN_2022_PROGRAM_ID }),
      ]);

      const allAccounts = [...splAccounts.value, ...token2022Accounts.value];

      const results: TokenBalance[] = [];
      for (const account of allAccounts) {
        const parsed = account.account.data.parsed?.info;
        if (!parsed) continue;

        const amount = parsed.tokenAmount;
        if (!amount || amount.uiAmount === 0) continue;

        results.push({
          symbol: amount.uiAmountString ?? '0',
          balance: amount.uiAmountString ?? '0',
          decimals: amount.decimals ?? 0,
        });
      }
      return results;
    } catch (err) {
      throw new RpcError(
        'getTokenBalances',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getGasPrice(): Promise<GasEstimate> {
    const conn = this.ensureConnected();

    try {
      const fees = await conn.getRecentPrioritizationFees();
      const avgFee =
        fees.length > 0
          ? fees.reduce((sum, f) => sum + f.prioritizationFee, 0) / fees.length
          : 0;

      // Base fee is always 5000 lamports (0.000005 SOL) per signature
      const baseFee = 5000;

      return {
        slow: baseFee.toString(),
        standard: (baseFee + Math.round(avgFee * 0.5)).toString(),
        fast: (baseFee + Math.round(avgFee)).toString(),
        unit: 'lamports',
      };
    } catch (err) {
      throw new RpcError(
        'getRecentPrioritizationFees',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async generateTipTransaction(
    toAddress: string,
    amount: string,
  ): Promise<TipData> {
    if (!this.isValidAddress(toAddress)) {
      throw new InvalidAddressError(toAddress, 'Solana');
    }

    const deepLink = `solana:${toAddress}?amount=${amount}&message=Tip`;

    return {
      chain: this.name,
      toAddress,
      amount,
      currency: 'SOL',
      deepLink,
      qrData: deepLink,
    };
  }

  async getTransaction(hash: string): Promise<TransactionInfo | null> {
    const conn = this.ensureConnected();

    try {
      const tx = await conn.getTransaction(hash, { maxSupportedTransactionVersion: 0 });
      if (!tx) return null;

      const err = tx.meta?.err;
      const status = err ? 'failed' : 'confirmed';
      const fee = tx.meta?.fee ? (tx.meta.fee / LAMPORTS_PER_SOL).toFixed(9) : undefined;
      
      let from = '';
      let to = null;
      let value = '0';

      if (tx.transaction.message.staticAccountKeys.length > 0) {
        from = tx.transaction.message.staticAccountKeys[0].toBase58();
      }
      
      if (tx.meta?.preBalances && tx.meta?.postBalances) {
        const diff = tx.meta.preBalances[0] - tx.meta.postBalances[0] - (tx.meta.fee || 0);
        value = (Math.abs(diff) / LAMPORTS_PER_SOL).toFixed(9);
      }

      return {
        hash,
        from,
        to,
        value,
        blockNumber: tx.slot,
        timestamp: tx.blockTime || null,
        status,
        fee
      };
    } catch (err) {
      throw new RpcError('getTransaction', undefined, err instanceof Error ? err.message : String(err));
    }
  }
}
