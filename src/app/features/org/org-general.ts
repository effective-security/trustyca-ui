import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { ItemStatus_Enum } from 'src/services/trustyca/protogen/types';
import { toUiError } from '../../core/api/errors';
import { ORGS_SERVICE } from '../../core/api/tokens';
import { AuthStore } from '../../core/auth/auth.store';
import { ConfirmService } from '../../shared/confirm-dialog/confirm-dialog';
import { Icon } from '../../shared/icon/icon';
import { KvItem, KvList } from '../../shared/kv-list/kv-list';
import { NotifyService } from '../../shared/notify/notify';
import { enumName } from '../../shared/pipes/enum-name.pipe';
import { formatTime } from '../../shared/pipes/time';
import { StatusChip, itemStatusTone } from '../../shared/status-chip/status-chip';

/** The General tab: the org as the members see it, UpdateOrg for an Admin, DeleteOrg for an Owner */
@Component({
  selector: 'app-org-general',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    Icon,
    KvList,
    StatusChip,
  ],
  templateUrl: './org-general.html',
  styleUrl: './org.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgGeneral {
  private readonly orgs = inject(ORGS_SERVICE);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmService);
  protected readonly session = inject(AuthStore);
  protected readonly org = this.session.org;
  /** True while the session still loads the org; false when the read failed */
  protected readonly loading = computed(() => !this.org() && !this.session.callerScope());
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly failure = signal('');
  protected readonly form = new FormGroup({
    Name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    Description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
  });
  protected readonly items = computed<KvItem[]>(() => {
    const org = this.org();
    return org
      ? [
          { key: 'Name', value: org.Name },
          { key: 'Alias', value: org.Alias, mono: true },
          { key: 'ID', value: org.ID, mono: true },
          { key: 'Description', value: org.Description, empty: 'No description' },
          { key: 'Created', value: formatTime(org.CreatedAt) },
        ]
      : [];
  });
  protected readonly statusLabel = computed(() => enumName('ItemStatus', this.org()?.Status));
  protected readonly statusTone = computed(() =>
    itemStatusTone(this.org()?.Status ?? ItemStatus_Enum.Unknown),
  );
  protected readonly canUpdate = computed(() => this.session.can('/pb.Orgs/UpdateOrg'));
  protected readonly canDelete = computed(() => this.session.can('/pb.Orgs/DeleteOrg'));

  protected edit(): void {
    const org = this.org();
    if (org) {
      this.form.reset({ Name: org.Name, Description: org.Description });
      this.failure.set('');
      this.editing.set(true);
    }
  }

  protected cancel(): void {
    this.editing.set(false);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.failure.set('');
    try {
      const org = await this.orgs.updateOrg(this.form.getRawValue());
      this.session.orgUpdated(org);
      this.editing.set(false);
      this.notify.info('Organization updated');
    } catch (err) {
      this.failure.set(toUiError(err).detail);
    } finally {
      this.saving.set(false);
    }
  }

  protected async reload(): Promise<void> {
    this.refreshing.set(true);
    try {
      await this.session.refreshOrg();
    } catch (err) {
      await this.notify.error(err, 'Could not load the organization');
    } finally {
      this.refreshing.set(false);
    }
  }

  /** DeleteOrg after a typed confirmation; the user then picks another org */
  protected async remove(): Promise<void> {
    const org = this.org();
    if (!org) {
      return;
    }
    const name = org.Name || org.Alias;
    const confirmed = await this.confirm.confirm({
      title: `Delete ${name}?`,
      message: `The organization is deactivated. Its members lose access to it, and its projects, API keys, issuers and certificates can no longer be used from the console.`,
      details: [
        'The server keeps the records for its audit trail; the console cannot undo this.',
        'You will be asked to choose another organization.',
      ],
      typeToConfirm: org.Alias,
      confirmLabel: 'Delete organization',
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await this.orgs.deleteOrg();
      this.notify.info(`${name} was deleted`);
      await this.router.navigateByUrl('/auth/select-org');
    } catch (err) {
      await this.notify.error(err, 'Could not delete the organization');
    }
  }
}
