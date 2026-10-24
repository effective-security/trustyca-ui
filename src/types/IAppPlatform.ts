import { IPlatformInfo } from './IPlatformInfo';

/**
 * Represents a platform and device information on which the App is running
 */
export interface IAppPlatform extends IPlatformInfo {
  /**
   * Persisted DeviceId to identify Device/Browser
   */
  readonly deviceID: string;

  /**
   * Network connection status
   */
  isNetworkOnline: boolean;

  /**
   * Host, if the app is embedded
   */
  embeddingHost?: unknown;

  /**
   * the flags is set by the embedding host, to disable Navigation Bar, SSE, etc
   */
  isSinglePageView: boolean;

  /**
   * Open a Url using platform specific method
   *
   * @param url
   */
  openUrl(url: string): void;

  /**
   * Navigates the window to a URL outside the app, as the login does to
   * the authorize endpoint of the server
   *
   * @param url
   */
  redirect(url: string): void;

  /**
   * Replaces the address of the current history entry without a
   * navigation, as the auth landing does to drop the one-time code
   *
   * @param url
   */
  replaceHistoryUrl(url: string): void;
}
