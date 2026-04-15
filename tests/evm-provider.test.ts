import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EvmProvider, EVM_CHAINS } from '../src/providers/evm/index.js';

// VoidNomad's test wallet (read-only)
const TEST_WALLET = '0x4A88CEA080F9A2e60324799EF91400d13aEE439a';
// USDT on Ethereum
const USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

describe('EvmProvider', () => {
  describe('instantiation', () => {
    it('should create provider for known chain', () => {
      const provider = new EvmProvider('ethereum');
      expect(provider.name).toBe('Ethereum');
      expect(provider.chain.family).toBe('evm');
      expect(provider.chain.chainId).toBe(1);
    });

    it('should throw for unknown chain', () => {
      expect(() => new EvmProvider('nonexistent')).toThrow('Unknown EVM chain');
    });

    it('should list all supported EVM chains', () => {
      const chains = Object.keys(EVM_CHAINS);
      expect(chains).toContain('ethereum');
      expect(chains).toContain('bsc');
      expect(chains).toContain('polygon');
      expect(chains).toContain('arbitrum');
      expect(chains).toContain('optimism');
      expect(chains).toContain('avalanche');
    });
  });

  describe('address validation', () => {
    const provider = new EvmProvider('ethereum');

    it('should validate correct addresses', () => {
      expect(provider.isValidAddress(TEST_WALLET)).toBe(true);
      expect(provider.isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(provider.isValidAddress('not-an-address')).toBe(false);
      expect(provider.isValidAddress('0x123')).toBe(false);
      expect(provider.isValidAddress('')).toBe(false);
    });
  });

  describe('connection', () => {
    const provider = new EvmProvider('ethereum');

    it('should not be connected initially', () => {
      expect(provider.isConnected()).toBe(false);
    });

    it('should throw when calling methods without connection', async () => {
      await expect(provider.getNativeBalance(TEST_WALLET)).rejects.toThrow('Not connected');
    });
  });

  describe('live RPC (mainnet)', () => {
    const provider = new EvmProvider('ethereum');

    beforeAll(async () => {
      await provider.connect('mainnet');
    }, 15000);

    afterAll(async () => {
      await provider.disconnect();
    });

    it('should be connected', () => {
      expect(provider.isConnected()).toBe(true);
    });

    it('should get block height', async () => {
      const height = await provider.getBlockHeight();
      expect(height).toBeGreaterThan(0);
    }, 10000);

    it('should get native balance', async () => {
      const balance = await provider.getNativeBalance(TEST_WALLET);
      expect(typeof balance).toBe('string');
      expect(Number(balance)).toBeGreaterThanOrEqual(0);
    }, 10000);

    it('should get gas price', async () => {
      const gas = await provider.getGasPrice();
      expect(gas.unit).toBe('gwei');
      expect(Number(gas.standard)).toBeGreaterThan(0);
    }, 10000);

    it('should check contract code exists', async () => {
      const code = await provider.getContractCode(USDT_CONTRACT);
      expect(code).not.toBe('0x');
      expect(code.length).toBeGreaterThan(2);
    }, 10000);

    it('should read ERC-20 token info', async () => {
      const info = await provider.getErc20Info(USDT_CONTRACT);
      expect(info.symbol).toBe('USDT');
      expect(info.name).toBe('Tether USD');
      expect(info.decimals).toBe(6);
    }, 15000);

    it('should read ERC-20 balance', async () => {
      const token = await provider.getErc20TokenBalance(TEST_WALLET, USDT_CONTRACT);
      expect(token.symbol).toBe('USDT');
      expect(token.decimals).toBe(6);
      expect(typeof token.balance).toBe('string');
    }, 15000);

    it('should generate tip transaction', async () => {
      const tip = await provider.generateTipTransaction(TEST_WALLET, '0.01');
      expect(tip.chain).toBe('Ethereum');
      expect(tip.currency).toBe('ETH');
      expect(tip.deepLink).toContain('ethereum:');
      expect(tip.deepLink).toContain('@1'); // chainId
    });
  });
});
