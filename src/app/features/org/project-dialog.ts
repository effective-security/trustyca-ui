import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Project } from 'src/services/trustyca/protogen/orgs';
import { toUiError } from '../../core/api/errors';
import { ORGS_SERVICE } from '../../core/api/tokens';

export interface ProjectDialogData {
  readonly mode: 'create' | 'edit';
  /** The project to edit */
  readonly project?: Project;
}

/**
 * RegisterProject or UpdateProject; the server's refusal (an alias in use,
 * an inactive org) stays in the dialog next to the form. Closes with the
 * saved project.
 */
@Component({
  selector: 'app-project-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `<h2 mat-dialog-title>
      {{ data.mode === 'create' ? 'Register project' : 'Edit project' }}
    </h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="project-form">
        <mat-form-field appearance="outline">
          <mat-label>Alias</mat-label>
          <input
            matInput
            formControlName="Alias"
            required
            maxlength="64"
            autocomplete="off"
            spellcheck="false"
            [readonly]="data.mode === 'edit'"
          />
          @if (data.mode === 'create') {
            <mat-hint>A short identifier for the CLI and the API; it cannot change later.</mat-hint>
          }
          @if (form.controls.Alias.hasError('required')) {
            <mat-error>An alias is required.</mat-error>
          } @else if (form.controls.Alias.hasError('pattern')) {
            <mat-error>An alias has no spaces.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="Name" required maxlength="120" />
          @if (form.controls.Name.hasError('required')) {
            <mat-error>A name is required.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="Description" rows="3" maxlength="1000"></textarea>
        </mat-form-field>
        @if (failure()) {
          <p class="form-error" role="alert">{{ failure() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close [disabled]="saving()">Cancel</button>
        <button mat-flat-button type="submit" class="save-button" [disabled]="saving()">
          {{ saving() ? 'Saving…' : data.mode === 'create' ? 'Register' : 'Save' }}
        </button>
      </mat-dialog-actions>
    </form>`,
  styles: `
    .project-form {
      display: grid;
      gap: 10px;
      padding-top: 8px;
    }
    .form-error {
      margin: 0;
      font-size: 12px;
      color: #8a2f29;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDialog {
  protected readonly data = inject<ProjectDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ProjectDialog, Project>>(MatDialogRef);
  private readonly orgs = inject(ORGS_SERVICE);
  protected readonly saving = signal(false);
  protected readonly failure = signal('');
  protected readonly form = new FormGroup({
    Alias: new FormControl(this.data.project?.Alias ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(64), Validators.pattern(/^\S+$/)],
    }),
    Name: new FormControl(this.data.project?.Name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    Description: new FormControl(this.data.project?.Description ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
  });

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.failure.set('');
    const values = this.form.getRawValue();
    try {
      const project =
        this.data.mode === 'create'
          ? await this.orgs.registerProject(values)
          : await this.orgs.updateProject({
              ProjectID: this.data.project?.ID ?? '',
              Name: values.Name,
              Description: values.Description,
            });
      this.ref.close(project);
    } catch (err) {
      this.failure.set(toUiError(err).detail);
    } finally {
      this.saving.set(false);
    }
  }
}
