import { ethers } from 'ethers';
import { IBlockchainProvider, NetworkType, TokenBalance, GasEstimate } from '../../core/interfaces.js';

export class EvmProvider implements IBlockchainProvider {
  public readonly name: string;
  private provider: ethers.JsonRpcProvider | null = null;
  private network: NetworkType = 'mainnet';

  constructor(name: string = 'EVM') {
    this.name = name;
  }

  public async connect(network: NetworkType, rpcUrl?: string): Promise<void> {
    this.network = network;
    if (!rpcUrl) {
      throw new Error('RPC URL is required for EvmProvider');
    }
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Выполняем тестовый запрос для проверки доступности узла
    await this.provider.getNetwork();
  }

  public async getNativeBalance(address: string): Promise<string> {
    this.ensureConnected();
    const balance = await this.provider!.getBalance(address);
    return ethers.formatEther(balance);
  }

  public async getTokenBalances(address: string): Promise<TokenBalance[]> {
    this.ensureConnected();
    // В базовой EVM-реализации сканирование всех ERC20 напрямую через RPC невозможно 
    // без знания адресов контрактов. Потребуется API-индексатор (например, Alchemy, Moralis).
    // TODO: Интегрировать поддержку индексаторов или принимать массив адресов контрактов.
    console.warn('[ChainForge] getTokenBalances requires an indexer API for EVM. Returning empty array.');
    return [];
  }

  public isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  public async getGasPrice(): Promise<GasEstimate> {
    this.ensureConnected();
    const feeData = await this.provider!.getFeeData();
    
    // Поддержка как EIP-1559, так и legacy сетей
    const baseGas = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n;
    
    // Примерная эвристика стоимости газа
    const slow = (baseGas * 90n) / 100n; // 0.9x
    const standard = baseGas;
    const fast = (baseGas * 120n) / 100n; // 1.2x

    return {
      slow: ethers.formatUnits(slow, 'gwei'),
      standard: ethers.formatUnits(standard, 'gwei'),
      fast: ethers.formatUnits(fast, 'gwei'),
      unit: 'gwei',
    };
  }

  public async generateTipTransaction(toAddress: string, amountStr: string): Promise<any> {
    if (!this.isValidAddress(toAddress)) {
      throw new Error('Invalid destination address');
    }
    // Генерируем EIP-681 URI (standard read-only link, отлично для QR кодов)
    const amountWei = ethers.parseEther(amountStr);
    const uri = `ethereum:${toAddress}?value=${amountWei.toString()}`;
    
    return {
      type: 'eip681',
      uri: uri,
      message: 'Отсканируйте QR-код или перейдите по ссылке, чтобы отправить чаевые.'
    };
  }

  private ensureConnected(): void {
    if (!this.provider) {
      throw new Error('Provider is not connected. Call connect() first.');
    }
  }
}