/**
 * Represents a platform information on which the App is running
 */
export interface IPlatformInfo {
  /**
   * Browser's window
   */
  readonly window: Window;

  /**
   * The app version.
   */
  readonly appVersion: string;

  /**
   * Cordova app version (for embedded)
   */
  readonly cordovaVersion?: string;

  /**
   * Device information
   */
  readonly device?: unknown;

  /**
   * Is app running on localhost?
   */
  readonly isLocal: boolean;

  readonly isAndroid: boolean;

  readonly isCordova: boolean;

  readonly isEmbedded: boolean;

  readonly isiOS: boolean;

  readonly isOutlook: boolean;

  readonly userAgent: string;

  readonly locationHost: string;

  readonly locationUrl: string;
}
