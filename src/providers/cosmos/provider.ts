/**
 * Cosmos Provider — read-only через CosmJS StargateClient.
 * Единый провайдер для всех Cosmos SDK чейнов.
 */

import { StargateClient, type IndexedTx } from '@cosmjs/stargate';
import { fromBech32 } from '@cosmjs/encoding';

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
import { COSMOS_CHAINS, type CosmosChainConfig } from './chains.js';

export class CosmosProvider implements IBlockchainProvider {
  readonly name: string;
  readonly chain: ChainInfo;

  private client: StargateClient | null = null;
  private config: CosmosChainConfig;

  constructor(chainKey: string) {
    const config = COSMOS_CHAINS[chainKey];
    if (!config) {
      throw new Error(
        `Unknown Cosmos chain: ${chainKey}. Available: ${Object.keys(COSMOS_CHAINS).join(', ')}`,
      );
    }
    this.config = config;
    this.name = config.chain.name;
    this.chain = config.chain;
  }

  async connect(network: NetworkType = 'mainnet', rpcUrl?: string): Promise<void> {
    const url = rpcUrl ?? this.config.rpcUrls[network];

    try {
      this.client = await StargateClient.connect(url);
      const height = await this.client.getHeight();
      logger.info(`Connected to ${this.name} (${network}) at block ${height}`, { rpcUrl: url });
    } catch (err) {
      this.client = null;
      throw new ConnectionError(
        this.name,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
    logger.info(`Disconnected from ${this.name}`);
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  private getClient(): StargateClient {
    if (!this.client) {
      throw new ConnectionError(this.name, 'Not connected. Call connect() first.');
    }
    return this.client;
  }

  isValidAddress(address: string): boolean {
    try {
      const { prefix } = fromBech32(address);
      return prefix === this.config.bech32Prefix;
    } catch {
      return false;
    }
  }

  private validateAddress(address: string): string {
    if (!this.isValidAddress(address)) {
      throw new InvalidAddressError(address, this.name);
    }
    return address;
  }

  async getNativeBalance(address: string): Promise<string> {
    const client = this.getClient();
    this.validateAddress(address);

    try {
      const coin = await client.getBalance(address, this.config.denom);
      const decimals = this.chain.nativeCurrency.decimals;
      const amount = Number(coin.amount) / Math.pow(10, decimals);
      return amount.toFixed(decimals);
    } catch (err) {
      throw new RpcError(
        'getBalance',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getTokenBalances(address: string): Promise<TokenBalance[]> {
    const client = this.getClient();
    this.validateAddress(address);

    try {
      const balances = await client.getAllBalances(address);

      return balances
        .filter((b) => b.denom !== this.config.denom)
        .map((b) => {
          // IBC denoms start with "ibc/"
          const isIbc = b.denom.startsWith('ibc/');
          return {
            symbol: b.denom,
            balance: b.amount,
            decimals: 6, // default for most Cosmos tokens
            contractAddress: isIbc ? b.denom : undefined,
          };
        });
    } catch (err) {
      throw new RpcError(
        'getAllBalances',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getTransaction(hash: string): Promise<TransactionInfo | null> {
    const client = this.getClient();

    try {
      const tx = await client.getTx(hash);
      if (!tx) return null;

      // Pass chain config to parser to correctly format amounts
      const decimals = this.chain.nativeCurrency.decimals;

      return cosmTxToInfo(tx, decimals);
    } catch {
      return null;
    }
  }

  async getTransactionHistory(
    address: string,
    limit: number = 20,
  ): Promise<TransactionInfo[]> {
    const client = this.getClient();
    this.validateAddress(address);

    try {
      const txs = await client.searchTx(`message.sender='${address}'`);
      const decimals = this.chain.nativeCurrency.decimals;

      return txs.slice(0, limit).map((tx) => cosmTxToInfo(tx, decimals));
    } catch (err) {
      throw new RpcError(
        'searchTx',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getGasPrice(): Promise<GasEstimate> {
    // Cosmos gas prices are chain-specific and set by validators.
    // Typical range for Cosmos Hub.
    return {
      slow: '0.01',
      standard: '0.025',
      fast: '0.04',
      unit: `u${this.chain.nativeCurrency.symbol.toLowerCase()}`,
    };
  }

  async getBlockHeight(): Promise<number> {
    const client = this.getClient();

    try {
      return await client.getHeight();
    } catch (err) {
      throw new RpcError(
        'getHeight',
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
    const symbol = this.chain.nativeCurrency.symbol;

    return {
      chain: this.name,
      toAddress,
      amount,
      currency: symbol,
      qrData: `${this.config.bech32Prefix}:${toAddress}?amount=${amount}${this.config.denom}`,
      deepLink: `${this.config.bech32Prefix}:${toAddress}?amount=${amount}${this.config.denom}`,
    };
  }

  // --- Cosmos-specific methods ---

  async getDelegations(address: string): Promise<Array<{
    validator: string;
    amount: string;
  }>> {
    const client = this.getClient();
    this.validateAddress(address);

    try {
      const { delegationResponses } = await (client as any).staking?.delegatorDelegations?.(address) ?? { delegationResponses: [] };

      // Fallback: use base StargateClient.getDelegation if available
      // StargateClient has limited staking queries; for full support use QueryClient extensions
      return delegationResponses?.map((d: any) => ({
        validator: d.delegation?.validatorAddress ?? '',
        amount: d.balance?.amount ?? '0',
      })) ?? [];
    } catch {
      logger.warn('getDelegations requires QueryClient with staking extension.');
      return [];
    }
  }

  async getChainId(): Promise<string> {
    const client = this.getClient();
    return client.getChainId();
  }
}

function cosmTxToInfo(tx: IndexedTx, decimals: number = 6): TransactionInfo {
  let from = '';
  let to: string | null = null;
  let value = '0';

  // Parse from tx.events (available on IndexedTx; tx.tx is raw Uint8Array)
  try {
    for (const event of tx.events) {
      if (event.type === 'transfer') {
        for (const attr of event.attributes) {
          if (attr.key === 'sender') from = attr.value;
          if (attr.key === 'recipient') to = attr.value;
          if (attr.key === 'amount') {
            const match = attr.value.match(/^(\d+)/);
            if (match) {
              value = (Number(match[1]) / Math.pow(10, decimals)).toFixed(decimals);
            }
          }
        }
        break; // Use first transfer event
      }
    }
  } catch {
    // Events parsing is best-effort
  }

  return {
    hash: tx.hash,
    from,
    to,
    value,
    blockNumber: tx.height,
    timestamp: null,
    status: tx.code === 0 ? 'confirmed' : 'failed',
    fee: tx.gasWanted?.toString(),
  };
}
