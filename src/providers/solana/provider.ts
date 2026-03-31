/**
 * Solana Provider — read-only операции через @solana/web3.js.
 * Без приватных ключей.
 */

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  type ParsedTransactionWithMeta,
} from '@solana/web3.js';

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

const RPC_URLS: Record<NetworkType, string> = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  testnet: 'https://api.testnet.solana.com',
  devnet: 'https://api.devnet.solana.com',
};

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

export class SolanaProvider implements IBlockchainProvider {
  readonly name = 'Solana';
  readonly chain: ChainInfo = {
    name: 'Solana',
    family: 'solana',
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    explorerUrl: 'https://solscan.io',
  };

  private connection: Connection | null = null;

  async connect(network: NetworkType = 'mainnet', rpcUrl?: string): Promise<void> {
    const url = rpcUrl ?? RPC_URLS[network];

    try {
      this.connection = new Connection(url, 'confirmed');
      await this.connection.getSlot();
      logger.info(`Connected to Solana (${network})`, { rpcUrl: url });
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
    logger.info('Disconnected from Solana');
  }

  isConnected(): boolean {
    return this.connection !== null;
  }

  private getConnection(): Connection {
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
    const conn = this.getConnection();
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
    const conn = this.getConnection();
    const pubkey = this.toPublicKey(address);

    try {
      // Fetch from both Token Program and Token-2022
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
          symbol: parsed.mint,
          balance: amount.uiAmountString ?? '0',
          decimals: amount.decimals ?? 0,
          contractAddress: parsed.mint,
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

  async getTransaction(hash: string): Promise<TransactionInfo | null> {
    const conn = this.getConnection();

    try {
      const tx = await conn.getParsedTransaction(hash, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) return null;

      return parseSolanaTransaction(hash, tx);
    } catch {
      return null;
    }
  }

  async getTransactionHistory(
    address: string,
    limit: number = 20,
  ): Promise<TransactionInfo[]> {
    const conn = this.getConnection();
    const pubkey = this.toPublicKey(address);

    try {
      const signatures = await conn.getSignaturesForAddress(pubkey, { limit });

      return signatures.map((sig) => ({
        hash: sig.signature,
        from: address,
        to: null,
        value: '0',
        blockNumber: sig.slot,
        timestamp: sig.blockTime ?? null,
        status: sig.err ? 'failed' : 'confirmed',
      }));
    } catch (err) {
      throw new RpcError(
        'getSignaturesForAddress',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getGasPrice(): Promise<GasEstimate> {
    const conn = this.getConnection();

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

  async getBlockHeight(): Promise<number> {
    const conn = this.getConnection();

    try {
      return await conn.getSlot();
    } catch (err) {
      throw new RpcError(
        'getSlot',
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

    const lamports = Math.round(parseFloat(amount) * LAMPORTS_PER_SOL);
    const deepLink = `solana:${toAddress}?amount=${amount}`;

    return {
      chain: 'Solana',
      toAddress,
      amount,
      currency: 'SOL',
      deepLink,
      qrData: deepLink,
    };
  }
}

function parseSolanaTransaction(
  hash: string,
  tx: ParsedTransactionWithMeta,
): TransactionInfo {
  const accounts = tx.transaction.message.accountKeys;
  const from = accounts[0]?.pubkey.toBase58() ?? '';
  const to = accounts.length > 1 ? accounts[1]?.pubkey.toBase58() ?? null : null;

  const preBalance = tx.meta?.preBalances[0] ?? 0;
  const postBalance = tx.meta?.postBalances[0] ?? 0;
  const valueLamports = Math.abs(preBalance - postBalance);
  const fee = tx.meta?.fee ?? 0;

  return {
    hash,
    from,
    to,
    value: ((valueLamports - fee) / LAMPORTS_PER_SOL).toFixed(9),
    blockNumber: tx.slot,
    timestamp: tx.blockTime ?? null,
    status: tx.meta?.err ? 'failed' : 'confirmed',
    fee: (fee / LAMPORTS_PER_SOL).toFixed(9),
  };
}
