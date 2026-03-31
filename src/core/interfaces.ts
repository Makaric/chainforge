/**
 * ChainForge Core Interfaces
 *
 * Единые контракты для всех блокчейн-провайдеров.
 * Все операции READ-ONLY по умолчанию.
 */

export type NetworkType = 'mainnet' | 'testnet' | 'devnet';

export type ChainFamily =
  | 'evm'
  | 'solana'
  | 'bitcoin'
  | 'ton'
  | 'tron'
  | 'cosmos';

export interface ChainInfo {
  name: string;
  family: ChainFamily;
  chainId?: number | string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  explorerUrl?: string;
}

export interface TokenBalance {
  symbol: string;
  name?: string;
  balance: string;
  decimals: number;
  contractAddress?: string;
}

export interface TransactionInfo {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  blockNumber: number | null;
  timestamp: number | null;
  status: 'confirmed' | 'pending' | 'failed';
  fee?: string;
}

export interface GasEstimate {
  slow: string;
  standard: string;
  fast: string;
  unit: string;
}

export interface ContractAuditResult {
  address: string;
  verified: boolean;
  sourceAvailable: boolean;
  warnings: string[];
  risks: AuditRisk[];
}

export interface AuditRisk {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
}

export interface TipData {
  chain: string;
  toAddress: string;
  amount: string;
  currency: string;
  deepLink?: string;
  qrData?: string;
}

/**
 * Единый интерфейс для любого блокчейн-провайдера в ChainForge.
 * Все методы — read-only. Никаких приватных ключей.
 */
export interface IBlockchainProvider {
  readonly name: string;
  readonly chain: ChainInfo;

  connect(network: NetworkType, rpcUrl?: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  getNativeBalance(address: string): Promise<string>;
  getTokenBalances(address: string): Promise<TokenBalance[]>;
  getTransaction(hash: string): Promise<TransactionInfo | null>;
  getTransactionHistory(
    address: string,
    limit?: number,
  ): Promise<TransactionInfo[]>;

  isValidAddress(address: string): boolean;

  getGasPrice(): Promise<GasEstimate>;
  getBlockHeight(): Promise<number>;

  generateTipTransaction(
    toAddress: string,
    amount: string,
  ): Promise<TipData>;
}

/**
 * Расширенный интерфейс для EVM-совместимых сетей.
 */
export interface IEvmProvider extends IBlockchainProvider {
  readContract(
    contractAddress: string,
    abi: readonly unknown[],
    method: string,
    args?: unknown[],
  ): Promise<unknown>;

  getContractCode(address: string): Promise<string>;
  getLogs(filter: EvmLogFilter): Promise<EvmLog[]>;
}

export interface EvmLogFilter {
  address?: string;
  topics?: (string | null)[];
  fromBlock?: number | 'latest';
  toBlock?: number | 'latest';
}

export interface EvmLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}
