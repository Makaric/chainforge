export type NetworkType = 'mainnet' | 'testnet' | 'devnet';

export type ChainFamily =
  | 'evm'
  | 'solana'
  | 'bitcoin'
  | 'ton'
  | 'tron'
  | 'cosmos';

export interface TokenBalance {
  symbol: string;
  balance: string;
  decimals: number;
  contractAddress?: string;
}

export interface GasEstimate {
  slow: string;
  standard: string;
  fast: string;
  unit: string;
}

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

export interface TipData {
  chain: string;
  toAddress: string;
  amount: string;
  currency: string;
  deepLink?: string;
  qrData?: string;
}

export interface EvmLogFilter {
  address?: string;
  topics?: string[];
  fromBlock?: bigint;
  toBlock?: bigint;
}

export interface EvmLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

/**
 * Extended EVM provider interface
 */
export interface IEvmProvider extends IBlockchainProvider {
  getLogs(filter: EvmLogFilter): Promise<EvmLog[]>;
  getContractCode(address: string): Promise<string>;
  getErc20TokenBalance(walletAddress: string, tokenAddress: string): Promise<TokenBalance>;
}

/**
 * Extended TON provider interface
 */
export interface ITonProvider extends IBlockchainProvider {
  getJettonBalance(walletAddress: string, jettonMasterAddress: string): Promise<TokenBalance>;
}

/**
 * Единый интерфейс для любого блокчейн-провайдера в ChainForge
 */
export interface IBlockchainProvider {
  readonly name: string;

  connect(network: NetworkType, rpcUrl?: string): Promise<void>;

  getNativeBalance(address: string): Promise<string>;

  getTokenBalances(address: string): Promise<TokenBalance[]>;

  isValidAddress(address: string): boolean;

  getGasPrice(): Promise<GasEstimate>;

  generateTipTransaction(toAddress: string, amountStr: string): Promise<TipData>;

  getTransaction(hash: string): Promise<TransactionInfo | null>;
}