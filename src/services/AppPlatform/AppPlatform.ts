import { toJson } from 'src/libts/json';
import { StorageService } from 'src/services/storage';
import { IAppPlatform, IPlatformInfo } from 'src/types';

export class AppPlatformService implements IAppPlatform {
  public readonly window: Window;
  public readonly appVersion: string;
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

  public readonly deviceID: string;
  public isNetworkOnline: boolean;
  public embeddingHost?: unknown;
  public isSinglePageView: boolean;

  constructor(
    public readonly storage: StorageService,
    platform: IPlatformInfo,
  ) {
    this.window = platform.window;
    this.appVersion = platform.appVersion;
    this.cordovaVersion = platform.cordovaVersion;
    this.userAgent = platform.userAgent;
    this.locationHost = platform.locationHost;
    this.locationUrl = platform.locationUrl;
    this.isLocal = platform.isLocal;
    this.isOutlook = platform.isOutlook;
    this.isAndroid = platform.isAndroid;
    this.isiOS = platform.isiOS;
    this.isCordova = platform.isCordova;
    this.isEmbedded = platform.isEmbedded;
    this.device = platform.device;

    this.isSinglePageView = false;
    this.isNetworkOnline = true;
    this.embeddingHost = null;
    this.deviceID = storage.getDeviceId();
  }

  public toString(): string {
    return toJson(
      {
        appVersion: this.appVersion,
        isSinglePageView: this.isSinglePageView,
        userAgent: this.userAgent,
        isOutlook: this.isOutlook,
        isAndroid: this.isAndroid,
        isiOS: this.isiOS,
        isCordova: this.isCordova,
        isEmbedded: this.isEmbedded,
        deviceID: this.deviceID,
      },
      2,
    );
  }

  public openUrl(url: string): void {
    if (this.isCordova) {
      this.window.open(url, '_system', 'location=yes');
    } else {
      this.window.open(url, '_blank', 'noopener');
    }
  }

  public redirect(url: string): void {
    this.window.location.assign(url);
  }

  public replaceHistoryUrl(url: string): void {
    this.window.history.replaceState(this.window.history.state, '', url);
  }
}
