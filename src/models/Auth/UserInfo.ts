import { IUserInfo } from 'src/types/IUserInfo';

export class UserInfo implements IUserInfo {
  public static clone(from: IUserInfo): UserInfo {
    const copy = new UserInfo(
      from.ID,
      from.Name,
      from.Email,
      from.EmailVerified,
      from.Orgs,
      from.OrgID,
      from.OrgRole,
      from.OrgRoleSource,
    );
    return copy;
  }

  public static unauthenticated(): IUserInfo {
    return new UserInfo('', 'Unknown', '', false);
  }

  constructor(
    public ID: string,
    public Name: string,
    public Email: string,
    public EmailVerified: boolean,
    public Orgs?: Record<string, string>,
    public OrgID?: string,
    public OrgRole?: string,
    public OrgRoleSource?: string,
  ) {}
}
