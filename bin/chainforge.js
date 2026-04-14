#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Делегируем выполнение npx tsx для прозрачной работы с TypeScript "на лету"
const result = spawnSync('npx', ['tsx', join(__dirname, '../src/cli.ts'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true // Обязательно для корректного поиска npx в Windows
});

process.exit(result.status ?? 0);
