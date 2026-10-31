import { FormControl, ValidatorFn } from '@angular/forms';

/** A text control that is never null: '' when empty */
export function textControl(value = '', validators: ValidatorFn[] = []): FormControl<string> {
  return new FormControl(value, { nonNullable: true, validators });
}
