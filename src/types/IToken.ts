export interface IToken {
  readonly AccessToken: string;
  readonly TokenType?: string;
  readonly ExpiresAt?: Date;
  readonly IssuedAt?: Date;
  readonly Issuer?: string;
  readonly Audience?: string;
  readonly Provider?: string;

  hasExpired(): boolean;
}
