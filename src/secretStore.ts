import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';

function getSecretsFilePath(): string {
  // Using userData rather than thredFolderPath because safeStorage is machine-local,
  // and we need to avoid a circular dependency with electron-store encryption.
  const configDir = path.join(app.getPath('userData'), 'Config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return path.join(configDir, 'secrets.json');
}

function readSecrets(): Record<string, string> {
  const filePath = getSecretsFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {

    return {};
  }
}

function writeSecrets(secrets: Record<string, string>) {
  const filePath = getSecretsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(secrets, null, 2), 'utf-8');
}

export function isAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function setSecret(name: string, value: string): boolean {
  if (!isAvailable()) {

    return false;
  }
  try {
    const encrypted = safeStorage.encryptString(value);
    const base64 = encrypted.toString('base64');
    const secrets = readSecrets();
    secrets[name] = base64;
    writeSecrets(secrets);
    return true;
  } catch (err) {

    return false;
  }
}

export function getSecret(name: string): string | null {
  if (!isAvailable()) return null;
  const secrets = readSecrets();
  const base64 = secrets[name];
  if (!base64) return null;
  
  try {
    const encrypted = Buffer.from(base64, 'base64');
    return safeStorage.decryptString(encrypted);
  } catch (err) {

    return null;
  }
}

