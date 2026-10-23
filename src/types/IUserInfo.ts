export interface IUserInfo {
  readonly ID: string;
  readonly Name: string;
  readonly Email: string;
  readonly EmailVerified: boolean;
  readonly Orgs?: Record<string, string>;
  readonly OrgID?: string;
  readonly OrgRole?: string;
}
