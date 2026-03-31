import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SolanaProvider } from '../src/providers/solana/index.js';

const TEST_WALLET = 'HxV7H5fkYdoXBv6PhaR538xcMqSQFD7hVbBWdb3H5CHF';

describe('SolanaProvider', () => {
  describe('address validation', () => {
    const provider = new SolanaProvider();

    it('should validate correct address', () => {
      expect(provider.isValidAddress(TEST_WALLET)).toBe(true);
    });

    it('should reject invalid', () => {
      expect(provider.isValidAddress('not-valid')).toBe(false);
      expect(provider.isValidAddress('')).toBe(false);
    });
  });

  describe('live RPC (devnet)', () => {
    const provider = new SolanaProvider();

    beforeAll(async () => {
      await provider.connect('devnet');
    }, 15000);

    afterAll(async () => {
      await provider.disconnect();
    });

    it('should be connected', () => {
      expect(provider.isConnected()).toBe(true);
    });

    it('should get block height (slot)', async () => {
      const height = await provider.getBlockHeight();
      expect(height).toBeGreaterThan(0);
    }, 10000);

    it('should get native balance', async () => {
      const balance = await provider.getNativeBalance(TEST_WALLET);
      expect(typeof balance).toBe('string');
      expect(Number(balance)).toBeGreaterThanOrEqual(0);
    }, 10000);

    it('should get gas (prioritization fees)', async () => {
      const gas = await provider.getGasPrice();
      expect(gas.unit).toBe('lamports');
    }, 10000);

    it('should generate tip transaction', async () => {
      const tip = await provider.generateTipTransaction(TEST_WALLET, '0.1');
      expect(tip.chain).toBe('Solana');
      expect(tip.currency).toBe('SOL');
      expect(tip.deepLink).toContain('solana:');
    });
  });
});
