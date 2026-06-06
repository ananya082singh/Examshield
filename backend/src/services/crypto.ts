import crypto from 'crypto';
import { MASTER_ENCRYPTION_KEY_RAW } from '../config';

// Derive a 32-byte key from the master encryption key configuration
const getEncryptionKey = (): Buffer => {
  return crypto.createHash('sha256').update(MASTER_ENCRYPTION_KEY_RAW).digest();
};

interface EncryptedResult {
  encryptedBuffer: Buffer;
  iv: string; // Hex representation
  tag: string; // Hex representation
}

/**
 * Encrypts a buffer using AES-256-GCM
 */
export const encryptBuffer = (buffer: Buffer): EncryptedResult => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 12-byte IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encryptedBuffer: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
};

/**
 * Decrypts a buffer using AES-256-GCM
 */
export const decryptBuffer = (
  encryptedBuffer: Buffer,
  ivHex: string,
  tagHex: string
): Buffer => {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
};

/**
 * Generates the SHA-256 hash of a buffer
 */
export const generateHash = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};
