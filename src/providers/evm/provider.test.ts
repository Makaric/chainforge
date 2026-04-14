import { describe, it, expect } from 'vitest';
import { EvmProvider } from './provider.js';

describe('EvmProvider (Офлайн логика)', () => {
  const provider = new EvmProvider('ethereum');

  it('должен корректно валидировать EVM-адреса', () => {
    expect(provider.isValidAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(true);
    expect(provider.isValidAddress('0xInvalidAddress')).toBe(false);
    expect(provider.isValidAddress('EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2')).toBe(false); // Адрес TON
  });

  it('должен генерировать правильный EIP-681 URI для донатов', async () => {
    const tipData = await provider.generateTipTransaction(
      '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      '0.05' // 0.05 ETH
    );
    
    expect(tipData.chain).toBe('Ethereum');
    expect(tipData.currency).toBe('ETH');
    expect(tipData.toAddress).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    expect(tipData.deepLink).toBe('ethereum:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@1?value=50000000000000000');
  });
});