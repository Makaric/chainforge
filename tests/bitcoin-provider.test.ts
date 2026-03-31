import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BitcoinProvider } from '../src/providers/bitcoin/index.js';

const TEST_WALLET = 'bc1q6gdlptzwhdqnrt2n96hjfws50seplkmmxurh3v';

describe('BitcoinProvider', () => {
  describe('address validation', () => {
    const provider = new BitcoinProvider();

    it('should validate P2WPKH (bech32)', () => {
      expect(provider.isValidAddress(TEST_WALLET)).toBe(true);
    });

    it('should validate P2PKH (legacy)', () => {
      expect(provider.isValidAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(true);
    });

    it('should reject invalid', () => {
      expect(provider.isValidAddress('not-an-address')).toBe(false);
      expect(provider.isValidAddress('')).toBe(false);
    });

    it('should detect address type', () => {
      expect(provider.getAddressType(TEST_WALLET)).toBe('p2wpkh');
      expect(provider.getAddressType('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe('p2pkh');
    });
  });

  describe('live API (mainnet)', () => {
    const provider = new BitcoinProvider();

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
      expect(height).toBeGreaterThan(800000);
    }, 10000);

    it('should get native balance', async () => {
      const balance = await provider.getNativeBalance(TEST_WALLET);
      expect(typeof balance).toBe('string');
      expect(Number(balance)).toBeGreaterThanOrEqual(0);
    }, 10000);

    it('should get fee estimates', async () => {
      const gas = await provider.getGasPrice();
      expect(gas.unit).toBe('sat/vB');
      expect(Number(gas.fast)).toBeGreaterThan(0);
    }, 10000);

    it('should get UTXOs', async () => {
      const utxos = await provider.getUtxos(TEST_WALLET);
      expect(Array.isArray(utxos)).toBe(true);
    }, 10000);

    it('should generate tip transaction', async () => {
      const tip = await provider.generateTipTransaction(TEST_WALLET, '0.001');
      expect(tip.chain).toBe('Bitcoin');
      expect(tip.currency).toBe('BTC');
      expect(tip.deepLink).toContain('bitcoin:');
    });
  });
});
