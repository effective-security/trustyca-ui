import { vi } from 'vitest';
import { Log } from './Log';

describe('Log', () => {
  let log: Log;

  beforeEach(() => {
    log = new Log();
  });

  it('should initialize with noop functions', () => {
    expect(log.debug).toBeInstanceOf(Function);
    expect(log.error).toBeInstanceOf(Function);
    expect(log.info).toBeInstanceOf(Function);
    expect(log.log).toBeInstanceOf(Function);
    expect(log.warn).toBeInstanceOf(Function);
  });

  it('should set log functions to target functions', () => {
    const target = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
    };

    log.to(target);

    log.error('error message');
    log.info('info message');
    log.log('log message');
    log.warn('warn message');

    expect(target.error).toHaveBeenCalledWith('error message');
    expect(target.info).toHaveBeenCalledWith('info message');
    expect(target.log).toHaveBeenCalledWith('log message');
    expect(target.warn).toHaveBeenCalledWith('warn message');
  });

  it('should fallback to noop if target function is not provided', () => {
    const target = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };

    log.to(target);

    log.error('error message');
    log.info('info message');
    log.log('log message');
    log.warn('warn message');

    expect(target.error).toHaveBeenCalledWith('error message');
    expect(target.info).toHaveBeenCalledWith('info message');
  });
});
