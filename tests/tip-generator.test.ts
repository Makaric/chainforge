import { describe, it, expect } from 'vitest';
import { EvmProvider } from '../src/providers/evm/provider.js';
import { SolanaProvider } from '../src/providers/solana/provider.js';
import { TonProvider } from '../src/providers/ton/provider.js';

describe('TipGenerator', () => {
  // Donation addresses from QWEN.md
  const ETH_ADDRESS = '0x4A88CEA080F9A2e60324799EF91400d13aEE439a';
  const SOL_ADDRESS = 'DRiP2Pn2K6sEow1y7dD6eov8YxMvE4x7Z6N1mU7yP4m4';
  const TON_ADDRESS = '0:ed1691307050047117b998b561d8de82d31fbf84910ced6eb5fc92e7485ef8a7';

  it('should generate ETH tip URI', async () => {
    const provider = new EvmProvider('ethereum');
    const tipData = await provider.generateTipTransaction(ETH_ADDRESS, '0.001');

    expect(tipData.chain).toBe('Ethereum');
    expect(tipData.currency).toBe('ETH');
    expect(tipData.deepLink).toContain('ethereum:');
    expect(tipData.deepLink).toContain(ETH_ADDRESS);
    expect(tipData.deepLink).toContain('value=');
  });

  it('should generate SOL tip URI', async () => {
    const provider = new SolanaProvider();
    const tipData = await provider.generateTipTransaction(SOL_ADDRESS, '0.5');

    expect(tipData.chain).toBe('Solana');
    expect(tipData.currency).toBe('SOL');
    expect(tipData.deepLink).toContain('solana:');
    expect(tipData.deepLink).toContain(SOL_ADDRESS);
    expect(tipData.deepLink).toContain('amount=0.5');
  });

  it('should generate TON tip URI', async () => {
    const provider = new TonProvider();
    const tipData = await provider.generateTipTransaction(TON_ADDRESS, '1.5');

    expect(tipData.chain).toBe('TON');
    expect(tipData.currency).toBe('TON');
    expect(tipData.deepLink).toContain('ton://transfer/');
    expect(tipData.deepLink).toContain('amount=1500000000');
  });

  it('should throw for invalid address', async () => {
    const provider = new SolanaProvider();

    await expect(
      provider.generateTipTransaction('not-a-valid-address', '0.1')
    ).rejects.toThrow();
  });
});
