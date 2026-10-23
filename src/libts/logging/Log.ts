export type ILogCall = (...args: unknown[]) => void;

/** A log sink: the console, or any object with some of the ILog methods */
export type ILogTarget = Partial<Record<keyof ILog, ILogCall>>;

export interface ILog {
  debug: ILogCall;
  error: ILogCall;
  info: ILogCall;
  log: ILogCall;
  warn: ILogCall;
}

/**
 * No traces
 */
function logNoop(...args: unknown[]): void {} //eslint-disable-line

export class Log implements ILog {
  public debug: ILogCall;
  public error: ILogCall;
  public info: ILogCall;
  public log: ILogCall;
  public warn: ILogCall;

  constructor() {
    this.debug = this.error = this.info = this.log = this.warn = logNoop;
  }

  public to(target: ILogTarget) {
    this.debug = target.debug || logNoop;
    this.error = target.error || logNoop;
    this.info = target.info || logNoop;
    this.log = target.log || logNoop;
    this.warn = target.warn || logNoop;
  }
}

// Default global instance
export const log = new Log();
