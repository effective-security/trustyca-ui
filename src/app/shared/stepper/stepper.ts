import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Icon } from '../icon/icon';

export interface StepDef {
  readonly label: string;
  /** The form of the step; Next is refused while it is invalid */
  readonly control?: AbstractControl;
}

/**
 * The state of a linear stepper: the selected step, Next that marks the
 * step's form touched and stays while it is invalid, a step already passed
 * that can be reopened from the rail. The page renders the content of the
 * selected step; `app-stepper` renders the rail.
 *
 * Material's stepper is not used: its header imports `MatIcon`, whose
 * registry brings `HttpClient` into the initial bundle (18 kB) for icons
 * the console draws itself.
 */
export class StepperState {
  readonly selectedIndex = signal(0);

  constructor(readonly steps: readonly StepDef[]) {}

  get isLast(): boolean {
    return this.selectedIndex() === this.steps.length - 1;
  }

  /** Opens the next step; false when the current form refuses */
  next(): boolean {
    const current = this.steps[this.selectedIndex()];
    current.control?.markAllAsTouched();
    if (current.control?.invalid) {
      return false;
    }
    if (this.isLast) {
      return false;
    }
    this.selectedIndex.update((i) => i + 1);
    return true;
  }

  previous(): void {
    this.selectedIndex.update((i) => Math.max(0, i - 1));
  }

  /** Reopens a step already passed; a later one is reached with Next only */
  select(index: number): void {
    if (index >= 0 && index < this.selectedIndex()) {
      this.selectedIndex.set(index);
    }
  }

  reset(): void {
    this.selectedIndex.set(0);
  }
}

/** The rail of a linear stepper: the steps, the one open, the ones passed */
@Component({
  selector: 'app-stepper',
  imports: [Icon],
  template: `<ol class="stepper-rail" aria-label="Steps">
    @for (step of steps(); track step.label; let i = $index) {
      <li
        class="step"
        [class.active]="i === selectedIndex()"
        [class.done]="i < selectedIndex()"
        [attr.aria-current]="i === selectedIndex() ? 'step' : null"
      >
        <button
          type="button"
          class="step-header"
          [disabled]="i >= selectedIndex()"
          (click)="stepSelect.emit(i)"
        >
          <span class="step-index">
            @if (i < selectedIndex()) {
              <app-icon name="check" />
            } @else {
              {{ i + 1 }}
            }
          </span>
          <span class="step-label">{{ step.label }}</span>
        </button>
      </li>
    }
  </ol>`,
  styles: `
    :host {
      display: block;
    }
    .stepper-rail {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 4px;
    }
    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 8px 10px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--muted);
      font: inherit;
      font-size: 12px;
      text-align: left;
      cursor: default;
    }
    .step-header:not(:disabled) {
      cursor: pointer;
    }
    .step-header:not(:disabled):hover {
      background: #f6f8f3;
    }
    .step-index {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: white;
      font-size: 11px;
      font-weight: 600;
    }
    .step-index app-icon {
      width: 14px;
      height: 14px;
    }
    .step.active .step-header {
      color: var(--ink);
      font-weight: 600;
    }
    .step.active .step-index {
      background: #285745;
      border-color: #285745;
      color: white;
    }
    .step.done .step-header {
      color: var(--ink);
    }
    .step.done .step-index {
      background: #eaf5ec;
      border-color: #cfe3d2;
      color: #2a6a40;
    }
    @media (max-width: 800px) {
      .stepper-rail {
        grid-auto-flow: column;
        grid-auto-columns: max-content;
        overflow-x: auto;
      }
      .step-label {
        white-space: nowrap;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stepper {
  readonly steps = input.required<readonly StepDef[]>();
  readonly selectedIndex = input.required<number>();
  readonly stepSelect = output<number>();
}
