import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/** Local UI access only. Replace with real authentication before connecting a server. */
@Injectable({ providedIn: 'root' })
export class PreviewSession {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly storageKey = 'trustyca.preview-session';
  private readonly active = signal(this.readSession());
  readonly isActive = this.active.asReadonly();

  login(): void {
    this.active.set(true);
    this.persist(true);
  }

  logout(): void {
    this.active.set(false);
    this.persist(false);
  }

  private readSession(): boolean {
    try {
      return this.window?.sessionStorage.getItem(this.storageKey) === 'active';
    } catch {
      return false;
    }
  }

  private persist(active: boolean): void {
    try {
      if (active) {
        this.window?.sessionStorage.setItem(this.storageKey, 'active');
      } else {
        this.window?.sessionStorage.removeItem(this.storageKey);
      }
    } catch {
      // Preview access still works in memory when browser storage is unavailable.
    }
  }
}
