/**
 * Cosmos Chain Definitions
 */

import type { ChainInfo, NetworkType } from '../../core/interfaces.js';

export interface CosmosChainConfig {
  chain: ChainInfo;
  bech32Prefix: string;
  rpcUrls: Record<NetworkType, string>;
  denom: string;
}

export const COSMOS_CHAINS: Record<string, CosmosChainConfig> = {
  cosmoshub: {
    chain: {
      name: 'Cosmos Hub',
      family: 'cosmos',
      chainId: 'cosmoshub-4',
      nativeCurrency: { name: 'Cosmos', symbol: 'ATOM', decimals: 6 },
      explorerUrl: 'https://www.mintscan.io/cosmos',
    },
    bech32Prefix: 'cosmos',
    denom: 'uatom',
    rpcUrls: {
      mainnet: 'https://cosmos-rpc.publicnode.com:443',
      testnet: 'https://rpc.sentry-01.theta-testnet.polypore.xyz',
      devnet: 'https://rpc.sentry-01.theta-testnet.polypore.xyz',
    },
  },
  osmosis: {
    chain: {
      name: 'Osmosis',
      family: 'cosmos',
      chainId: 'osmosis-1',
      nativeCurrency: { name: 'Osmosis', symbol: 'OSMO', decimals: 6 },
      explorerUrl: 'https://www.mintscan.io/osmosis',
    },
    bech32Prefix: 'osmo',
    denom: 'uosmo',
    rpcUrls: {
      mainnet: 'https://osmosis-rpc.publicnode.com:443',
      testnet: 'https://rpc.testnet.osmosis.zone',
      devnet: 'https://rpc.testnet.osmosis.zone',
    },
  },
  celestia: {
    chain: {
      name: 'Celestia',
      family: 'cosmos',
      chainId: 'celestia',
      nativeCurrency: { name: 'Celestia', symbol: 'TIA', decimals: 6 },
      explorerUrl: 'https://www.mintscan.io/celestia',
    },
    bech32Prefix: 'celestia',
    denom: 'utia',
    rpcUrls: {
      mainnet: 'https://celestia-rpc.publicnode.com:443',
      testnet: 'https://rpc-mocha.pops.one',
      devnet: 'https://rpc-mocha.pops.one',
    },
  },
  injective: {
    chain: {
      name: 'Injective',
      family: 'cosmos',
      chainId: 'injective-1',
      nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
      explorerUrl: 'https://explorer.injective.network',
    },
    bech32Prefix: 'inj',
    denom: 'inj',
    rpcUrls: {
      mainnet: 'https://injective-rpc.publicnode.com:443',
      testnet: 'https://testnet.sentry.tm.injective.network:443',
      devnet: 'https://testnet.sentry.tm.injective.network:443',
    },
  },
};
