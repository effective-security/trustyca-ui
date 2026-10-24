export interface IUserInfo {
  readonly ID: string;
  readonly Name: string;
  readonly Email: string;
  readonly EmailVerified: boolean;
  /** Maps the IDs of the orgs the user can select to the resolved role */
  readonly Orgs?: Record<string, string>;
  /** The org selected in the token */
  readonly OrgID?: string;
  /** The resolved role in the selected org */
  readonly OrgRole?: string;
  /** `direct` for an org-wide grant, `project` for a Viewer derived from project grants */
  readonly OrgRoleSource?: string;
}
