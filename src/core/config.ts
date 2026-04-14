import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_PATH = path.join(os.homedir(), '.chainforgerc.json');

export interface ChainForgeConfig {
  defaultChain?: string;
  defaultNetwork?: string;
  rpcUrls?: Record<string, string>;
}

export function getConfig(): ChainForgeConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    return {};
  }
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

export function setConfig(newConfig: Partial<ChainForgeConfig>) {
  const current = getConfig();
  const updated = { ...current, ...newConfig };
  
  if (newConfig.rpcUrls) {
    updated.rpcUrls = { ...current.rpcUrls, ...newConfig.rpcUrls };
  }
  
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
}