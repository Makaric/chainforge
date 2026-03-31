import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TonProvider } from '../src/providers/ton/index.js';

describe('TonProvider', () => {
  describe('address validation', () => {
    const provider = new TonProvider();

    it('should validate EQ (bounceable) address', () => {
      expect(provider.isValidAddress('EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2')).toBe(true);
    });

    it('should validate raw address format', () => {
      expect(provider.isValidAddress('0:ed1691307050047117b998b561d8de82d31fbf84910ced6eb5fc92e7485ef8a7')).toBe(true);
    });

    it('should reject invalid', () => {
      expect(provider.isValidAddress('not-an-address')).toBe(false);
      expect(provider.isValidAddress('')).toBe(false);
      expect(provider.isValidAddress('0x1234')).toBe(false);
    });
  });

  describe('live RPC (mainnet)', () => {
    const provider = new TonProvider();

    beforeAll(async () => {
      await provider.connect('mainnet');
    }, 15000);

    afterAll(async () => {
      await provider.disconnect();
    });

    it('should be connected', () => {
      expect(provider.isConnected()).toBe(true);
    });

    it('should get block height (seqno)', async () => {
      const height = await provider.getBlockHeight();
      expect(height).toBeGreaterThan(0);
    }, 10000);

    it('should get native balance (may 429 without API key)', async () => {
      try {
        const balance = await provider.getNativeBalance(
          'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
        );
        expect(typeof balance).toBe('string');
        expect(Number(balance)).toBeGreaterThanOrEqual(0);
      } catch (err: any) {
        if (err.message?.includes('429')) return; // rate limit expected without API key
        throw err;
      }
    }, 10000);

    it('should get account state (may 429 without API key)', async () => {
      try {
        const state = await provider.getAccountState(
          'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
        );
        expect(['active', 'uninitialized', 'frozen']).toContain(state);
      } catch (err: any) {
        if (err.message?.includes('429')) return;
        throw err;
      }
    }, 10000);

    it('should generate tip transaction', async () => {
      const tip = await provider.generateTipTransaction(
        'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
        '1',
      );
      expect(tip.chain).toBe('TON');
      expect(tip.currency).toBe('TON');
      expect(tip.deepLink).toContain('ton://transfer/');
    });
  });
});
