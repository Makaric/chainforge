/**
 * Tip Generator — voluntary donation system for ChainForge.
 *
 * Generates read-only payment links and QR data for each supported chain.
 * No private keys, no signing, no hidden fees.
 * User copies the link or scans QR in their own wallet.
 */

import type { TipData, ChainFamily } from '../core/interfaces.js';

/** Immutable creator wallet addresses */
const CREATOR_WALLETS: Record<string, string> = {
  ETH: '0x4A88CEA080F9A2e60324799EF91400d13aEE439a',
  BTC: 'bc1q6gdlptzwhdqnrt2n96hjfws50seplkmmxurh3v',
  SOL: 'HxV7H5fkYdoXBv6PhaR538xcMqSQFD7hVbBWdb3H5CHF',
  TRX: 'TMQyjfBgeMhFZQ6DnJxz12xQHY4tcGZgJe',
} as const;

/** Suggested tip amounts per chain (in native currency) */
const DEFAULT_AMOUNTS: Record<string, string> = {
  ETH: '0.001',
  BTC: '0.0001',
  SOL: '0.1',
  TON: '1',
  TRX: '10',
  ATOM: '0.5',
};

interface TipOption {
  chain: string;
  family: ChainFamily;
  currency: string;
  address: string;
  suggestedAmount: string;
}

const TIP_OPTIONS: TipOption[] = [
  { chain: 'Ethereum', family: 'evm', currency: 'ETH', address: CREATOR_WALLETS.ETH, suggestedAmount: DEFAULT_AMOUNTS.ETH },
  { chain: 'BSC', family: 'evm', currency: 'BNB', address: CREATOR_WALLETS.ETH, suggestedAmount: '0.005' },
  { chain: 'Polygon', family: 'evm', currency: 'POL', address: CREATOR_WALLETS.ETH, suggestedAmount: '1' },
  { chain: 'Bitcoin', family: 'bitcoin', currency: 'BTC', address: CREATOR_WALLETS.BTC, suggestedAmount: DEFAULT_AMOUNTS.BTC },
  { chain: 'Solana', family: 'solana', currency: 'SOL', address: CREATOR_WALLETS.SOL, suggestedAmount: DEFAULT_AMOUNTS.SOL },
  { chain: 'TON', family: 'ton', currency: 'TON', address: CREATOR_WALLETS.ETH, suggestedAmount: DEFAULT_AMOUNTS.TON },
  { chain: 'TRON', family: 'tron', currency: 'TRX', address: CREATOR_WALLETS.TRX, suggestedAmount: DEFAULT_AMOUNTS.TRX },
];

/**
 * Generate a deep link for tipping on a specific chain.
 * Returns read-only data — no signing involved.
 */
export function generateTip(chain: string, amount?: string): TipData {
  const option = TIP_OPTIONS.find(
    (o) => o.chain.toLowerCase() === chain.toLowerCase() || o.currency.toLowerCase() === chain.toLowerCase(),
  );

  if (!option) {
    throw new Error(
      `Unsupported chain for tips: ${chain}. Supported: ${TIP_OPTIONS.map((o) => o.currency).join(', ')}`,
    );
  }

  const tipAmount = amount ?? option.suggestedAmount;
  const deepLink = buildDeepLink(option, tipAmount);

  return {
    chain: option.chain,
    toAddress: option.address,
    amount: tipAmount,
    currency: option.currency,
    deepLink,
    qrData: deepLink,
  };
}

/**
 * Get all available tip options with suggested amounts.
 */
export function getTipOptions(): TipOption[] {
  return [...TIP_OPTIONS];
}

/**
 * Format a human-readable tip message.
 */
export function formatTipMessage(tip: TipData): string {
  const lines = [
    `Chain: ${tip.chain}`,
    `Amount: ${tip.amount} ${tip.currency}`,
    `Address: ${tip.toAddress}`,
  ];

  if (tip.deepLink) {
    lines.push(`Link: ${tip.deepLink}`);
  }

  return lines.join('\n');
}

/**
 * Format all available tip options as a readable list.
 */
export function formatAllTipOptions(): string {
  const header = 'ChainForge Tip — Support the Creator\n';
  const separator = '─'.repeat(40);

  const options = TIP_OPTIONS.map(
    (o) => `  ${o.currency.padEnd(5)} │ ${o.suggestedAmount.padEnd(8)} │ ${o.address}`,
  );

  return [
    header,
    separator,
    '  Chain │ Amount   │ Address',
    separator,
    ...options,
    separator,
    '',
    'Copy an address or use the /tip <chain> command to generate a payment link.',
    'All donations are voluntary. Thank you!',
  ].join('\n');
}

function buildDeepLink(option: TipOption, amount: string): string {
  switch (option.family) {
    case 'evm':
      // EIP-681 payment URI
      return `ethereum:${option.address}?value=${parseFloat(amount) * 1e18}`;

    case 'bitcoin':
      // BIP-21 URI
      return `bitcoin:${option.address}?amount=${amount}`;

    case 'solana':
      // Solana Pay URI
      return `solana:${option.address}?amount=${amount}`;

    case 'ton':
      // TON transfer deep link
      return `ton://transfer/${option.address}?amount=${Math.round(parseFloat(amount) * 1e9)}`;

    case 'tron':
      // TRON doesn't have a standard URI scheme; use raw address
      return `tron:${option.address}?amount=${amount}`;

    case 'cosmos':
      return `cosmos:${option.address}?amount=${amount}`;

    default:
      return option.address;
  }
}
