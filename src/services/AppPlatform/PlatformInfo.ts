import { log } from 'src/libts/logging';
import { isObject } from 'src/libts/is';
import { startsWith } from 'src/libts/strings';
import { IPlatformInfo } from 'src/types';

interface CordovaWindow {
  cordova?: unknown;
  Cordova?: unknown;
  device?: unknown;
}

export class PlatformInfo implements IPlatformInfo {
  public readonly cordovaVersion?: string;
  public readonly device?: unknown;
  public readonly isLocal: boolean;
  public readonly isAndroid: boolean;
  public readonly isCordova: boolean;
  public readonly isEmbedded: boolean;
  public readonly isiOS: boolean;
  public readonly isOutlook: boolean;
  public readonly userAgent: string;
  public readonly locationHost: string;
  public readonly locationUrl: string;

  constructor(
    public readonly appVersion: string,
    public readonly window: Window,
  ) {
    const host = window as Window & CordovaWindow;
    const cordova = host.cordova || host.Cordova;
    let userAgent = '';

    if (window.location) {
      userAgent = window.navigator.userAgent.toLowerCase();
      this.locationHost = window.location.hostname.toLowerCase();
      this.locationUrl = window.location.protocol + '//' + window.location.hostname;
      const port = window.location.port;
      if (port !== '' && port !== '80' && port !== '443') {
        this.locationUrl += ':' + port;
      }
    } else {
      this.locationHost = '';
      this.locationUrl = '';
    }

    this.userAgent = userAgent;
    this.isOutlook = userAgent.indexOf('outlook') !== -1;
    this.isAndroid = userAgent.indexOf('android') !== -1;
    this.isiOS = /(ipad|iphone|ipod)/i.test(userAgent);
    this.isCordova = isObject(cordova);
    this.isEmbedded = this.isOutlook;
    this.device = host.device || {};

    /**
     * Is app running on localhost?
     */
    this.isLocal =
      startsWith(this.locationHost, 'localhost') ||
      startsWith(this.locationHost, '192.168.') ||
      startsWith(this.locationHost, '127.');

    log.info(`location=${this.locationUrl}, isLocal=${this.isLocal}`);
  }
}
