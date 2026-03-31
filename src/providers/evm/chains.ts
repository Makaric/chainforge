/**
 * EVM Chain Definitions
 * Маппинг поддерживаемых EVM-совместимых сетей.
 */

import type { ChainInfo, NetworkType } from '../../core/interfaces.js';

export interface EvmChainConfig {
  chain: ChainInfo;
  rpcUrls: Record<NetworkType, string>;
}

export const EVM_CHAINS: Record<string, EvmChainConfig> = {
  ethereum: {
    chain: {
      name: 'Ethereum',
      family: 'evm',
      chainId: 1,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      explorerUrl: 'https://etherscan.io',
    },
    rpcUrls: {
      mainnet: 'https://ethereum-rpc.publicnode.com',
      testnet: 'https://ethereum-sepolia-rpc.publicnode.com',
      devnet: 'https://ethereum-sepolia-rpc.publicnode.com',
    },
  },
  bsc: {
    chain: {
      name: 'BNB Smart Chain',
      family: 'evm',
      chainId: 56,
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
      explorerUrl: 'https://bscscan.com',
    },
    rpcUrls: {
      mainnet: 'https://bsc-rpc.publicnode.com',
      testnet: 'https://bsc-testnet-rpc.publicnode.com',
      devnet: 'https://bsc-testnet-rpc.publicnode.com',
    },
  },
  polygon: {
    chain: {
      name: 'Polygon',
      family: 'evm',
      chainId: 137,
      nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
      explorerUrl: 'https://polygonscan.com',
    },
    rpcUrls: {
      mainnet: 'https://polygon-bor-rpc.publicnode.com',
      testnet: 'https://polygon-amoy-bor-rpc.publicnode.com',
      devnet: 'https://polygon-amoy-bor-rpc.publicnode.com',
    },
  },
  arbitrum: {
    chain: {
      name: 'Arbitrum One',
      family: 'evm',
      chainId: 42161,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      explorerUrl: 'https://arbiscan.io',
    },
    rpcUrls: {
      mainnet: 'https://arbitrum-one-rpc.publicnode.com',
      testnet: 'https://arbitrum-sepolia-rpc.publicnode.com',
      devnet: 'https://arbitrum-sepolia-rpc.publicnode.com',
    },
  },
  optimism: {
    chain: {
      name: 'Optimism',
      family: 'evm',
      chainId: 10,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      explorerUrl: 'https://optimistic.etherscan.io',
    },
    rpcUrls: {
      mainnet: 'https://optimism-rpc.publicnode.com',
      testnet: 'https://optimism-sepolia-rpc.publicnode.com',
      devnet: 'https://optimism-sepolia-rpc.publicnode.com',
    },
  },
  avalanche: {
    chain: {
      name: 'Avalanche C-Chain',
      family: 'evm',
      chainId: 43114,
      nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
      explorerUrl: 'https://snowscan.xyz',
    },
    rpcUrls: {
      mainnet: 'https://avalanche-c-chain-rpc.publicnode.com',
      testnet: 'https://avalanche-fuji-c-chain-rpc.publicnode.com',
      devnet: 'https://avalanche-fuji-c-chain-rpc.publicnode.com',
    },
  },
};
