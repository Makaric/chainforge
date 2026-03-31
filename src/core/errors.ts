/**
 * ChainForge Custom Errors
 */

export class ChainForgeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ChainForgeError';
  }
}

export class ConnectionError extends ChainForgeError {
  constructor(chain: string, details?: string) {
    super(
      `Failed to connect to ${chain}${details ? `: ${details}` : ''}`,
      'CONNECTION_ERROR',
    );
    this.name = 'ConnectionError';
  }
}

export class InvalidAddressError extends ChainForgeError {
  constructor(address: string, chain: string) {
    super(
      `Invalid ${chain} address: ${address}`,
      'INVALID_ADDRESS',
    );
    this.name = 'InvalidAddressError';
  }
}

export class RpcError extends ChainForgeError {
  constructor(
    method: string,
    public readonly rpcCode?: number,
    details?: string,
  ) {
    super(
      `RPC call failed: ${method}${details ? ` — ${details}` : ''}`,
      'RPC_ERROR',
    );
    this.name = 'RpcError';
  }
}

export class RateLimitError extends ChainForgeError {
  constructor(
    provider: string,
    public readonly retryAfterMs?: number,
  ) {
    super(
      `Rate limited by ${provider}${retryAfterMs ? `, retry after ${retryAfterMs}ms` : ''}`,
      'RATE_LIMIT',
    );
    this.name = 'RateLimitError';
  }
}

export class ContractNotVerifiedError extends ChainForgeError {
  constructor(address: string) {
    super(
      `Contract at ${address} is not verified — proceed with caution`,
      'CONTRACT_NOT_VERIFIED',
    );
    this.name = 'ContractNotVerifiedError';
  }
}
