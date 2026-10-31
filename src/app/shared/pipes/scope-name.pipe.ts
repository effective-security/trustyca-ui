import { Pipe, PipeTransform, inject } from '@angular/core';
import { TenantStore } from '../../core/tenant/tenant.store';

/**
 * 'Org-wide' for an empty ProjectID, else the project name from the
 * TenantStore. Impure: the name arrives when the project list loads.
 */
@Pipe({ name: 'scopeName', pure: false })
export class ScopeNamePipe implements PipeTransform {
  private readonly tenant = inject(TenantStore);

  transform(projectId: string | null | undefined): string {
    return this.tenant.scopeLabel(projectId ?? '');
  }
}
