import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { Project } from 'src/services/trustyca/protogen/orgs';
import { ItemStatus_Enum } from 'src/services/trustyca/protogen/types';
import { ORGS_SERVICE } from '../../core/api/tokens';
import { AuthStore } from '../../core/auth/auth.store';
import { TenantStore } from '../../core/tenant/tenant.store';
import { ConfirmService } from '../../shared/confirm-dialog/confirm-dialog';
import { ColumnDef } from '../../shared/data-table/column';
import { DataTable } from '../../shared/data-table/data-table';
import { Icon } from '../../shared/icon/icon';
import { NotifyService } from '../../shared/notify/notify';
import { Rfc3339DatePipe } from '../../shared/pipes/date.pipes';
import { EnumNamePipe } from '../../shared/pipes/enum-name.pipe';
import { StatusChip, itemStatusTone } from '../../shared/status-chip/status-chip';
import { ProjectDialog, ProjectDialogData } from './project-dialog';

/** The Projects tab: the list of the TenantStore, register, edit and delete for an Admin */
@Component({
  selector: 'app-org-projects',
  imports: [MatButtonModule, ColumnDef, DataTable, EnumNamePipe, Icon, Rfc3339DatePipe, StatusChip],
  templateUrl: './org-projects.html',
  styleUrl: './org.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgProjects {
  private readonly orgs = inject(ORGS_SERVICE);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotifyService);
  protected readonly session = inject(AuthStore);
  protected readonly tenant = inject(TenantStore);
  protected readonly rows = computed(() =>
    this.tenant.projects.hasValue() ? this.tenant.projects.value() : [],
  );
  protected readonly canRegister = computed(() => this.session.can('/pb.Orgs/RegisterProject'));
  protected readonly canUpdate = computed(() => this.session.can('/pb.Orgs/UpdateProject'));
  protected readonly canDelete = computed(() => this.session.can('/pb.Orgs/DeleteProject'));
  protected readonly hasActions = computed(() => this.canUpdate() || this.canDelete());
  protected readonly rowId = (p: Project): string => p.ID;
  protected readonly statusTone = itemStatusTone;
  protected readonly INACTIVE = ItemStatus_Enum.Inactive;

  protected async register(): Promise<void> {
    const created = await this.openDialog({ mode: 'create' });
    if (created) {
      this.tenant.invalidateProjects();
      this.notify.info(`Project ${created.Name || created.Alias} registered`);
    }
  }

  protected async edit(project: Project): Promise<void> {
    const updated = await this.openDialog({ mode: 'edit', project });
    if (updated) {
      this.tenant.invalidateProjects();
      this.notify.info(`Project ${updated.Name || updated.Alias} updated`);
    }
  }

  /** DeleteProject after a typed confirmation; a deleted selection goes back to all projects */
  protected async remove(project: Project): Promise<void> {
    const name = project.Name || project.Alias;
    const confirmed = await this.confirm.confirm({
      title: `Delete ${name}?`,
      message: `The project is deactivated and leaves the project selector. Its members, API keys, issuers and certificates can no longer be used through it.`,
      details: ['The server keeps the records for its audit trail; the console cannot undo this.'],
      typeToConfirm: project.Alias,
      confirmLabel: 'Delete project',
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await this.orgs.deleteProject({ ProjectID: project.ID });
      if (this.tenant.projectId() === project.ID) {
        this.tenant.selectProject('');
      }
      this.tenant.invalidateProjects();
      this.notify.info(`Project ${name} deleted`);
    } catch (err) {
      await this.notify.error(err, 'Could not delete the project');
    }
  }

  private openDialog(data: ProjectDialogData): Promise<Project | undefined> {
    const ref = this.dialog.open<ProjectDialog, ProjectDialogData, Project>(ProjectDialog, {
      data,
      width: '480px',
      maxWidth: 'calc(100vw - 32px)',
    });
    return firstValueFrom(ref.afterClosed());
  }
}
