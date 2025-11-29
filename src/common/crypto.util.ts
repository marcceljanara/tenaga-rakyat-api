import * as crypto from 'crypto';

const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64'); // 32 bytes
const ALGO = 'aes-256-gcm';

export class CryptoUtil {
  static encrypt(plainText: string): string {
    const iv = crypto.randomBytes(16); // 128-bit IV
    const cipher = crypto.createCipheriv(ALGO, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  static decrypt(cipherText: string): string {
    const data = Buffer.from(cipherText, 'base64');

    const iv = data.slice(0, 16);
    const tag = data.slice(16, 32);
    const encrypted = data.slice(32);

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
