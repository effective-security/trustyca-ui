import { Injectable, computed, inject, resource, signal } from '@angular/core';
import { Issuer, IssuerStatus_Enum } from 'src/services/trustyca/protogen/pkix';
import { isCaUnavailable } from 'src/services/trustyca/rpc/errors';
import { toUiError } from '../../core/api/errors';
import { CA_SERVICE } from '../../core/api/tokens';
import { AuthStore } from '../../core/auth/auth.store';
import { TenantStore } from '../../core/tenant/tenant.store';

/**
 * The issuer of the details page and its tabs, provided on the route of
 * the page: one GetIssuer per ID and org, replaced by the answer of a
 * change, reloaded on demand
 */
@Injectable()
export class IssuerPage {
  private readonly ca = inject(CA_SERVICE);
  private readonly auth = inject(AuthStore);
  private readonly tenant = inject(TenantStore);
  private readonly id = signal('');

  readonly issuer = resource({
    params: () => {
      const id = this.id();
      const orgId = this.auth.orgId();
      return id && orgId ? { id, orgId } : undefined;
    },
    loader: async ({ params }) => {
      const issuer = await this.ca.getIssuer({ ID: params.id });
      this.remember(issuer);
      return issuer;
    },
  });

  /** The issuer, once loaded */
  readonly current = computed(() => (this.issuer.hasValue() ? this.issuer.value() : undefined));
  readonly unavailable = computed(() => isCaUnavailable(this.issuer.error()));
  readonly notFound = computed(() => {
    const err = this.issuer.error();
    return err !== undefined && toUiError(err).kind === 'not-found';
  });

  /** The actions the status allows (the server's transitions: Active, Archived, Destroyed) */
  readonly canActivate = computed(
    () =>
      this.current()?.Status === IssuerStatus_Enum.Pending &&
      this.auth.can('/pb.CA/ActivateIssuer'),
  );
  readonly canArchive = computed(
    () =>
      this.current()?.Status === IssuerStatus_Enum.Active && this.auth.can('/pb.CA/UpdateIssuer'),
  );
  readonly canDestroy = computed(
    () =>
      this.current()?.Status === IssuerStatus_Enum.Archived && this.auth.can('/pb.CA/UpdateIssuer'),
  );
  readonly canConfigure = computed(() => this.auth.can('/pb.CA/UpdateIssuer'));

  /** Shows the issuer of the route */
  select(id: string): void {
    this.id.set(id);
  }

  reload(): void {
    this.issuer.reload();
  }

  /** Replaces the issuer with the answer of a change */
  updated(issuer: Issuer): void {
    this.issuer.set(issuer);
    this.remember(issuer);
  }

  /**
   * The ProjectID of a change request (BE-5): the project of the issuer,
   * the scope a project Admin is authorized at; '' for an org-wide issuer
   */
  scopeOf(issuer: Issuer): string {
    return issuer.ProjectID;
  }

  private remember(issuer: Issuer): void {
    if (issuer.SKID) {
      this.tenant.rememberIssuerLabels([[issuer.SKID, issuer.Label]]);
    }
  }
}
