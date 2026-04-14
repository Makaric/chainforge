import { describe, it, expect } from 'vitest';
import { SolanaProvider } from './provider.js';

describe('SolanaProvider (Офлайн логика)', () => {
  const provider = new SolanaProvider();

  it('должен корректно валидировать Solana-адреса', () => {
    expect(provider.isValidAddress('DRiP2Pn2K6sEow1y7dD6eov8YxMvE4x7Z6N1mU7yP4m4')).toBe(true);
    expect(provider.isValidAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(false); // Адрес EVM
  });

  it('должен генерировать правильный Solana Pay URI для донатов', async () => {
    const tipData = await provider.generateTipTransaction(
      'DRiP2Pn2K6sEow1y7dD6eov8YxMvE4x7Z6N1mU7yP4m4',
      '0.5' // 0.5 SOL
    );
    
    expect(tipData.chain).toBe('Solana');
    expect(tipData.currency).toBe('SOL');
    expect(tipData.toAddress).toBe('DRiP2Pn2K6sEow1y7dD6eov8YxMvE4x7Z6N1mU7yP4m4');
    expect(tipData.deepLink).toBe('solana:DRiP2Pn2K6sEow1y7dD6eov8YxMvE4x7Z6N1mU7yP4m4?amount=0.5&message=Tip');
  });
});