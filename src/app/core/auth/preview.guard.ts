import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { PreviewSession } from './preview-session';

export const previewGuard: CanActivateChildFn = (_route, state) =>
  inject(PreviewSession).isActive() ||
  inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
