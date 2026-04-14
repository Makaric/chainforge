import { describe, it, expect } from 'vitest';
import { TonProvider } from './provider.js';

describe('TonProvider (Офлайн логика)', () => {
  const provider = new TonProvider();

  // Используем raw-формат (0:...) — он всегда валиден, без CRC16 проблем
  const validRawAddress = '0:ed1691307050047117b998b561d8de82d31fbf84910ced6eb5fc92e7485ef8a7';

  it('должен корректно валидировать TON-адреса', () => {
    expect(provider.isValidAddress(validRawAddress)).toBe(true);
    expect(provider.isValidAddress('EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2')).toBe(true); // Base64 bounceable
    expect(provider.isValidAddress('DRiP2Pn2K6sEow1y7dD6eov8YxMvE4x7Z6N1mU7yP4m4')).toBe(false); // Адрес Solana
  });

  it('должен генерировать правильный TON deep link для донатов', async () => {
    const tipData = await provider.generateTipTransaction(
      validRawAddress,
      '1.5' // 1.5 TON
    );

    expect(tipData.chain).toBe('TON');
    expect(tipData.currency).toBe('TON');
    expect(tipData.toAddress).toBe('0:ed1691307050047117b998b561d8de82d31fbf84910ced6eb5fc92e7485ef8a7');
    // 1.5 TON = 1500000000 nanoTON
    expect(tipData.deepLink).toBe('ton://transfer/0:ed1691307050047117b998b561d8de82d31fbf84910ced6eb5fc92e7485ef8a7?amount=1500000000&text=Tip');
  });
});