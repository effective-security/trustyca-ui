import { log } from 'src/libts/logging';
import { IToken } from 'src/types/IToken';

export class Token implements IToken {
  public static clone(from: IToken): IToken {
    return new Token(
      from.AccessToken,
      from.TokenType,
      from.ExpiresAt,
      from.IssuedAt,
      from.Issuer,
      from.Audience,
      from.Provider,
    );
  }

  public static unauthenticated(): IToken {
    return new Token('');
  }

  public ExpiresAt?: Date;
  public IssuedAt?: Date;

  /**
   * expiresAt and issuedAt accept a Date or an RFC 3339 string, as the
   * server returns them, and are kept as Dates.
   */
  constructor(
    public AccessToken: string,
    public TokenType?: string,
    expiresAt?: Date | string,
    issuedAt?: Date | string,
    public Issuer?: string,
    public Audience?: string,
    public Provider?: string,
  ) {
    if (expiresAt) {
      this.ExpiresAt = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
      if (this.ExpiresAt.getTime() < Date.now()) {
        log.info(`token_expired_at=${this.ExpiresAt.toISOString()}`);
      }
    }
    if (issuedAt) {
      this.IssuedAt = issuedAt instanceof Date ? issuedAt : new Date(issuedAt);
    }
  }

  public hasExpired(): boolean {
    if (this.TokenType === 'cookie') {
      return !this.ExpiresAt || this.ExpiresAt.getTime() < Date.now();
    }
    return !this.AccessToken || !this.ExpiresAt || this.ExpiresAt.getTime() < Date.now();
  }
}
