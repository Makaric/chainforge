import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CosmosProvider, COSMOS_CHAINS } from '../src/providers/cosmos/index.js';

describe('CosmosProvider', () => {
  describe('instantiation', () => {
    it('should create for known chain', () => {
      const provider = new CosmosProvider('cosmoshub');
      expect(provider.name).toBe('Cosmos Hub');
    });

    it('should throw for unknown chain', () => {
      expect(() => new CosmosProvider('nonexistent')).toThrow('Unknown Cosmos chain');
    });

    it('should list supported chains', () => {
      const chains = Object.keys(COSMOS_CHAINS);
      expect(chains).toContain('cosmoshub');
      expect(chains).toContain('osmosis');
      expect(chains).toContain('celestia');
      expect(chains).toContain('injective');
    });
  });

  describe('address validation', () => {
    const provider = new CosmosProvider('cosmoshub');

    it('should validate cosmos address', () => {
      expect(provider.isValidAddress('cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh')).toBe(true);
    });

    it('should reject wrong prefix', () => {
      expect(provider.isValidAddress('osmo1fl48vsnmsdzcv85q5d2q4z5ajdha8yu3x4mtrh')).toBe(false);
    });

    it('should reject invalid', () => {
      expect(provider.isValidAddress('not-valid')).toBe(false);
    });
  });

  describe('live RPC (mainnet)', () => {
    const provider = new CosmosProvider('cosmoshub');

    beforeAll(async () => {
      await provider.connect('mainnet');
    }, 20000);

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

    it('should get chain ID', async () => {
      const chainId = await provider.getChainId();
      expect(chainId).toBe('cosmoshub-4');
    }, 10000);

    it('should generate tip data', async () => {
      const tip = await provider.generateTipTransaction(
        'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh',
        '1',
      );
      expect(tip.chain).toBe('Cosmos Hub');
      expect(tip.currency).toBe('ATOM');
    });
  });
});
