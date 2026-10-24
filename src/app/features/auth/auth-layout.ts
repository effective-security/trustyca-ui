import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Brand } from '../../shared/brand/brand';
import { Icon } from '../../shared/icon/icon';

/**
 * The frame of the pages outside the console: the brand, the projected
 * content and the chain of trust illustration
 */
@Component({
  selector: 'app-auth-layout',
  imports: [Brand, Icon],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {}
