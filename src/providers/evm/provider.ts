/**
 * EVM Provider — единый провайдер для всех EVM-совместимых сетей.
 * Read-only. Без приватных ключей.
 */

import {
  createPublicClient,
  http,
  formatEther,
  parseEther,
  formatUnits,
  isAddress,
  getAddress,
  type PublicClient,
  type HttpTransport,
  type Chain,
} from 'viem';

import type {
  IEvmProvider,
  NetworkType,
  ChainInfo,
  TokenBalance,
  TransactionInfo,
  GasEstimate,
  TipData,
  EvmLogFilter,
  EvmLog,
} from '../../core/interfaces.js';
import {
  ConnectionError,
  InvalidAddressError,
  RpcError,
} from '../../core/errors.js';
import { logger } from '../../core/logger.js';
import { ERC20_ABI } from './abi.js';
import { EVM_CHAINS, type EvmChainConfig } from './chains.js';

export class EvmProvider implements IEvmProvider {
  readonly name: string;
  readonly chain: ChainInfo;

  private client: PublicClient<HttpTransport, Chain | undefined> | null = null;
  private config: EvmChainConfig;
  private network: NetworkType = 'mainnet';

  constructor(chainKey: string) {
    const config = EVM_CHAINS[chainKey];
    if (!config) {
      throw new Error(
        `Unknown EVM chain: ${chainKey}. Available: ${Object.keys(EVM_CHAINS).join(', ')}`,
      );
    }
    this.config = config;
    this.name = config.chain.name;
    this.chain = config.chain;
  }

