import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createAppError } from '../../utils/errors';

const ENCRYPTED_PREFIX = 'enc:';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

const getIntegrationEncryptionKey = () => {
  const rawKey = process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim();

  if (!rawKey) {
    throw createAppError('Integrations encryption is not configured.', 500);
  }

  const key = Buffer.from(rawKey, 'base64');

  if (key.length !== KEY_BYTES) {
    throw createAppError(
      'INTEGRATIONS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.',
      500
    );
  }

  return key;
};

export const encryptIntegrationToken = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', getIntegrationEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
};

export const decryptIntegrationToken = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const [ivBase64, authTagBase64, ciphertextBase64] = value.slice(ENCRYPTED_PREFIX.length).split(':');

  if (!ivBase64 || !authTagBase64 || !ciphertextBase64) {
    throw createAppError('Stored integration credentials are invalid.', 500);
  }

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const ciphertext = Buffer.from(ciphertextBase64, 'base64');

  if (iv.length !== IV_BYTES || authTag.length !== TAG_BYTES || ciphertext.length === 0) {
    throw createAppError('Stored integration credentials are invalid.', 500);
  }

  const decipher = createDecipheriv('aes-256-gcm', getIntegrationEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    throw createAppError('Stored integration credentials could not be decrypted.', 500);
  }
};
