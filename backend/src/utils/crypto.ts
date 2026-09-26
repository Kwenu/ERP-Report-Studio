import crypto from 'crypto';
import { env } from '../config/env';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const key = Buffer.from(env.credentialsEncKey, 'hex');
  if (key.length !== 32) {
    throw new Error(
      'CREDENTIALS_ENC_KEY must be a 32-byte key encoded as 64 hex characters. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return key;
}

/** Encrypts a plain object (e.g. { password: "..." }) into a single opaque string. */
export function encryptSecret(payload: Record<string, unknown>): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join('.');
}

/** Reverses encryptSecret. Returns null if there is nothing to decrypt. */
export function decryptSecret(blob: string | null): Record<string, unknown> | null {
  if (!blob) return null;
  const [ivB64, tagB64, dataB64] = blob.split('.');
  if (!ivB64 || !tagB64 || !dataB64) return null;
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}