  async connect(network: NetworkType = 'mainnet', rpcUrl?: string): Promise<void> {
    this.network = network;
    const url = rpcUrl ?? this.config.rpcUrls[network];

    try {
      this.client = createPublicClient({
        transport: http(url),
      });

      // Verify connection
      await this.client.getBlockNumber();
      logger.info(`Connected to ${this.name} (${network})`, { rpcUrl: url });
    } catch (err) {
      this.client = null;
      throw new ConnectionError(
        this.name,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    logger.info(`Disconnected from ${this.name}`);
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  private getClient(): PublicClient<HttpTransport, Chain | undefined> {
    if (!this.client) {
      throw new ConnectionError(this.name, 'Not connected. Call connect() first.');
    }
    return this.client;
  }

  private validateAddress(address: string): `0x${string}` {
    if (!isAddress(address)) {
      throw new InvalidAddressError(address, this.name);
    }
    return getAddress(address);
  }

  async getNativeBalance(address: string): Promise<string> {
    const client = this.getClient();
    const addr = this.validateAddress(address);

    try {
      const balance = await client.getBalance({ address: addr });
      return formatEther(balance);
    } catch (err) {
      throw new RpcError(
        'getBalance',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getTokenBalances(address: string): Promise<TokenBalance[]> {
    // EVM не имеет нативного способа получить все токены за один вызов.
    // Для полного списка нужен indexed API (Alchemy, Ankr).
    // Здесь возвращаем пустой массив — конкретные токены читаются через readContract.
    logger.warn(
      `getTokenBalances for EVM requires an indexed API. Use readContract() for specific tokens.`,
    );
    return [];
  }

  async getTransaction(hash: string): Promise<TransactionInfo | null> {
    const client = this.getClient();

    try {
      const tx = await client.getTransaction({
        hash: hash as `0x${string}`,
      });

      if (!tx) return null;

      let status: TransactionInfo['status'] = 'pending';
      let fee: string | undefined;
      let timestamp: number | null = null;

      if (tx.blockNumber) {
        const [receipt, block] = await Promise.all([
          client.getTransactionReceipt({ hash: hash as `0x${string}` }),
          client.getBlock({ blockNumber: tx.blockNumber }),
        ]);
        status = receipt.status === 'success' ? 'confirmed' : 'failed';
        fee = formatEther(receipt.gasUsed * receipt.effectiveGasPrice);
        timestamp = Number(block.timestamp);
      }

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: formatEther(tx.value),
        blockNumber: tx.blockNumber ? Number(tx.blockNumber) : null,
        timestamp,
        status,
        fee,
      };
    } catch (err) {
      throw new RpcError(
        'getTransaction',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getTransactionHistory(
    _address: string,
    _limit?: number,
  ): Promise<TransactionInfo[]> {
    // EVM RPC не поддерживает нативный запрос истории транзакций.
    // Требуется indexed API (Etherscan, Alchemy Enhanced API).
    logger.warn(
      'getTransactionHistory for EVM requires an indexed API (Etherscan, Alchemy).',
    );
    return [];
  }

  isValidAddress(address: string): boolean {
    return isAddress(address);
  }

  async getGasPrice(): Promise<GasEstimate> {
    const client = this.getClient();

    try {
      const feeData = await client.estimateFeesPerGas();
      const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n;
      const gweiValue = Number(gasPrice) / 1e9;

      return {
        slow: (gweiValue * 0.8).toFixed(2),
        standard: gweiValue.toFixed(2),
        fast: (gweiValue * 1.2).toFixed(2),
        unit: 'gwei',
      };
    } catch (err) {
      throw new RpcError(
        'getGasPrice',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getBlockHeight(): Promise<number> {
    const client = this.getClient();

    try {
      const height = await client.getBlockNumber();
      return Number(height);
    } catch (err) {
      throw new RpcError(
        'getBlockNumber',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async generateTipTransaction(
    toAddress: string,
    amount: string,
  ): Promise<TipData> {
    const addr = this.validateAddress(toAddress);
    const symbol = this.chain.nativeCurrency.symbol;

    // EIP-681 payment URI (value is in Wei)
    const weiValue = parseEther(amount).toString();
    const deepLink = `ethereum:${addr}@${this.chain.chainId}?value=${weiValue}`;

    return {
      chain: this.name,
      toAddress: addr,
      amount,
      currency: symbol,
      deepLink,
      qrData: deepLink,
    };
  }

  // --- IEvmProvider extended methods ---

  async readContract(
    contractAddress: string,
    abi: readonly unknown[],
    method: string,
    args: unknown[] = [],
  ): Promise<unknown> {
    const client = this.getClient();
    const addr = this.validateAddress(contractAddress);

    try {
      return await client.readContract({
        address: addr,
        abi: abi as readonly Record<string, unknown>[],
        functionName: method,
        args,
      });
    } catch (err) {
      throw new RpcError(
        `readContract(${method})`,
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getContractCode(address: string): Promise<string> {
    const client = this.getClient();
    const addr = this.validateAddress(address);

    try {
      const code = await client.getCode({ address: addr });
      return code ?? '0x';
    } catch (err) {
      throw new RpcError(
        'getCode',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async getLogs(filter: EvmLogFilter): Promise<EvmLog[]> {
    const client = this.getClient();

    try {
      const logs = await client.getLogs({
        address: filter.address as `0x${string}` | undefined,
        fromBlock: typeof filter.fromBlock === 'number' ? BigInt(filter.fromBlock) : undefined,
        toBlock: typeof filter.toBlock === 'number' ? BigInt(filter.toBlock) : undefined,
      });

      return logs.map((log) => ({
        address: log.address,
        topics: log.topics as string[],
        data: log.data,
        blockNumber: Number(log.blockNumber),
        transactionHash: log.transactionHash,
        logIndex: Number(log.logIndex),
      }));
    } catch (err) {
      throw new RpcError(
        'getLogs',
        undefined,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // --- Convenience methods ---

  async getErc20Info(contractAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  }> {
    const addr = this.validateAddress(contractAddress);

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      this.readContract(addr, ERC20_ABI, 'name') as Promise<string>,
      this.readContract(addr, ERC20_ABI, 'symbol') as Promise<string>,
      this.readContract(addr, ERC20_ABI, 'decimals') as Promise<number>,
      this.readContract(addr, ERC20_ABI, 'totalSupply') as Promise<bigint>,
    ]);

    return {
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: formatUnits(totalSupply, Number(decimals)),
    };
  }

  async getErc20TokenBalance(
    walletAddress: string,
    tokenAddress: string,
  ): Promise<TokenBalance> {
    const contract = this.validateAddress(tokenAddress);
    const wallet = this.validateAddress(walletAddress);

    const [symbol, decimals, balance] = await Promise.all([
      this.readContract(contract, ERC20_ABI, 'symbol') as Promise<string>,
      this.readContract(contract, ERC20_ABI, 'decimals') as Promise<number>,
      this.readContract(contract, ERC20_ABI, 'balanceOf', [wallet]) as Promise<bigint>,
    ]);

    return {
      symbol,
      decimals: Number(decimals),
      balance: formatUnits(balance, Number(decimals)),
      contractAddress: contract,
    };
  }
}
