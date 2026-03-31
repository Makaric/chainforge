import { describe, it, expect } from 'vitest';
import {
  generateTip,
  getTipOptions,
  formatTipMessage,
  formatAllTipOptions,
} from '../src/tools/tip-generator.js';

describe('TipGenerator', () => {
  it('should generate ETH tip with default amount', () => {
    const tip = generateTip('ETH');
    expect(tip.chain).toBe('Ethereum');
    expect(tip.currency).toBe('ETH');
    expect(tip.amount).toBe('0.001');
    expect(tip.toAddress).toBe('0x4A88CEA080F9A2e60324799EF91400d13aEE439a');
    expect(tip.deepLink).toContain('ethereum:');
  });

  it('should generate BTC tip with custom amount', () => {
    const tip = generateTip('bitcoin', '0.0005');
    expect(tip.chain).toBe('Bitcoin');
    expect(tip.currency).toBe('BTC');
    expect(tip.amount).toBe('0.0005');
    expect(tip.deepLink).toContain('bitcoin:');
    expect(tip.deepLink).toContain('amount=0.0005');
  });

  it('should generate SOL tip', () => {
    const tip = generateTip('SOL');
    expect(tip.currency).toBe('SOL');
    expect(tip.deepLink).toContain('solana:');
  });

  it('should generate TON tip', () => {
    const tip = generateTip('TON');
    expect(tip.currency).toBe('TON');
    expect(tip.deepLink).toContain('ton://transfer/');
  });

  it('should generate TRX tip', () => {
    const tip = generateTip('TRX');
    expect(tip.currency).toBe('TRX');
    expect(tip.toAddress).toBe('TMQyjfBgeMhFZQ6DnJxz12xQHY4tcGZgJe');
  });

  it('should match by chain name (case-insensitive)', () => {
    const tip = generateTip('Ethereum');
    expect(tip.currency).toBe('ETH');
  });

  it('should throw for unsupported chain', () => {
    expect(() => generateTip('dogecoin')).toThrow('Unsupported chain');
  });

  it('should return all tip options', () => {
    const options = getTipOptions();
    expect(options.length).toBeGreaterThanOrEqual(5);
    expect(options.find((o) => o.currency === 'ETH')).toBeDefined();
    expect(options.find((o) => o.currency === 'BTC')).toBeDefined();
  });

  it('should format tip message', () => {
    const tip = generateTip('ETH');
    const msg = formatTipMessage(tip);
    expect(msg).toContain('Ethereum');
    expect(msg).toContain('0.001');
    expect(msg).toContain('ETH');
  });

  it('should format all tip options', () => {
    const output = formatAllTipOptions();
    expect(output).toContain('ChainForge Tip');
    expect(output).toContain('ETH');
    expect(output).toContain('BTC');
    expect(output).toContain('voluntary');
  });
});
