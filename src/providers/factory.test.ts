import { describe, it, expect } from 'vitest';
import { ProviderFactory } from './factory.js';
import { EvmProvider } from './evm/index.js';
import { SolanaProvider } from './solana/provider.js';
import { TonProvider } from './ton/provider.js';

describe('ProviderFactory', () => {
  it('должна создавать EvmProvider для "ethereum"', () => {
    const provider = ProviderFactory.create('ethereum');
    expect(provider).toBeInstanceOf(EvmProvider);
    expect(provider.name).toBe('Ethereum');
  });

  it('должна создавать EvmProvider для "evm"', () => {
    const provider = ProviderFactory.create('evm');
    expect(provider).toBeInstanceOf(EvmProvider);
  });

  it('должна создавать SolanaProvider для "solana"', () => {
    const provider = ProviderFactory.create('solana');
    expect(provider).toBeInstanceOf(SolanaProvider);
    expect(provider.name).toBe('Solana');
  });

  it('должна создавать TonProvider для "ton"', () => {
    const provider = ProviderFactory.create('ton');
    expect(provider).toBeInstanceOf(TonProvider);
    expect(provider.name).toBe('TON');
  });

  it('должна выбрасывать ошибку для неизвестных сетей', () => {
    expect(() => ProviderFactory.create('unknown_chain')).toThrowError(/Неизвестная сеть/);
  });
});