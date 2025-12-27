import { randomBytes, createHash } from 'crypto';

export class TokenUtil {
  /**
   * Generate random token string
   * @param length - Length of the token in bytes (default: 32)
   * @returns Random token string in hex format
   */
  static generateToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Hash token using SHA256
   * @param token - Plain token string
   * @returns Hashed token string
   */
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate token and its hash
   * @param length - Length of the token in bytes (default: 32)
   * @returns Object containing plain token and hashed token
   */
  static generateTokenWithHash(length: number = 32): {
    token: string;
    hash: string;
  } {
    const token = this.generateToken(length);
    const hash = this.hashToken(token);
    return { token, hash };
  }

  /**
   * Verify if token matches hash
   * @param token - Plain token string
   * @param hash - Hashed token to compare
   * @returns True if token matches hash
   */
  static verifyToken(token: string, hash: string): boolean {
    const tokenHash = this.hashToken(token);
    return tokenHash === hash;
  }
}
