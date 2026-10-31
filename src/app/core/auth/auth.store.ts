import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { log } from 'src/libts/logging';
import type { CallerScope } from 'src/services/trustyca/protogen/auth';
import { Org, Role_Enum } from 'src/services/trustyca/protogen/orgs';
import { IAppUser, IToken, IUserInfo } from 'src/types';
import { APP_USER, AUTH_SERVICE, ORGS_SERVICE, STORAGE } from '../api/tokens';
import { HOME_ROUTE, safeReturnUrl } from './return-url';

/** A minute before the token expires the session counts as expired */
export const EXPIRY_MARGIN_MS = 60_000;
/** The longest delay setTimeout accepts */
const MAX_TIMER_MS = 2 ** 31 - 1;

interface AuthState {
  readonly token: IToken;
  readonly profile: IUserInfo;
  readonly isAuthenticated: boolean;
  readonly orgId: string;
  readonly projectId: string;
  readonly sessionExpired: boolean;
}

interface SessionLoad {
  readonly orgId: string;
  readonly promise: Promise<CallerScope>;
}

/**
 * True when the caller has a role in the org, at org scope or in a
 * project: without one the console has nothing to show (`/auth/norole`)
 */
export function hasConsoleRole(scope: CallerScope): boolean {
  return scope.Role !== Role_Enum.None || Object.keys(scope.ProjectRoles).length > 0;
}

function snapshot(user: IAppUser): AuthState {
  return {
    token: user.token,
    profile: user.profile,
    isAuthenticated: user.isAuthenticated,
    orgId: user.orgId,
    projectId: user.projectId,
    sessionExpired: user.sessionExpired,
  };
}

/**
 * The session as signals over AppUser: the user, the selected org and its
 * caller scope, `can(method)` for the templates, the expiry timer and the
 * sign-in and sign-out sequences
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly user = inject(APP_USER);
  private readonly auth = inject(AUTH_SERVICE);
  private readonly orgs = inject(ORGS_SERVICE);
  private readonly storage = inject(STORAGE);
  private readonly router = inject(Router);

  private readonly state = signal<AuthState>(snapshot(this.user));
  private readonly scope = signal<CallerScope | undefined>(undefined);
  private readonly currentOrg = signal<Org | undefined>(undefined);
  private sessionLoad?: SessionLoad;
  private expiryTimer?: ReturnType<typeof setTimeout>;

  readonly profile = computed(() => this.state().profile);
  readonly token = computed(() => this.state().token);
  readonly isAuthenticated = computed(() => this.state().isAuthenticated);
  readonly orgId = computed(() => this.state().orgId);
  readonly orgRole = computed(() => this.state().profile.OrgRole || '');
  readonly projectId = computed(() => this.state().projectId);
  readonly sessionExpired = computed(() => this.state().sessionExpired);
  /** The caller scope of the selected org, once loadSession resolved */
  readonly callerScope = this.scope.asReadonly();
  /** The selected org, once loadSession resolved */
  readonly org = this.currentOrg.asReadonly();

  private readonly allowedMethods = computed(
    () => new Set((this.scope()?.Methods ?? []).filter((m) => m.Allowed).map((m) => m.Method)),
  );

  constructor() {
    const unsubscribe = this.user.subscribe((u) => this.onUserChange(u));
    inject(DestroyRef).onDestroy(() => {
      unsubscribe();
      clearTimeout(this.expiryTimer);
    });
    this.scheduleExpiry();
  }

  /**
   * True when the caller scope allows the method at org scope, by its full
   * name (`/pb.CA/RegisterIssuer`). The server checks every call again:
   * this only hides what would be refused.
   */
  can(method: string): boolean {
    return this.allowedMethods().has(method);
  }

  /** Loads the caller scope and the org of the selected org, once per org */
  loadSession(): Promise<CallerScope> {
    const orgId = this.user.orgId;
    if (this.sessionLoad?.orgId !== orgId) {
      const promise: Promise<CallerScope> = Promise.all([
        this.auth.getCallerScope(),
        // the org names the shell only: a failure leaves the name out
        orgId ? this.orgs.getOrg().catch(() => undefined) : Promise.resolve(undefined),
      ]).then(([scope, org]) => {
        // a sign-out or an org switch replaced this load: its answer is
        // the scope of a session that is gone, even for the same org
        if (this.sessionLoad?.promise === promise) {
          this.scope.set(scope);
          this.currentOrg.set(org);
        }
        return scope;
      });
      promise.catch(() => {
        if (this.sessionLoad?.promise === promise) {
          this.sessionLoad = undefined;
        }
      });
      this.sessionLoad = { orgId, promise };
    }
    return this.sessionLoad.promise;
  }

  /**
   * Decides where a user with a fresh token goes: to pick an org, to the
   * no-org or no-role notice, or to the page requested before the sign-in
   */
  async completeSignIn(): Promise<string> {
    if (!this.user.orgId) {
      return this.noOrgRoute();
    }
    if (!hasConsoleRole(await this.loadSession())) {
      return '/auth/norole';
    }
    return safeReturnUrl(this.storage.useAfterAuthRoute()) || HOME_ROUTE;
  }

  /** The route of a user without a selected org */
  async noOrgRoute(): Promise<string> {
    const res = await this.orgs.getUserOrgs();
    return res.Orgs.length > 0 ? '/auth/select-org' : '/auth/noorg';
  }

  /** Switches the session to the org; the caller scope reloads for it */
  async selectOrg(orgId: string): Promise<void> {
    await this.auth.selectOrg(orgId, this.storage.getRememberUser());
  }

  /**
   * Switches the session to the org and returns the route to open: the page
   * requested before the sign-in, the home, or the notice of an org without
   * a role
   */
  async switchOrg(orgId: string): Promise<string> {
    await this.selectOrg(orgId);
    return this.completeSignIn();
  }

  /** Replaces the org of the shell after a change of its name or description */
  orgUpdated(org: Org): void {
    if (org.ID === this.user.orgId) {
      this.currentOrg.set(org);
    }
  }

  /** Reads the org again, for a shell whose first read failed */
  async refreshOrg(): Promise<Org> {
    const org = await this.orgs.getOrg();
    this.orgUpdated(org);
    return org;
  }

  /**
   * Revokes the token of the session, whatever the outcome forgets the
   * user, and opens the login page
   */
  async signOut(): Promise<void> {
    if (this.user.isAuthenticated) {
      try {
        await this.auth.revokeToken();
      } catch (err) {
        log.warn('AuthStore: revokeToken failed', err);
      }
    }
    this.user.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private onUserChange(user: IAppUser): void {
    const next = snapshot(user);
    if (next.orgId !== this.state().orgId || !next.isAuthenticated) {
      this.scope.set(undefined);
      this.currentOrg.set(undefined);
      this.sessionLoad = undefined;
    }
    this.state.set(next);
    this.scheduleExpiry();
  }

  private scheduleExpiry(): void {
    clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
    const expiresAt = this.user.token.ExpiresAt?.getTime();
    if (!this.user.isAuthenticated || !expiresAt) {
      return;
    }
    const delay = Math.max(0, expiresAt - Date.now() - EXPIRY_MARGIN_MS);
    this.expiryTimer = setTimeout(
      () => {
        if (
          this.user.token.ExpiresAt &&
          this.user.token.ExpiresAt.getTime() - Date.now() <= EXPIRY_MARGIN_MS
        ) {
          this.user.logout(true);
        } else {
          this.scheduleExpiry();
        }
      },
      Math.min(delay, MAX_TIMER_MS),
    );
  }
}
